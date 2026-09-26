import math
from typing import Dict, Any, List

# Center coordinates: [Longitude, Latitude]
CENTER_LON = 77.6250
CENTER_LAT = 12.9350
DELTA_DEG = 0.0018  # ~200 meters bounding grid

class MockDataGenerator:
    def __init__(self):
        pass

    def get_ground_control_points(self) -> List[Dict[str, Any]]:
        """
        Ground Control Points (GCPs) for georeferencing calibration:
        Relates raw drone image pixels (or un-georeferenced local CAD coordinates) to CORS GNSS WGS84 coordinates.
        """
        return [
            {
                "id": "GCP-01",
                "name": "CORS Benchmark North-West",
                "source_x": 120.5, "source_y": 140.2,
                "target_x": round(CENTER_LON - DELTA_DEG * 1.2, 6),
                "target_y": round(CENTER_LAT + DELTA_DEG * 1.1, 6),
                "elevation_z": 584.2,
                "residual_dx": 0.012, "residual_dy": -0.008, "residual_total": 0.014
            },
            {
                "id": "GCP-02",
                "name": "CORS Monument North-East",
                "source_x": 1850.0, "source_y": 135.0,
                "target_x": round(CENTER_LON + DELTA_DEG * 1.1, 6),
                "target_y": round(CENTER_LAT + DELTA_DEG * 1.15, 6),
                "elevation_z": 586.8,
                "residual_dx": -0.009, "residual_dy": 0.011, "residual_total": 0.014
            },
            {
                "id": "GCP-03",
                "name": "Survey Pillar South-East",
                "source_x": 1870.2, "source_y": 1920.8,
                "target_x": round(CENTER_LON + DELTA_DEG * 1.15, 6),
                "target_y": round(CENTER_LAT - DELTA_DEG * 1.1, 6),
                "elevation_z": 581.4,
                "residual_dx": 0.015, "residual_dy": 0.005, "residual_total": 0.016
            },
            {
                "id": "GCP-04",
                "name": "Junction Milestone South-West",
                "source_x": 110.8, "source_y": 1910.4,
                "target_x": round(CENTER_LON - DELTA_DEG * 1.18, 6),
                "target_y": round(CENTER_LAT - DELTA_DEG * 1.08, 6),
                "elevation_z": 580.1,
                "residual_dx": -0.011, "residual_dy": -0.014, "residual_total": 0.018
            },
            {
                "id": "GCP-05",
                "name": "Triangulation Center Station",
                "source_x": 985.4, "source_y": 1020.1,
                "target_x": round(CENTER_LON, 6),
                "target_y": round(CENTER_LAT, 6),
                "elevation_z": 583.5,
                "residual_dx": 0.004, "residual_dy": 0.003, "residual_total": 0.005
            }
        ]

    def get_gnss_cors_stations(self) -> Dict[str, Any]:
        """
        CORS (Continuous Operating Reference Station) Network Benchmarks.
        """
        features = [
            {
                "type": "Feature",
                "id": "CORS-BLR-01",
                "geometry": {"type": "Point", "coordinates": [CENTER_LON - DELTA_DEG * 1.2, CENTER_LAT + DELTA_DEG * 1.1]},
                "properties": {
                    "station_code": "CORS-BLR-01",
                    "receiver": "Trimble Alloy GNSS Multi-Constellation",
                    "accuracy_h_cm": 0.8,
                    "accuracy_v_cm": 1.4,
                    "datum": "ITRF2020 / WGS84",
                    "status": "Operational - 100% Liveness"
                }
            },
            {
                "type": "Feature",
                "id": "CORS-BLR-02",
                "geometry": {"type": "Point", "coordinates": [CENTER_LON + DELTA_DEG * 1.1, CENTER_LAT + DELTA_DEG * 1.15]},
                "properties": {
                    "station_code": "CORS-BLR-02",
                    "receiver": "Leica GR50 Multi-Frequency",
                    "accuracy_h_cm": 0.7,
                    "accuracy_v_cm": 1.2,
                    "datum": "ITRF2020 / WGS84",
                    "status": "Operational - 100% Liveness"
                }
            },
            {
                "type": "Feature",
                "id": "CORS-BLR-03",
                "geometry": {"type": "Point", "coordinates": [CENTER_LON, CENTER_LAT]},
                "properties": {
                    "station_code": "CORS-BLR-03",
                    "receiver": "Topcon NET-G5 Reference Station",
                    "accuracy_h_cm": 0.6,
                    "accuracy_v_cm": 1.1,
                    "datum": "ITRF2020 / WGS84",
                    "status": "Operational - 100% Liveness"
                }
            }
        ]
        return {"type": "FeatureCollection", "features": features}

    def get_legacy_cadastral(self) -> Dict[str, Any]:
        """
        Legacy digitized revenue parcel map:
        Intentionally contains real-world flaws:
        - 1 sliver polygon between Khasra 104 and 105
        - 1 overlap between Khasra 107 and 108
        - Slight boundary shift (~2m) vs actual drone physical compound walls
        """
        parcels = []
        rows = 3
        cols = 4
        dx = DELTA_DEG / 2.2
        dy = DELTA_DEG / 2.2
        start_x = CENTER_LON - DELTA_DEG * 0.95
        start_y = CENTER_LAT - DELTA_DEG * 0.95

        count = 101
        for r in range(rows):
            for c in range(cols):
                p_x = start_x + c * dx
                p_y = start_y + r * dy
                
                # Introduce slight coordinate noise to simulate legacy paper digitization
                noise_x = 0.00003 if count % 2 == 0 else -0.00002
                noise_y = 0.00002 if count % 3 == 0 else -0.00003

                # Introduce intentional overlap on Khasra 107
                overlap_x = (dx * 0.15) if count == 107 else 0.0

                poly_coords = [
                    [round(p_x + noise_x, 6), round(p_y + noise_y, 6)],
                    [round(p_x + dx + overlap_x + noise_x, 6), round(p_y + noise_y, 6)],
                    [round(p_x + dx + overlap_x + noise_x, 6), round(p_y + dy + noise_y, 6)],
                    [round(p_x + noise_x, 6), round(p_y + dy + noise_y, 6)],
                    [round(p_x + noise_x, 6), round(p_y + noise_y, 6)]
                ]

                parcels.append({
                    "type": "Feature",
                    "id": f"LEG-{count}",
                    "geometry": {"type": "Polygon", "coordinates": [poly_coords]},
                    "properties": {
                        "khasra_no": str(count),
                        "village": "Kadubeesanahalli Ward 150",
                        "tehsil": "Bengaluru East",
                        "district": "Bengaluru Urban",
                        "recorded_area_sqm": round(4200.0 + (count * 15.0 % 600.0), 2),
                        "tenure_type": "Bhoomipradayani / Freehold",
                        "source": "Digitized 1998 Paper Cadastre (1:2500)"
                    }
                })
                count += 1

        # Add an intentional micro-sliver polygon (< 8 sqm)
        sliver_poly = [
            [round(start_x + dx, 6), round(start_y + dy, 6)],
            [round(start_x + dx + 0.000008, 6), round(start_y + dy, 6)],
            [round(start_x + dx + 0.000008, 6), round(start_y + dy + 0.00006, 6)],
            [round(start_x + dx, 6), round(start_y + dy + 0.00006, 6)],
            [round(start_x + dx, 6), round(start_y + dy, 6)]
        ]
        parcels.append({
            "type": "Feature",
            "id": "LEG-SLV-01",
            "geometry": {"type": "Polygon", "coordinates": [sliver_poly]},
            "properties": {
                "khasra_no": "104-Sliver",
                "village": "Kadubeesanahalli Ward 150",
                "recorded_area_sqm": 5.8,
                "calculated_area_sqm": 5.8,
                "tenure_type": "Unassigned Sliver",
                "source": "Boundary Digitization Artifact"
            }
        })

        return {"type": "FeatureCollection", "features": parcels}

    def get_ai_drone_extracted_parcels(self) -> Dict[str, Any]:
        """
        AI Deep Learning extracted parcel boundaries and compound walls from 5cm GSD Drone ORI.
        Clean, crisp physical boundaries aligned to actual ground occupation.
        """
        features = []
        rows = 3
        cols = 4
        dx = DELTA_DEG / 2.2
        dy = DELTA_DEG / 2.2
        start_x = CENTER_LON - DELTA_DEG * 0.95
        start_y = CENTER_LAT - DELTA_DEG * 0.95

        count = 101
        for r in range(rows):
            for c in range(cols):
                p_x = start_x + c * dx
                p_y = start_y + r * dy

                # Clean drone boundaries with actual road setback offsets
                poly_coords = [
                    [round(p_x, 6), round(p_y, 6)],
                    [round(p_x + dx * 0.97, 6), round(p_y, 6)],
                    [round(p_x + dx * 0.97, 6), round(p_y + dy * 0.97, 6)],
                    [round(p_x, 6), round(p_y + dy * 0.97, 6)],
                    [round(p_x, 6), round(p_y, 6)]
                ]

                features.append({
                    "type": "Feature",
                    "id": f"AI-PARCEL-{count}",
                    "geometry": {"type": "Polygon", "coordinates": [poly_coords]},
                    "properties": {
                        "feature_id": f"AI-PARCEL-{count}",
                        "khasra_no": str(count),
                        "extraction_confidence": 0.96,
                        "sensor": "UAV RGB 5cm Orthomosaic",
                        "boundary_type": "Masonry Compound Wall / Fence",
                        "ai_land_use": "Residential Urban Built-up" if count % 2 == 0 else "Commercial / Tech Park",
                        "survey_date": "2026-03-15"
                    }
                })
                count += 1

        return {"type": "FeatureCollection", "features": features}

    def get_ai_building_footprints(self) -> Dict[str, Any]:
        """
        AI-extracted building footprints with DSM height, storey count, and structure classification.
        Includes 2 violations:
        - BLD-105: Violates High Voltage Power Line easement.
        - BLD-109: Encroaches on Municipal Road Right of Way.
        """
        features = []
        rows = 3
        cols = 4
        dx = DELTA_DEG / 2.2
        dy = DELTA_DEG / 2.2
        start_x = CENTER_LON - DELTA_DEG * 0.95
        start_y = CENTER_LAT - DELTA_DEG * 0.95

        count = 101
        for r in range(rows):
            for c in range(cols):
                p_x = start_x + c * dx
                p_y = start_y + r * dy

                # Primary building in center of parcel
                bx1 = p_x + dx * 0.20
                by1 = p_y + dy * 0.20
                bx2 = p_x + dx * 0.75
                by2 = p_y + dy * 0.75

                floors = 3 if count % 2 == 0 else 2
                if count == 108:
                    floors = 5  # Apartment
                elif count == 105:
                    # Intentionally shift north into the utility corridor
                    by1 += dy * 0.35
                    by2 += dy * 0.35
                elif count == 109:
                    # Shift west into the road corridor
                    bx1 -= dx * 0.28
                    bx2 -= dx * 0.28

                b_poly = [
                    [round(bx1, 6), round(by1, 6)],
                    [round(bx2, 6), round(by1, 6)],
                    [round(bx2, 6), round(by2, 6)],
                    [round(bx1, 6), round(by2, 6)],
                    [round(bx1, 6), round(by1, 6)]
                ]

                height_m = round(floors * 3.3, 1)

                features.append({
                    "type": "Feature",
                    "id": f"BLD-{count}",
                    "geometry": {"type": "Polygon", "coordinates": [b_poly]},
                    "properties": {
                        "building_id": f"BLD-{count}",
                        "parent_khasra": str(count),
                        "floors": floors,
                        "ndsm_height_m": height_m,
                        "roof_type": "Reinforced Concrete (Flat)",
                        "structure_status": "Occupied - Active",
                        "solar_panels_detected": (count % 3 == 0)
                    }
                })
                count += 1

        # Add unauthorized construction on public reserve (outside any Khasra parcel)
        unauth_poly = [
            [round(CENTER_LON - DELTA_DEG * 1.35, 6), round(CENTER_LAT + DELTA_DEG * 0.9, 6)],
            [round(CENTER_LON - DELTA_DEG * 1.25, 6), round(CENTER_LAT + DELTA_DEG * 0.9, 6)],
            [round(CENTER_LON - DELTA_DEG * 1.25, 6), round(CENTER_LAT + DELTA_DEG * 1.0, 6)],
            [round(CENTER_LON - DELTA_DEG * 1.35, 6), round(CENTER_LAT + DELTA_DEG * 1.0, 6)],
            [round(CENTER_LON - DELTA_DEG * 1.35, 6), round(CENTER_LAT + DELTA_DEG * 0.9, 6)]
        ]
        features.append({
            "type": "Feature",
            "id": "BLD-UNAUTH-01",
            "geometry": {"type": "Polygon", "coordinates": [unauth_poly]},
            "properties": {
                "building_id": "BLD-UNAUTH-01",
                "parent_khasra": "Public/Nazul",
                "floors": 1,
                "ndsm_height_m": 4.2,
                "roof_type": "Corrugated Tin Sheet",
                "structure_status": "Unauthorized Encroachment",
                "solar_panels_detected": False
            }
        })

        return {"type": "FeatureCollection", "features": features}

    def get_revenue_records(self) -> List[Dict[str, Any]]:
        """
        Record of Rights (RoR / Khatauni) tabular register.
        """
        owners = [
            ("101", "12", "Ramesh Kumar Sharma", 4250.0, "Agricultural"),
            ("102", "12", "Ramesh K Sharma & Brothers", 4310.0, "Agricultural"),
            ("103", "15", "Dr. S. Radhakrishnan Rao", 4180.0, "Residential / Converted"),
            ("104", "18", "Lakshmi Devi W/o Late Narayana", 4220.0, "Agricultural"),
            ("105", "21", "Anand Swaroop Gupta", 4400.0, "Agricultural"),
            ("106", "24", "Priyanka M. Patil", 4290.0, "Commercial / Office"),
            ("107", "28", "Mohammed Sirajuddin Khan", 4350.0, "Residential"),
            ("108", "33", "Balaji Infra Developers Pvt Ltd", 4800.0, "Residential Multi-Storey"),
            ("109", "37", "Gurmeet Singh Sandhu", 4200.0, "Commercial"),
            ("110", "41", "Kavitha Venkatesh", 4280.0, "Agricultural"),
            ("111", "44", "Suresh Chandra Hegde", 4320.0, "Agricultural"),
            ("112", "50", "Karnataka State Power Trans Corp", 4500.0, "Government / Utility")
        ]

        records = []
        for khasra, khata, name, area, lu in owners:
            records.append({
                "khasra_no": khasra,
                "khata_no": khata,
                "owner_name": name,
                "recorded_area_sqm": area,
                "land_use": lu,
                "encumbrance_status": "Clean / No Mortgages" if khasra != "107" else "Bank Hypothecation Active",
                "mutation_year": "2019" if int(khasra) < 106 else "2023"
            })
        return records

    def get_municipal_gis(self) -> Dict[str, Any]:
        """
        Municipal Urban Local Body (ULB) Master Plan zoning & tax parcels.
        """
        road_width_deg = 0.00018  # ~20m road
        # Arterial road traversing North-South
        road_x = CENTER_LON - DELTA_DEG * 1.05
        road_geom = [
            [round(road_x, 6), round(CENTER_LAT - DELTA_DEG * 1.5, 6)],
            [round(road_x, 6), round(CENTER_LAT + DELTA_DEG * 1.5, 6)]
        ]

        features = [
            {
                "type": "Feature",
                "id": "MUNI-ROAD-01",
                "geometry": {"type": "LineString", "coordinates": road_geom},
                "properties": {
                    "name": "Outer Ring Road Sector Link 40m Corridor",
                    "category": "Major Arterial Road",
                    "statutory_row_m": 40.0,
                    "buffer_m": 20.0,
                    "agency": "Bruhat Bengaluru Mahanagara Palike (BBMP)"
                }
            },
            {
                "type": "Feature",
                "id": "MUNI-ZONE-01",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [CENTER_LON - DELTA_DEG, CENTER_LAT - DELTA_DEG],
                        [CENTER_LON + DELTA_DEG, CENTER_LAT - DELTA_DEG],
                        [CENTER_LON + DELTA_DEG, CENTER_LAT + DELTA_DEG],
                        [CENTER_LON - DELTA_DEG, CENTER_LAT + DELTA_DEG],
                        [CENTER_LON - DELTA_DEG, CENTER_LAT - DELTA_DEG]
                    ]]
                },
                "properties": {
                    "name": "Mixed Urban High Density Zone (CDP 2031)",
                    "far_permitted": 2.75,
                    "max_height_m": 24.0,
                    "zone_code": "R4-Commercial-Mixed"
                }
            }
        ]
        return {"type": "FeatureCollection", "features": features}

    def get_utility_networks(self) -> Dict[str, Any]:
        """
        Underground pipelines and high-voltage transmission easements.
        """
        # High Voltage Transmission Line traversing diagonally
        hv_line = [
            [round(CENTER_LON - DELTA_DEG * 1.2, 6), round(CENTER_LAT + DELTA_DEG * 0.45, 6)],
            [round(CENTER_LON + DELTA_DEG * 1.2, 6), round(CENTER_LAT + DELTA_DEG * 0.55, 6)]
        ]

        # Underground Water Feeder Main
        water_line = [
            [round(CENTER_LON - DELTA_DEG * 0.9, 6), round(CENTER_LAT - DELTA_DEG * 0.85, 6)],
            [round(CENTER_LON + DELTA_DEG * 0.9, 6), round(CENTER_LAT - DELTA_DEG * 0.85, 6)]
        ]

        features = [
            {
                "type": "Feature",
                "id": "UTL-HV-220KV",
                "geometry": {"type": "LineString", "coordinates": hv_line},
                "properties": {
                    "name": "220kV High Voltage Overhead Transmission Grid",
                    "utility_type": "Electricity",
                    "voltage": "220 kV",
                    "buffer_m": 15.0,
                    "statutory_clearance": "Ministry of Power Regulations 2020",
                    "operator": "KPTCL / State Grid Corp"
                }
            },
            {
                "type": "Feature",
                "id": "UTL-WATER-MAIN",
                "geometry": {"type": "LineString", "coordinates": water_line},
                "properties": {
                    "name": "900mm Dia Primary Water Supply Trunk Line",
                    "utility_type": "Water Main",
                    "diameter_mm": 900,
                    "buffer_m": 8.0,
                    "operator": "BWSSB Water Board"
                }
            }
        ]
        return {"type": "FeatureCollection", "features": features}

mock_data_generator = MockDataGenerator()
