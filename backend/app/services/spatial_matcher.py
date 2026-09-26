import math
import numpy as np
from typing import List, Dict, Any, Tuple
from shapely.geometry import shape, Polygon, MultiPolygon
from scipy.spatial.distance import directed_hausdorff
from ..models.schemas import SpatialMatchItem, SpatialMatchResponse

METERS_PER_DEG = 111320.0

def haversine_distance_m(p1, p2):
    """Distance between two (lon, lat) points in meters."""
    dx = (p1[0] - p2[0]) * METERS_PER_DEG * math.cos(math.radians((p1[1] + p2[1]) / 2.0))
    dy = (p1[1] - p2[1]) * METERS_PER_DEG
    return math.sqrt(dx**2 + dy**2)

class SpatialMatcher:
    def __init__(self):
        pass

    def compute_iou(self, geom1, geom2) -> float:
        if not geom1.intersects(geom2):
            return 0.0
        inter = geom1.intersection(geom2).area
        union = geom1.union(geom2).area
        return inter / union if union > 0 else 0.0

    def compute_hausdorff_meters(self, geom1, geom2) -> float:
        """Calculates Hausdorff distance in approximate meters."""
        coords1 = np.array(geom1.exterior.coords)
        coords2 = np.array(geom2.exterior.coords)

        # Scale lon/lat to meters relative to origin
        ref_lat = coords1[0][1]
        scale_x = METERS_PER_DEG * math.cos(math.radians(ref_lat))
        scale_y = METERS_PER_DEG

        c1_m = coords1.copy()
        c1_m[:, 0] *= scale_x
        c1_m[:, 1] *= scale_y

        c2_m = coords2.copy()
        c2_m[:, 0] *= scale_x
        c2_m[:, 1] *= scale_y

        d1 = directed_hausdorff(c1_m, c2_m)[0]
        d2 = directed_hausdorff(c2_m, c1_m)[0]
        return max(d1, d2)

    def match_datasets(
        self,
        legacy_features: List[Dict[str, Any]],
        ai_drone_features: List[Dict[str, Any]],
        iou_threshold: float = 0.35,
        max_dist_m: float = 25.0
    ) -> SpatialMatchResponse:
        matched_items: List[SpatialMatchItem] = []
        ious = []
        confidences = []

        legacy_geoms = [(f.get("properties", {}).get("khasra_no") or f.get("id") or f"L-{i+1}",
                         shape(f["geometry"])) for i, f in enumerate(legacy_features)]
        
        ai_geoms = [(f.get("properties", {}).get("feature_id") or f.get("id") or f"AI-{j+1}",
                     shape(f["geometry"])) for j, f in enumerate(ai_drone_features)]

        # Find best AI match for each legacy parcel
        for leg_id, leg_g in legacy_geoms:
            best_match = None
            best_iou = -1.0
            best_hausdorff = 999.0
            best_centroid_dist = 999.0

            leg_centroid = (leg_g.centroid.x, leg_g.centroid.y)

            # Detect if multiple AI parcels intersect (Subdivision check)
            intersecting_ai = []
            for ai_id, ai_g in ai_geoms:
                iou = self.compute_iou(leg_g, ai_g)
                c_dist = haversine_distance_m(leg_centroid, (ai_g.centroid.x, ai_g.centroid.y))

                if leg_g.intersects(ai_g):
                    overlap_ratio = leg_g.intersection(ai_g).area / leg_g.area
                    if overlap_ratio > 0.15:
                        intersecting_ai.append((ai_id, overlap_ratio))

                if iou > best_iou:
                    best_iou = iou
                    best_match = ai_id
                    best_centroid_dist = c_dist
                    best_hausdorff = self.compute_hausdorff_meters(leg_g, ai_g)

            if best_match is not None and best_iou >= iou_threshold:
                # Classify status
                if len(intersecting_ai) >= 2:
                    status = "subdivided"
                    conf = round(0.70 + min(best_iou * 0.25, 0.25), 3)
                elif best_iou >= 0.82 and best_hausdorff < 2.0:
                    status = "exact_match"
                    conf = round(0.92 + min(best_iou * 0.08, 0.08), 3)
                elif best_iou >= 0.50:
                    status = "partial_match"
                    conf = round(0.75 + (best_iou - 0.5) * 0.4, 3)
                else:
                    status = "boundary_shifted"
                    conf = round(max(0.40, best_iou), 3)

                boundary_sim = round(max(0.0, 1.0 - (best_hausdorff / 15.0)), 3)

                item = SpatialMatchItem(
                    legacy_id=str(leg_id),
                    ai_drone_id=str(best_match),
                    iou_score=round(best_iou, 4),
                    hausdorff_distance_m=round(best_hausdorff, 2),
                    centroid_distance_m=round(best_centroid_dist, 2),
                    boundary_similarity=boundary_sim,
                    match_status=status,
                    confidence=conf
                )
                matched_items.append(item)
                ious.append(best_iou)
                confidences.append(conf)
            else:
                matched_items.append(SpatialMatchItem(
                    legacy_id=str(leg_id),
                    ai_drone_id="NONE",
                    iou_score=0.0,
                    hausdorff_distance_m=999.0,
                    centroid_distance_m=best_centroid_dist if best_centroid_dist < 999.0 else 0.0,
                    boundary_similarity=0.0,
                    match_status="unmatched",
                    confidence=0.10
                ))

        avg_iou = float(np.mean(ious)) if ious else 0.0
        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        return SpatialMatchResponse(
            total_legacy=len(legacy_features),
            total_ai=len(ai_drone_features),
            matched_pairs=matched_items,
            average_iou=round(avg_iou, 4),
            average_confidence=round(avg_conf, 4)
        )

spatial_matcher = SpatialMatcher()
