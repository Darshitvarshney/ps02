import time
import uuid
from typing import Dict, Any, List
from datetime import datetime

from .georeferencing import georeferencing_engine
from .topology_engine import topology_engine
from .spatial_matcher import spatial_matcher
from .attribute_reconciler import attribute_reconciler
from .change_detector import change_detector
from .conflict_resolver import conflict_resolver
from .confidence_scorer import confidence_scorer
from .elevation_service import elevation_service
from .mock_data_generator import mock_data_generator
from ..models.schemas import (
    HarmonizationPipelineRequest,
    HarmonizationPipelineResponse,
    GCPPoint,
    ConflictRecord,
    ConfidenceScoreBreakdown
)

class HarmonizationPipeline:
    def __init__(self):
        self.last_run_result = None

    def execute(self, req: HarmonizationPipelineRequest) -> HarmonizationPipelineResponse:
        start_time = time.time()
        run_id = f"HARM-{uuid.uuid4().hex[:8].upper()}"

        # 1. Fetch multi-source baseline datasets
        gcps_raw = mock_data_generator.get_ground_control_points()
        cors_data = mock_data_generator.get_gnss_cors_stations()
        legacy_data = mock_data_generator.get_legacy_cadastral()
        ai_parcels = mock_data_generator.get_ai_drone_extracted_parcels()
        ai_buildings = mock_data_generator.get_ai_building_footprints()
        revenue_recs = mock_data_generator.get_revenue_records()
        muni_data = mock_data_generator.get_municipal_gis()
        utility_data = mock_data_generator.get_utility_networks()

        gcp_points = [GCPPoint(**g) for g in gcps_raw]
        cors_anchors = [(f["geometry"]["coordinates"][0], f["geometry"]["coordinates"][1]) 
                        for f in cors_data["features"]]

        # 2. Georeferencing
        georef_result = None
        gcp_rmse = 0.015
        if req.apply_georeferencing:
            georef_result = georeferencing_engine.solve_affine(gcp_points)
            gcp_rmse = georef_result["rmse"]

        # 3. Topology Engine Cleaning
        topo_result = None
        cleaned_features = legacy_data["features"]
        if req.apply_topology_clean:
            topo_result = topology_engine.clean_topology(
                features=cleaned_features,
                snap_tol_m=req.snap_tolerance_m,
                sliver_sqm=req.sliver_threshold_sqm,
                cors_anchors=cors_anchors
            )
            cleaned_features = topo_result.cleaned_geojson["features"]

        # 4. AI Spatial Matching
        spatial_match_result = None
        if req.apply_ai_spatial_match:
            spatial_match_result = spatial_matcher.match_datasets(
                legacy_features=cleaned_features,
                ai_drone_features=ai_parcels["features"],
                iou_threshold=0.30
            )

        # 5. Attribute Reconciliation
        reconciled_attrs = []
        if req.apply_attribute_reconciliation:
            reconciled_attrs = attribute_reconciler.reconcile_records(
                revenue_records=revenue_recs,
                gis_parcels=cleaned_features
            )

        # 6. Change & Encroachment Detection
        road_lines = [f for f in muni_data["features"] if f["geometry"]["type"] == "LineString"]
        change_results = change_detector.detect_changes_and_encroachments(
            cadastral_parcels=cleaned_features,
            ai_building_footprints=ai_buildings["features"],
            utility_networks=utility_data["features"],
            road_buffers=road_lines
        )

        conflicts: List[ConflictRecord] = change_results["conflicts"]

        # 7. Spatial Conflict Resolution
        if req.apply_conflict_resolution and req.auto_resolve_conflicts:
            for conf in conflicts:
                conflict_resolver.resolve_conflict_automated(conf, preference="drone_ground_truth")

        # 8. Confidence Scoring per parcel
        confidence_list: List[ConfidenceScoreBreakdown] = []
        attr_lookup = {r.khasra_no: r for r in reconciled_attrs}
        conflict_khasras = {c.survey_no for c in conflicts if not c.resolved}

        for feat in cleaned_features:
            props = feat.get("properties", {})
            khasra = str(props.get("khasra_no", "101"))
            p_id = feat.get("id") or khasra
            attr_rec = attr_lookup.get(khasra)

            pct_delta = attr_rec.area_delta_percent if attr_rec else 1.2
            name_sim = attr_rec.name_similarity_score if attr_rec else 0.95
            has_conflict = khasra in conflict_khasras

            score = confidence_scorer.evaluate_parcel(
                parcel_id=p_id,
                survey_no=khasra,
                gcp_rmse=gcp_rmse,
                has_cors_anchor=True,
                has_topology_issue=False,
                is_sliver=False,
                area_delta_percent=pct_delta,
                name_similarity=name_sim,
                source_count=4,
                has_active_conflict=has_conflict
            )
            confidence_list.append(score)
            # Embed score into feature properties
            props["confidence_score"] = score.overall_confidence
            props["confidence_grade"] = score.grade

        # 9. DSM/DTM Elevation Transect
        transect = elevation_service.generate_transect_profile(
            start_pt=(77.6230, 12.9335),
            end_pt=(77.6270, 12.9365),
            num_samples=25
        )

        elapsed_ms = round((time.time() - start_time) * 1000.0, 2)

        # Summary Metrics
        avg_confidence = round(sum(c.overall_confidence for c in confidence_list) / len(confidence_list), 1) if confidence_list else 0.0
        resolved_conflicts = sum(1 for c in conflicts if c.resolved)

        metrics = {
            "total_parcels_processed": len(cleaned_features),
            "original_parcels": len(legacy_data["features"]),
            "slivers_eliminated": topo_result.slivers_merged if topo_result else 0,
            "overlaps_cleared": topo_result.overlaps_resolved if topo_result else 0,
            "gaps_healed": topo_result.gaps_fixed if topo_result else 0,
            "ai_matches_found": len(spatial_match_result.matched_pairs) if spatial_match_result else 0,
            "attribute_discrepancies_flagged": sum(1 for r in reconciled_attrs if r.status != "verified"),
            "conflicts_detected": len(conflicts),
            "conflicts_resolved": resolved_conflicts,
            "average_confidence_score": avg_confidence,
            "gcp_rmse_meters": round(gcp_rmse, 4),
            "grade_distribution": {
                "Grade A (Certified)": sum(1 for c in confidence_list if "A" in c.grade),
                "Grade B (High)": sum(1 for c in confidence_list if "B" in c.grade),
                "Grade C (Moderate)": sum(1 for c in confidence_list if "C" in c.grade),
                "Grade D (Disputed)": sum(1 for c in confidence_list if "D" in c.grade)
            }
        }

        response = HarmonizationPipelineResponse(
            run_id=run_id,
            timestamp=datetime.now().isoformat(),
            execution_time_ms=elapsed_ms,
            status="completed_successfully",
            summary_metrics=metrics,
            harmonized_cadastre={"type": "FeatureCollection", "features": cleaned_features},
            conflicts=conflicts,
            confidence_scores=confidence_list,
            change_detection_results=change_results["statistics"],
            elevation_insights={
                "base_datum": "MSL / WGS84",
                "transect_profile": transect,
                "max_building_height_m": 18.5,
                "average_terrain_slope_pct": 2.1
            }
        )

        self.last_run_result = response

        # Persist run to MongoDB Atlas Spatial Database
        try:
            from .database import spatial_db
            spatial_db.save_pipeline_run(response.model_dump())
        except Exception as e:
            print(f"[Pipeline] Database persistence notice: {e}")

        return response

harmonization_pipeline = HarmonizationPipeline()
