from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class GCPPoint(BaseModel):
    id: str
    name: str
    source_x: float  # Image or local coordinate (e.g. pixel X or local X)
    source_y: float  # Image or local coordinate (e.g. pixel Y or local Y)
    target_x: float  # Survey / CORS Longitude or Easting
    target_y: float  # Survey / CORS Latitude or Northing
    elevation_z: Optional[float] = 0.0
    residual_dx: Optional[float] = 0.0
    residual_dy: Optional[float] = 0.0
    residual_total: Optional[float] = 0.0

class GeoreferenceRequest(BaseModel):
    points: List[GCPPoint]
    method: str = "affine"  # "affine", "projective", "polynomial"
    source_crs: str = "EPSG:3857"
    target_crs: str = "EPSG:4326"

class GeoreferenceResponse(BaseModel):
    method: str
    parameters: Dict[str, float]
    rmse: float
    point_residuals: List[Dict[str, Any]]
    transformation_matrix: List[List[float]]
    status: str

class TopologyCheckRequest(BaseModel):
    geojson: Dict[str, Any]
    snap_tolerance_m: float = 0.35
    sliver_threshold_sqm: float = 8.0
    sliver_thinness_ratio: float = 0.15

class TopologyIssue(BaseModel):
    issue_id: str
    issue_type: str  # "gap", "overlap", "sliver", "self_intersection", "dangling_node"
    severity: str    # "high", "medium", "low"
    parcel_ids: List[str]
    geometry: Dict[str, Any]
    area_sqm: Optional[float] = 0.0
    perimeter_m: Optional[float] = 0.0
    description: str
    auto_repairable: bool = True

class TopologyCleanResponse(BaseModel):
    original_feature_count: int
    cleaned_feature_count: int
    issues_found: List[TopologyIssue]
    gaps_fixed: int
    overlaps_resolved: int
    slivers_merged: int
    self_intersections_fixed: int
    cleaned_geojson: Dict[str, Any]

class SpatialMatchItem(BaseModel):
    legacy_id: str
    ai_drone_id: str
    iou_score: float
    hausdorff_distance_m: float
    centroid_distance_m: float
    boundary_similarity: float
    match_status: str  # "exact_match", "partial_match", "subdivided", "consolidated", "unmatched"
    confidence: float

class SpatialMatchResponse(BaseModel):
    total_legacy: int
    total_ai: int
    matched_pairs: List[SpatialMatchItem]
    average_iou: float
    average_confidence: float

class AttributeRecord(BaseModel):
    khasra_no: str
    khata_no: str
    owner_name_revenue: str
    owner_name_survey: Optional[str] = None
    recorded_area_sqm: float
    gis_calculated_area_sqm: float
    area_delta_sqm: float
    area_delta_percent: float
    revenue_land_use: str
    actual_land_use_ai: str
    name_similarity_score: float
    status: str  # "verified", "area_mismatch", "owner_discrepancy", "landuse_violation"

class ConflictRecord(BaseModel):
    id: str
    title: str
    type: str  # "encroachment", "unauthorized_construction", "ownership_dispute", "overlap_conflict", "utility_easement_violation"
    severity: str  # "critical", "warning", "info"
    parcel_id: str
    survey_no: str
    disputed_area_sqm: float
    sources_involved: List[str]  # e.g. ["Drone ORI", "Municipal GIS", "Legacy Cadastre"]
    description: str
    evidence_geometry: Dict[str, Any]
    recommended_action: str
    resolved: bool = False
    resolution_applied: Optional[str] = None

class ConfidenceScoreBreakdown(BaseModel):
    parcel_id: str
    survey_no: str
    spatial_fidelity: float     # 0-100 (GPS/GCP alignment, edge sharpness)
    topological_health: float   # 0-100 (clean boundaries, zero slivers/overlaps)
    attribute_consistency: float # 0-100 (RoR vs GIS area, ownership fuzzy match)
    multi_source_consensus: float # 0-100 (verified by Municipal + Drone + GT)
    overall_confidence: float   # 0-100 composite weighted score
    grade: str                  # "A - Certified", "B - High", "C - Moderate", "D - Disputed"

class HarmonizationPipelineRequest(BaseModel):
    apply_georeferencing: bool = True
    apply_topology_clean: bool = True
    apply_ai_spatial_match: bool = True
    apply_attribute_reconciliation: bool = True
    apply_conflict_resolution: bool = True
    apply_confidence_scoring: bool = True
    snap_tolerance_m: float = 0.35
    sliver_threshold_sqm: float = 8.0
    auto_resolve_conflicts: bool = True

class HarmonizationPipelineResponse(BaseModel):
    run_id: str
    timestamp: str
    execution_time_ms: float
    status: str
    summary_metrics: Dict[str, Any]
    harmonized_cadastre: Dict[str, Any]
    conflicts: List[ConflictRecord]
    confidence_scores: List[ConfidenceScoreBreakdown]
    change_detection_results: Dict[str, Any]
    elevation_insights: Dict[str, Any]
