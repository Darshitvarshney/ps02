import numpy as np
import math
from typing import List, Dict, Any, Tuple

class ElevationService:
    def __init__(self):
        # Base terrain height for pilot area (e.g. 580m above MSL - typical Deccan / Bangalore plateau)
        self.base_elevation_m = 582.0

    def get_ndsm_height(self, x: float, y: float, has_building: bool = False, floors: int = 1) -> Dict[str, float]:
        """
        Calculates DTM (bare earth), DSM (surface), and nDSM (height above ground).
        """
        # Slight terrain slope across geographic coordinate
        dtm = self.base_elevation_m + (x * 100.0 % 5.0) + (y * 100.0 % 3.0)
        building_height = (floors * 3.2) if has_building else 0.0
        dsm = dtm + building_height

        return {
            "dtm_elevation_m": round(float(dtm), 2),
            "dsm_elevation_m": round(float(dsm), 2),
            "ndsm_height_m": round(float(building_height), 2)
        }

    def generate_transect_profile(
        self,
        start_pt: Tuple[float, float],
        end_pt: Tuple[float, float],
        num_samples: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Generates 3D elevation profile along a transect line across the pilot sector.
        """
        x0, y0 = start_pt
        x1, y1 = end_pt
        profile = []

        total_dist_m = math.sqrt((x1 - x0)**2 + (y1 - y0)**2) * 111320.0

        for i in range(num_samples):
            t = i / float(num_samples - 1)
            x = x0 + t * (x1 - x0)
            y = y0 + t * (y1 - y0)
            dist_m = t * total_dist_m

            # Base DTM slope
            dtm = self.base_elevation_m + 4.5 * math.sin(t * math.pi) + (t * 2.0)
            
            # Synthetic buildings / structures along transect
            # e.g. buildings at t around 0.2, 0.45, 0.75
            bld_h = 0.0
            feature_type = "Terrain"
            if 0.18 <= t <= 0.28:
                bld_h = 12.8  # 4-storey building
                feature_type = "Commercial Complex"
            elif 0.42 <= t <= 0.52:
                bld_h = 6.4   # 2-storey residential
                feature_type = "Residential House"
            elif 0.70 <= t <= 0.82:
                bld_h = 18.5  # 6-storey apartment
                feature_type = "Apartment Block"

            dsm = dtm + bld_h

            profile.append({
                "step": i,
                "distance_m": round(dist_m, 1),
                "lon": round(x, 6),
                "lat": round(y, 6),
                "dtm_elevation_m": round(dtm, 2),
                "dsm_elevation_m": round(dsm, 2),
                "ndsm_height_m": round(bld_h, 2),
                "feature_label": feature_type
            })

        return profile

elevation_service = ElevationService()
