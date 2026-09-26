import React, { useState, useEffect } from "react";
import { 
  GitCompare, 
  RotateCw, 
  CheckCircle2, 
  Target, 
  Layers
} from "lucide-react";
import { fetchSpatialMatch } from "../services/api";

export default function SpatialMatchWorkbench() {
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runMatching();
  }, []);

  const runMatching = async () => {
    setLoading(true);
    try {
      const data = await fetchSpatialMatch();
      setMatchData(data);
    } catch (err) {
      console.warn("Spatial matching API error:", err);
    } finally {
      setLoading(false);
    }
  };

  const pairs = matchData?.matched_pairs || [];
  const validPairs = pairs.filter(p => p.match_status !== "unmatched");
  const avgIou = matchData?.average_iou ?? (validPairs.length > 0 ? validPairs.reduce((acc, p) => acc + p.iou_score, 0) / validPairs.length : 0);
  const avgConf = matchData?.average_confidence ?? (validPairs.length > 0 ? validPairs.reduce((acc, p) => acc + p.confidence, 0) / validPairs.length : 0);
  const meanHausdorff = validPairs.length > 0 ? (validPairs.reduce((acc, p) => acc + p.hausdorff_distance_m, 0) / validPairs.length).toFixed(2) : "0.00";
  const conformantCount = pairs.filter(p => p.iou_score >= 0.8).length;
  const matchRate = pairs.length > 0 ? Math.round((conformantCount / pairs.length) * 100) : 0;

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Mean IoU Overlap</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#15803d", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {Math.round(avgIou * 100)}% Jaccard
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Legacy vs Drone Feature Overlap</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Mean Hausdorff Distance</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f2e5c", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {meanHausdorff} meters
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Discrete Contour Boundary Shift</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>High Conformance Rate</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0369a1", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {matchRate}% ({conformantCount}/{pairs.length})
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>IoU &ge; 0.80 Geodetic Conformance</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Boundary Conformance</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f2e5c", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {Math.round(avgConf * 100)}%
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Multi-metric Spatial Alignment</span>
        </div>
      </div>

      {/* Spatial Pairs Table */}
      <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Cadastral Boundary Conformance & Hausdorff Alignment Register</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Evaluates geometric correspondence between legacy survey boundaries and photogrammetric compound walls
            </p>
          </div>

          <button
            className="btn-primary"
            disabled={loading}
            onClick={runMatching}
            style={{ fontSize: "12px" }}
          >
            {loading ? (
              <>
                <RotateCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                Matching Features...
              </>
            ) : (
              <>
                <GitCompare size={14} />
                Re-Compute Boundary Metrics
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>
            <RotateCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px auto" }} />
            <p style={{ fontSize: "13px" }}>Computing Hausdorff metrics & IoU polygon intersection...</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "10px 14px" }}>Legacy Parcel ID</th>
                <th style={{ padding: "10px 14px" }}>Surveyed Feature</th>
                <th style={{ padding: "10px 14px" }}>IoU Overlap</th>
                <th style={{ padding: "10px 14px" }}>Hausdorff Dist (m)</th>
                <th style={{ padding: "10px 14px" }}>Centroid Shift (m)</th>
                <th style={{ padding: "10px 14px" }}>Boundary Similarity</th>
                <th style={{ padding: "10px 14px" }}>Match Classification</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p, i) => {
                const isExact = p.match_status === "exact_match" || p.iou_score > 0.85;
                const isUnmatched = p.match_status === "unmatched";
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#0f2e5c" }}>
                      Khasra #{p.legacy_id}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "#475569" }}>
                      {p.ai_drone_id}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ 
                        fontFamily: "var(--font-mono)", 
                        fontWeight: "700", 
                        color: p.iou_score > 0.85 ? "#15803d" : p.iou_score > 0.6 ? "#b45309" : "#b91c1c" 
                      }}>
                        {Math.round(p.iou_score * 100)}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "#0f172a" }}>
                      {p.hausdorff_distance_m > 100 ? "N/A (Sliver)" : `${p.hausdorff_distance_m}m`}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", color: "#64748b" }}>
                      {p.centroid_distance_m ? `${p.centroid_distance_m.toFixed(2)}m` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#475569" }}>
                        {Math.round((p.boundary_similarity || 0) * 100)}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "700",
                        background: isUnmatched ? "#fef2f2" : isExact ? "#f0fdf4" : "#fffbeb",
                        color: isUnmatched ? "#b91c1c" : isExact ? "#15803d" : "#b45309",
                        border: `1px solid ${isUnmatched ? "#fecaca" : isExact ? "#bbf7d0" : "#fde68a"}`
                      }}>
                        {isUnmatched ? "UNMATCHED VOID" : isExact ? "CONFORMANT" : "PARTIAL ALIGN"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "#0f2e5c" }}>
                        {Math.round((p.confidence || 0) * 100)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
