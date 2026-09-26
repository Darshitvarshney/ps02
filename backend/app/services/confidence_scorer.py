from typing import List, Dict, Any
from ..models.schemas import ConfidenceScoreBreakdown

class ConfidenceScorer:
    def __init__(
        self,
        weight_spatial: float = 0.30,
        weight_topology: float = 0.25,
        weight_attribute: float = 0.25,
        weight_consensus: float = 0.20
    ):
        self.w_spatial = weight_spatial
        self.w_topology = weight_topology
        self.w_attribute = weight_attribute
        self.w_consensus = weight_consensus

    def evaluate_parcel(
        self,
        parcel_id: str,
        survey_no: str,
        gcp_rmse: float,
        has_cors_anchor: bool,
        has_topology_issue: bool,
        is_sliver: bool,
        area_delta_percent: float,
        name_similarity: float,
        source_count: int,
        has_active_conflict: bool
    ) -> ConfidenceScoreBreakdown:
        
        # 1. Spatial Fidelity (0-100)
        # Low RMSE + CORS anchor -> high score
        spatial_base = 95.0 if has_cors_anchor else 85.0
        rmse_penalty = min(gcp_rmse * 20.0, 30.0)
        spatial_fidelity = max(30.0, spatial_base - rmse_penalty)

        # 2. Topological Health (0-100)
        topo_health = 98.0
        if has_topology_issue:
            topo_health -= 35.0
        if is_sliver:
            topo_health -= 25.0
        topo_health = max(20.0, topo_health)

        # 3. Attribute Consistency (0-100)
        # Deduct for area discrepancy and name discrepancy
        area_score = max(20.0, 100.0 - (area_delta_percent * 8.0))
        name_score = name_similarity * 100.0
        attribute_consistency = (area_score * 0.6) + (name_score * 0.4)

        # 4. Multi-Source Consensus (0-100)
        # More confirming datasets -> higher score
        consensus = min(100.0, 50.0 + (source_count * 12.0))
        if has_active_conflict:
            consensus -= 30.0
        consensus = max(20.0, consensus)

        # Composite score
        overall = (
            self.w_spatial * spatial_fidelity +
            self.w_topology * topo_health +
            self.w_attribute * attribute_consistency +
            self.w_consensus * consensus
        )

        overall = round(max(10.0, min(99.5, overall)), 1)

        # Grade
        if overall >= 88.0:
            grade = "A - Certified"
        elif overall >= 74.0:
            grade = "B - High"
        elif overall >= 60.0:
            grade = "C - Moderate"
        else:
            grade = "D - Disputed"

        return ConfidenceScoreBreakdown(
            parcel_id=str(parcel_id),
            survey_no=str(survey_no),
            spatial_fidelity=round(spatial_fidelity, 1),
            topological_health=round(topo_health, 1),
            attribute_consistency=round(attribute_consistency, 1),
            multi_source_consensus=round(consensus, 1),
            overall_confidence=overall,
            grade=grade
        )

confidence_scorer = ConfidenceScorer()
