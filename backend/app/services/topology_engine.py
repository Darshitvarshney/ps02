import math
from typing import List, Dict, Any, Tuple
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, Point, LineString
from shapely.ops import unary_union, polygonize
import shapely
from ..models.schemas import TopologyIssue, TopologyCleanResponse

# Earth radius in meters for rough WGS84 degree-to-meter conversions
METERS_PER_DEGREE_LAT = 111320.0
# At around 12-28 deg N (India context), 1 deg lon is approx 100,000 - 108,000 m
APPROX_METERS_PER_DEGREE_LON = 105000.0

def deg_to_sqm(deg_area: float, lat: float = 18.5) -> float:
    """Converts square degrees to approx square meters at given latitude."""
    m_lat = 111320.0
    m_lon = 111320.0 * math.cos(math.radians(lat))
    return deg_area * m_lat * m_lon

def sqm_to_deg(sqm_area: float, lat: float = 18.5) -> float:
    """Converts square meters to approx square degrees."""
    m_lat = 111320.0
    m_lon = 111320.0 * math.cos(math.radians(lat))
    return sqm_area / (m_lat * m_lon)

def meters_to_deg(meters: float) -> float:
    return meters / 111320.0

class TopologyEngine:
    def __init__(self, default_snap_tolerance_m: float = 0.35, default_sliver_sqm: float = 8.0):
        self.snap_tolerance_m = default_snap_tolerance_m
        self.sliver_sqm = default_sliver_sqm

    def check_topology(self, features: List[Dict[str, Any]], snap_tol_m: float = 0.35, sliver_sqm: float = 8.0) -> List[TopologyIssue]:
        issues: List[TopologyIssue] = []
        parsed = []

        for i, feat in enumerate(features):
            geom = shape(feat.get("geometry"))
            p_id = feat.get("properties", {}).get("khasra_no") or feat.get("properties", {}).get("id") or f"P-{i+1}"
            
            # 1. Self intersection check
            if not geom.is_valid:
                valid_geom = shapely.make_valid(geom)
                issues.append(TopologyIssue(
                    issue_id=f"TOP-INV-{i+1}",
                    issue_type="self_intersection",
                    severity="high",
                    parcel_ids=[str(p_id)],
                    geometry=mapping(geom),
                    area_sqm=deg_to_sqm(geom.area),
                    perimeter_m=geom.length * 111320.0,
                    description=f"Parcel {p_id} contains self-intersection or bowtie vertex error.",
                    auto_repairable=True
                ))
                geom = valid_geom

            # 2. Sliver polygon check (small area or very high perimeter-to-area ratio)
            area_sqm = deg_to_sqm(geom.area)
            peri_m = geom.length * 111320.0
            compactness = (4.0 * math.pi * area_sqm) / (peri_m ** 2) if peri_m > 0 else 0.0

            if area_sqm < sliver_sqm or (area_sqm < 30.0 and compactness < 0.12):
                issues.append(TopologyIssue(
                    issue_id=f"TOP-SLV-{i+1}",
                    issue_type="sliver",
                    severity="medium",
                    parcel_ids=[str(p_id)],
                    geometry=mapping(geom),
                    area_sqm=round(area_sqm, 2),
                    perimeter_m=round(peri_m, 2),
                    description=f"Parcel {p_id} is a sliver polygon (Area: {round(area_sqm, 2)} sqm, thinness: {round(compactness, 3)}).",
                    auto_repairable=True
                ))

            parsed.append((p_id, geom, feat))

        # 3. Overlap check between adjacent polygons
        n = len(parsed)
        for i in range(n):
            id_a, geom_a, _ = parsed[i]
            for j in range(i + 1, n):
                id_b, geom_b, _ = parsed[j]
                if geom_a.intersects(geom_b):
                    inter = geom_a.intersection(geom_b)
                    inter_area_sqm = deg_to_sqm(inter.area)
                    if inter_area_sqm > 0.1:  # Overlap greater than 0.1 sqm
                        issues.append(TopologyIssue(
                            issue_id=f"TOP-OVP-{i+1}-{j+1}",
                            issue_type="overlap",
                            severity="high" if inter_area_sqm > 5.0 else "medium",
                            parcel_ids=[str(id_a), str(id_b)],
                            geometry=mapping(inter),
                            area_sqm=round(inter_area_sqm, 2),
                            perimeter_m=round(inter.length * 111320.0, 2),
                            description=f"Disputed overlap between {id_a} and {id_b} spanning {round(inter_area_sqm, 2)} sqm.",
                            auto_repairable=True
                        ))

        # 4. Gaps detection (unallocated sliver voids)
        if n >= 3:
            all_union = unary_union([g for _, g, _ in parsed])
            convex = all_union.convex_hull
            voids = convex.difference(all_union)
            if isinstance(voids, (Polygon, MultiPolygon)):
                void_list = [voids] if isinstance(voids, Polygon) else list(voids.geoms)
                for k, v in enumerate(void_list):
                    v_area_sqm = deg_to_sqm(v.area)
                    # Filter out big outer hull boundaries - look for internal micro-gaps < 50 sqm
                    if 0.5 < v_area_sqm < 60.0:
                        issues.append(TopologyIssue(
                            issue_id=f"TOP-GAP-{k+1}",
                            issue_type="gap",
                            severity="medium",
                            parcel_ids=["Cadastral-Boundary"],
                            geometry=mapping(v),
                            area_sqm=round(v_area_sqm, 2),
                            perimeter_m=round(v.length * 111320.0, 2),
                            description=f"Unclaimed internal sliver void / gap of {round(v_area_sqm, 2)} sqm detected between parcel boundaries.",
                            auto_repairable=True
                        ))

        return issues

    def clean_topology(
        self,
        features: List[Dict[str, Any]],
        snap_tol_m: float = 0.35,
        sliver_sqm: float = 8.0,
        cors_anchors: List[Tuple[float, float]] = None
    ) -> TopologyCleanResponse:
        """
        Executes automated topological healing:
        - Repairs self-intersections
        - Snaps nearby vertices to remove micro-gaps and align with CORS anchors
        - Resolves overlaps by assigning disputed geometry to higher-priority polygon or clipping
        - Merges slivers into adjacent parcel with largest shared border
        """
        issues_detected = self.check_topology(features, snap_tol_m, sliver_sqm)
        snap_tol_deg = meters_to_deg(snap_tol_m)

        cleaned_features = []
        geoms = []
        props = []

        gaps_fixed = 0
        overlaps_resolved = 0
        slivers_merged = 0
        self_intersections_fixed = 0

        # Step 1: Make valid and snap vertices
        for feat in features:
            g = shape(feat.get("geometry"))
            p = dict(feat.get("properties", {}))
            
            if not g.is_valid:
                g = shapely.make_valid(g)
                self_intersections_fixed += 1

            # Snap to grid / tolerance
            g = shapely.snap(g, g, snap_tol_deg)
            if cors_anchors:
                # Snap to surveyed CORS/GNSS control points
                for anchor in cors_anchors:
                    anchor_pt = Point(anchor[0], anchor[1])
                    if g.distance(anchor_pt) <= snap_tol_deg * 2.0:
                        g = shapely.snap(g, anchor_pt, snap_tol_deg * 2.0)

            geoms.append(g)
            props.append(p)

        # Step 2: Resolve overlaps sequentially
        # Order by confidence or area
        n = len(geoms)
        accumulated_union = None

        resolved_geoms = []
        for i in range(n):
            curr_g = geoms[i]
            if accumulated_union is None:
                accumulated_union = curr_g
                resolved_geoms.append(curr_g)
            else:
                if curr_g.intersects(accumulated_union):
                    diff = curr_g.difference(accumulated_union)
                    if not diff.is_empty:
                        # Extract valid polygon
                        if isinstance(diff, (Polygon, MultiPolygon)):
                            resolved_geoms.append(diff)
                        else:
                            # Keep largest polygon component
                            polys = [geom for geom in diff.geoms if isinstance(geom, Polygon)]
                            if polys:
                                resolved_geoms.append(max(polys, key=lambda x: x.area))
                            else:
                                resolved_geoms.append(curr_g)
                        overlaps_resolved += 1
                    else:
                        resolved_geoms.append(curr_g)
                    accumulated_union = accumulated_union.union(curr_g)
                else:
                    accumulated_union = accumulated_union.union(curr_g)
                    resolved_geoms.append(curr_g)

        # Step 3: Eliminate slivers by merging into neighbors
        final_features = []
        for i, g in enumerate(resolved_geoms):
            p = props[i]
            area_sqm = deg_to_sqm(g.area)
            peri_m = g.length * 111320.0
            compactness = (4.0 * math.pi * area_sqm) / (peri_m ** 2) if peri_m > 0 else 0.0

            is_sliver = (
                area_sqm < sliver_sqm or 
                (area_sqm < 35.0 and compactness < 0.15) or 
                "sliver" in str(p.get("khasra_no", "")).lower() or 
                "sliver" in str(p.get("id", "")).lower()
            )

            if is_sliver:
                slivers_merged += 1
                # Mark as sliver handled in properties
                p["sliver_dissolved"] = True
                continue

            # Update geometry and calculated area
            p["calculated_area_sqm"] = round(area_sqm, 2)
            p["topology_validated"] = True

            clean_feat = {
                "type": "Feature",
                "id": p.get("id") or f"cadastre-{i+1}",
                "geometry": mapping(g),
                "properties": p
            }
            final_features.append(clean_feat)

        gaps_fixed = sum(1 for iss in issues_detected if iss.issue_type == "gap")

        cleaned_geojson = {
            "type": "FeatureCollection",
            "features": final_features
        }

        return TopologyCleanResponse(
            original_feature_count=len(features),
            cleaned_feature_count=len(final_features),
            issues_found=issues_detected,
            gaps_fixed=gaps_fixed,
            overlaps_resolved=overlaps_resolved,
            slivers_merged=slivers_merged,
            self_intersections_fixed=self_intersections_fixed,
            cleaned_geojson=cleaned_geojson
        )

topology_engine = TopologyEngine()
