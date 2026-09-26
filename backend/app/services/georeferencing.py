import numpy as np
from typing import List, Dict, Any, Tuple
import pyproj
from ..models.schemas import GCPPoint, GeoreferenceResponse

class GeoreferencingEngine:
    def __init__(self):
        # Default transformers
        self.crs_cache = {}

    def get_transformer(self, source_crs: str, target_crs: str):
        key = f"{source_crs}->{target_crs}"
        if key not in self.crs_cache:
            self.crs_cache[key] = pyproj.Transformer.from_crs(source_crs, target_crs, always_xy=True)
        return self.crs_cache[key]

    def solve_affine(self, points: List[GCPPoint]) -> Dict[str, Any]:
        """
        Solves 6-parameter affine transformation:
        x_target = a * x_src + b * y_src + c
        y_target = d * x_src + e * y_src + f
        """
        if len(points) < 3:
            raise ValueError("Affine transformation requires at least 3 GCP points.")

        n = len(points)
        A = np.zeros((2 * n, 6))
        B = np.zeros(2 * n)

        for i, pt in enumerate(points):
            # Equation for x_target
            A[2 * i] = [pt.source_x, pt.source_y, 1, 0, 0, 0]
            B[2 * i] = pt.target_x
            # Equation for y_target
            A[2 * i + 1] = [0, 0, 0, pt.source_x, pt.source_y, 1]
            B[2 * i + 1] = pt.target_y

        # Least squares solution
        params, residuals, rank, s = np.linalg.lstsq(A, B, rcond=None)
        a, b, c, d, e, f = params

        # Compute individual residuals and RMSE
        residuals_list = []
        sq_errors = []

        for pt in points:
            pred_x = a * pt.source_x + b * pt.source_y + c
            pred_y = d * pt.source_x + e * pt.source_y + f
            dx = pred_x - pt.target_x
            dy = pred_y - pt.target_y
            err = np.sqrt(dx**2 + dy**2)
            sq_errors.append(err**2)

            residuals_list.append({
                "point_id": pt.id,
                "name": pt.name,
                "predicted_x": round(float(pred_x), 6),
                "predicted_y": round(float(pred_y), 6),
                "target_x": round(float(pt.target_x), 6),
                "target_y": round(float(pt.target_y), 6),
                "residual_dx": round(float(dx), 6),
                "residual_dy": round(float(dy), 6),
                "residual_error": round(float(err), 6)
            })

        rmse = float(np.sqrt(np.mean(sq_errors)))
        matrix = [
            [round(float(a), 8), round(float(b), 8), round(float(c), 8)],
            [round(float(d), 8), round(float(e), 8), round(float(f), 8)],
            [0.0, 0.0, 1.0]
        ]

        return {
            "method": "affine_6_param",
            "parameters": {
                "a": float(a), "b": float(b), "c": float(c),
                "d": float(d), "e": float(e), "f": float(f)
            },
            "rmse": round(rmse, 4),
            "point_residuals": residuals_list,
            "transformation_matrix": matrix,
            "status": "converged"
        }

    def solve_projective(self, points: List[GCPPoint]) -> Dict[str, Any]:
        """
        Solves 8-parameter projective (homography) transformation:
        x' = (h1*x + h2*y + h3) / (h7*x + h8*y + 1)
        y' = (h4*x + h5*y + h6) / (h7*x + h8*y + 1)
        """
        if len(points) < 4:
            raise ValueError("Projective transformation requires at least 4 GCP points.")

        n = len(points)
        A = np.zeros((2 * n, 8))
        B = np.zeros(2 * n)

        for i, pt in enumerate(points):
            x, y = pt.source_x, pt.source_y
            xt, yt = pt.target_x, pt.target_y
            A[2 * i] = [x, y, 1, 0, 0, 0, -x * xt, -y * xt]
            B[2 * i] = xt
            A[2 * i + 1] = [0, 0, 0, x, y, 1, -x * yt, -y * yt]
            B[2 * i + 1] = yt

        params, _, _, _ = np.linalg.lstsq(A, B, rcond=None)
        h1, h2, h3, h4, h5, h6, h7, h8 = params

        residuals_list = []
        sq_errors = []

        for pt in points:
            x, y = pt.source_x, pt.source_y
            denom = h7 * x + h8 * y + 1.0
            pred_x = (h1 * x + h2 * y + h3) / denom
            pred_y = (h4 * x + h5 * y + h6) / denom
            dx = pred_x - pt.target_x
            dy = pred_y - pt.target_y
            err = np.sqrt(dx**2 + dy**2)
            sq_errors.append(err**2)

            residuals_list.append({
                "point_id": pt.id,
                "name": pt.name,
                "predicted_x": round(float(pred_x), 6),
                "predicted_y": round(float(pred_y), 6),
                "target_x": round(float(pt.target_x), 6),
                "target_y": round(float(pt.target_y), 6),
                "residual_dx": round(float(dx), 6),
                "residual_dy": round(float(dy), 6),
                "residual_error": round(float(err), 6)
            })

        rmse = float(np.sqrt(np.mean(sq_errors)))
        matrix = [
            [round(float(h1), 8), round(float(h2), 8), round(float(h3), 8)],
            [round(float(h4), 8), round(float(h5), 8), round(float(h6), 8)],
            [round(float(h7), 8), round(float(h8), 8), 1.0]
        ]

        return {
            "method": "projective_homography_8_param",
            "parameters": {
                f"h{i+1}": float(params[i]) for i in range(8)
            },
            "rmse": round(rmse, 4),
            "point_residuals": residuals_list,
            "transformation_matrix": matrix,
            "status": "converged"
        }

    def transform_geometry(self, geometry: Dict[str, Any], matrix: List[List[float]], method: str = "affine") -> Dict[str, Any]:
        """
        Transforms any GeoJSON geometry using the calculated matrix.
        """
        g_type = geometry.get("type")
        coords = geometry.get("coordinates")

        def transform_pt(pt):
            x, y = pt[0], pt[1]
            if method.startswith("affine"):
                a, b, c = matrix[0]
                d, e, f = matrix[1]
                new_x = a * x + b * y + c
                new_y = d * x + e * y + f
            else:
                h1, h2, h3 = matrix[0]
                h4, h5, h6 = matrix[1]
                h7, h8, h9 = matrix[2]
                denom = h7 * x + h8 * y + h9
                new_x = (h1 * x + h2 * y + h3) / denom
                new_y = (h4 * x + h5 * y + h6) / denom
            return [round(new_x, 7), round(new_y, 7)]

        if g_type == "Point":
            return {"type": "Point", "coordinates": transform_pt(coords)}
        elif g_type == "LineString":
            return {"type": "LineString", "coordinates": [transform_pt(p) for p in coords]}
        elif g_type == "Polygon":
            return {"type": "Polygon", "coordinates": [[transform_pt(p) for p in ring] for ring in coords]}
        elif g_type == "MultiPolygon":
            return {"type": "MultiPolygon", "coordinates": [[[transform_pt(p) for p in ring] for ring in poly] for poly in coords]}
        return geometry

georeferencing_engine = GeoreferencingEngine()
