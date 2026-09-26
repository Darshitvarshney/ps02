import math
from typing import List, Dict, Any
from shapely.geometry import shape, mapping, Polygon
from ..models.schemas import ConflictRecord

METERS_PER_DEG = 111320.0

def deg_to_sqm(deg_area: float) -> float:
    return deg_area * (METERS_PER_DEG ** 2) * 0.95

class ChangeDetector:
    def __init__(self):
        pass

    def detect_changes_and_encroachments(
        self,
        cadastral_parcels: List[Dict[str, Any]],
        ai_building_footprints: List[Dict[str, Any]],
        utility_networks: List[Dict[str, Any]],
        road_buffers: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        
        conflicts: List[ConflictRecord] = []
        change_stats = {
            "unauthorized_constructions": 0,
            "utility_easement_violations": 0,
            "road_encroachments": 0,
            "new_subdivisions_detected": 0
        }

        # Index cadastral parcels
        parcel_geoms = []
        for feat in cadastral_parcels:
            g = shape(feat["geometry"])
            khasra = feat.get("properties", {}).get("khasra_no", "Unknown")
            p_id = feat.get("id") or khasra
            parcel_geoms.append((p_id, khasra, g))

        # 1. Check AI Buildings vs Utility Easements
        for u_feat in utility_networks:
            u_geom = shape(u_feat["geometry"])
            u_name = u_feat.get("properties", {}).get("name", "Utility Corridor")
            u_buffer_m = float(u_feat.get("properties", {}).get("buffer_m", 10.0))
            buffer_deg = u_buffer_m / METERS_PER_DEG
            easement = u_geom.buffer(buffer_deg)

            for b_feat in ai_building_footprints:
                b_geom = shape(b_feat["geometry"])
                b_id = b_feat.get("id") or b_feat.get("properties", {}).get("building_id", "BLD")

                if b_geom.intersects(easement):
                    violation_area = b_geom.intersection(easement).area
                    violation_sqm = round(deg_to_sqm(violation_area), 2)
                    if violation_sqm > 1.0:
                        change_stats["utility_easement_violations"] += 1
                        conflicts.append(ConflictRecord(
                            id=f"CONF-UTL-{len(conflicts)+1}",
                            title=f"Statutory Easement Violation: {u_name}",
                            type="utility_easement_violation",
                            severity="critical",
                            parcel_id=b_id,
                            survey_no="N/A",
                            disputed_area_sqm=violation_sqm,
                            sources_involved=["AI Building Footprint", "Utility Network GIS"],
                            description=f"AI-extracted structure {b_id} encroaches {violation_sqm} sqm inside statutory {u_buffer_m}m safety zone of {u_name}.",
                            evidence_geometry=mapping(b_geom.intersection(easement)),
                            recommended_action="Issue statutory demolition/relocation notice under Indian Telegraph / Electricity Act."
                        ))

        # 2. Check AI Buildings vs Cadastral Boundaries (Unauthorized construction outside registered boundary)
        for b_feat in ai_building_footprints:
            b_geom = shape(b_feat["geometry"])
            b_id = b_feat.get("id") or b_feat.get("properties", {}).get("building_id", "BLD")
            
            # Find which parcel contains or intersects this building
            intersecting_parcels = []
            for p_id, khasra, p_g in parcel_geoms:
                if p_g.intersects(b_geom):
                    intersecting_parcels.append((p_id, khasra, p_g))

            if not intersecting_parcels:
                # Building completely outside registered revenue parcels (e.g. on public land / water body)
                b_sqm = round(deg_to_sqm(b_geom.area), 2)
                change_stats["unauthorized_constructions"] += 1
                conflicts.append(ConflictRecord(
                    id=f"CONF-UNAUTH-{len(conflicts)+1}",
                    title="Unauthorized Structure on Public Land",
                    type="unauthorized_construction",
                    severity="critical",
                    parcel_id=b_id,
                    survey_no="Public/Nazul",
                    disputed_area_sqm=b_sqm,
                    sources_involved=["Drone ORI", "Cadastral Base Map"],
                    description=f"AI building footprint {b_id} ({b_sqm} sqm) detected on unallocated government/drainage reserve.",
                    evidence_geometry=mapping(b_geom),
                    recommended_action="Physical verification by Revenue Inspector & initiation of eviction proceedings."
                ))
            elif len(intersecting_parcels) > 1:
                # Building straddles across 2 distinct parcels without consolidation
                straddle_khasras = [k for _, k, _ in intersecting_parcels]
                conflicts.append(ConflictRecord(
                    id=f"CONF-STRAD-{len(conflicts)+1}",
                    title=f"Cross-Boundary Construction across Khasra {', '.join(straddle_khasras)}",
                    type="encroachment",
                    severity="warning",
                    parcel_id=b_id,
                    survey_no=", ".join(straddle_khasras),
                    disputed_area_sqm=round(deg_to_sqm(b_geom.area), 2),
                    sources_involved=["AI Drone Feature", "Cadastral Map"],
                    description=f"Structure {b_id} spans across multiple distinct land parcels without legal plot amalgamation.",
                    evidence_geometry=mapping(b_geom),
                    recommended_action="Submit plot amalgamation deed or partition agreement."
                ))

        # 3. Check Road Encroachments
        if road_buffers:
            for r_feat in road_buffers:
                r_geom = shape(r_feat["geometry"])
                r_name = r_feat.get("properties", {}).get("name", "Public Road")
                r_buf_m = float(r_feat.get("properties", {}).get("buffer_m", 20.0))
                road_corridor = r_geom.buffer(r_buf_m / METERS_PER_DEG)

                for p_id, khasra, p_g in parcel_geoms:
                    if p_g.intersects(road_corridor):
                        enc_geom = p_g.intersection(road_corridor)
                        enc_sqm = round(deg_to_sqm(enc_geom.area), 2)
                        if enc_sqm > 2.0:
                            change_stats["road_encroachments"] += 1
                            conflicts.append(ConflictRecord(
                                id=f"CONF-ROAD-{len(conflicts)+1}",
                                title=f"Road Right-of-Way Encroachment: Khasra {khasra}",
                                type="encroachment",
                                severity="critical",
                                parcel_id=p_id,
                                survey_no=khasra,
                                disputed_area_sqm=enc_sqm,
                                sources_involved=["Municipal Master Plan", "Cadastral Survey"],
                                description=f"Parcel {khasra} boundary expands {enc_sqm} sqm into designated Right of Way for {r_name}.",
                                evidence_geometry=mapping(enc_geom),
                                recommended_action="Trim parcel boundary to statutory road line according to municipal master plan."
                            ))

        return {
            "statistics": change_stats,
            "conflicts": conflicts
        }

change_detector = ChangeDetector()
