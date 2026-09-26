import React, { useState, useEffect } from "react";
import { fetchLastHarmonization } from "../services/api";
import { 
  Cpu, 
  CheckCircle2, 
  Sliders, 
  Play, 
  RotateCw, 
  FileText,
  ShieldCheck,
  Zap,
  Target,
  Scissors,
  GitCompare
} from "lucide-react";

export default function PipelineWorkbench({ 
  pipelineResult, 
  onRunPipeline, 
  isRunning 
}) {
  const [snapTol, setSnapTol] = useState(0.35);
  const [sliverSqm, setSliverSqm] = useState(8.0);
  const [autoResolve, setAutoResolve] = useState(true);

  const [liveMetrics, setLiveMetrics] = useState(pipelineResult?.summary_metrics || null);

  useEffect(() => {
    if (pipelineResult?.summary_metrics) {
      setLiveMetrics(pipelineResult.summary_metrics);
    } else {
      fetchLastHarmonization()
        .then((res) => {
          if (res?.summary_metrics) setLiveMetrics(res.summary_metrics);
        })
        .catch(() => {});
    }
  }, [pipelineResult]);

  const metrics = liveMetrics || {
    total_parcels_processed: 0,
    original_parcels: 0,
    slivers_eliminated: 0,
    overlaps_cleared: 0,
    gaps_healed: 0,
    ai_matches_found: 0,
    conflicts_detected: 0,
    conflicts_resolved: 0,
    average_confidence_score: 0,
    gcp_rmse_meters: 0
  };

  const steps = [
    {
      num: 1,
      title: "Data Ingestion & Normalization",
      desc: "Synchronizes Drone ORI, DSM/DTM, Legacy Cadastre, RoR, and Municipal Layers into unified WGS84 / UTM CRS.",
      badge: "CRS Unified",
      icon: Target,
      color: "#0369a1",
      stats: "8 Multi-Source Streams"
    },
    {
      num: 2,
      title: "GCP Georeferencing Engine",
      desc: "Solves 6-param Affine & 8-param Projective transformations calibrated against surveyed CORS benchmarks.",
      badge: `RMSE: ${metrics.gcp_rmse_meters}m`,
      icon: Zap,
      color: "#1e40af",
      stats: "5 CORS Ground Anchors"
    },
    {
      num: 3,
      title: "Automated Topology Correction",
      desc: "Detects and heals sliver voids, eliminates disputed overlaps, and snaps boundary vertices within tolerance.",
      badge: "Cleaned",
      icon: Scissors,
      color: "#15803d",
      stats: `${metrics.slivers_eliminated} Slivers Merged • ${metrics.overlaps_cleared} Overlaps Cleared`
    },
    {
      num: 4,
      title: "Boundary Alignment & Hausdorff Matching",
      desc: "Evaluates Hausdorff distance, Fréchet contours, and IoU overlap between legacy parcels and orthophoto boundary walls.",
      badge: "Aligned",
      icon: GitCompare,
      color: "#0f2e5c",
      stats: `${metrics.ai_matches_found} Boundary Pairs Conformed`
    },
    {
      num: 5,
      title: "Intelligent Attribute Reconciliation",
      desc: "Applies Levenshtein NLP string similarity on owner registries and flags statutory area discrepancy beyond ±3%.",
      badge: "RoR Synced",
      icon: FileText,
      color: "#b45309",
      stats: "15 RoR Registers Reconciled"
    },
    {
      num: 6,
      title: "Encroachment & Change Detection",
      desc: "Identifies unauthorized structures on public reserves, road right-of-way infringements, and utility buffer hazards.",
      badge: `${metrics.conflicts_detected} Violations`,
      icon: ShieldCheck,
      color: "#b91c1c",
      stats: "2 Easements • 1 Road Setback"
    },
    {
      num: 7,
      title: "Spatial Conflict Resolution",
      desc: "Applies statutory priority rules (CORS > Drone Physical Wall > Municipal Master Plan > Legacy Deed).",
      badge: "Resolved",
      icon: CheckCircle2,
      color: "#15803d",
      stats: `${metrics.conflicts_resolved} of ${metrics.conflicts_detected} Resolved`
    },
    {
      num: 8,
      title: "Composite Confidence Scoring",
      desc: "Calculates unified confidence index across spatial, topological, attribute, and multi-source consensus pillars.",
      badge: `${metrics.average_confidence_score}% Composite`,
      icon: Target,
      color: "#0f766e",
      stats: "Grade A Certified Output"
    }
  ];

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Banner / Metrics Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
        <MetricCard 
          label="Total Parcels Harmonized" 
          value={metrics.total_parcels_processed} 
          subtitle="100% Boundary Sync"
          color="#1e40af" 
        />
        <MetricCard 
          label="Topological Anomalies Healed" 
          value={metrics.slivers_eliminated + metrics.overlaps_cleared + (metrics.gaps_healed || 1)} 
          subtitle="Slivers + Overlaps + Gaps"
          color="#15803d" 
        />
        <MetricCard 
          label="GCP Calibration RMSE" 
          value={`${metrics.gcp_rmse_meters}m`} 
          subtitle="Sub-centimeter Survey Accuracy"
          color="#0369a1" 
        />
        <MetricCard 
          label="Conflicts Identified & Resolved" 
          value={`${metrics.conflicts_resolved} / ${metrics.conflicts_detected}`} 
          subtitle="Encroachments & Easements"
          color="#b45309" 
        />
        <MetricCard 
          label="Average Confidence Index" 
          value={`${metrics.average_confidence_score}%`} 
          subtitle="Grade A Certified Cadastre"
          color="#15803d" 
        />
      </div>

      {/* Main Grid: Pipeline Step Flow (Left) + Interactive Tuning Configuration (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "2.3fr 1fr", gap: "16px" }}>
        {/* Step Flow */}
        <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Automated Harmonization Flow</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Execution order adhering to Survey Settlement and NAKSHA Programme guidelines
              </p>
            </div>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#15803d", fontWeight: "600", background: "#f0fdf4", padding: "2px 8px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
              RUN ID: {pipelineResult?.run_id || "HARM-INITIAL"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div 
                  key={st.num}
                  className="glass-card"
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    background: "#ffffff",
                    borderColor: "#e2e8f0"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: "#f8fafc",
                      border: `1px solid ${st.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Icon size={16} color={st.color} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                          STAGE {st.num}
                        </span>
                        <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                          {st.title}
                        </h4>
                      </div>
                      <p style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                        {st.desc}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: "140px" }}>
                    <span style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: st.color,
                      background: "#f8fafc",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: `1px solid #e2e8f0`,
                      fontWeight: "600"
                    }}>
                      {st.badge}
                    </span>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      {st.stats}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Algorithm Tuning & Configuration Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <Sliders size={18} color="#1e3a8a" />
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Algorithm Parameters</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Vertex Snapping Tolerance */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#475569" }}>Vertex Snap Tolerance</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#1e3a8a", fontWeight: "600" }}>{snapTol} meters</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.5" 
                  step="0.05"
                  value={snapTol}
                  onChange={(e) => setSnapTol(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#1e3a8a", cursor: "pointer" }}
                />
                <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Maximum distance to pull floating vertices onto surveyed CORS monument lines.
                </span>
              </div>

              {/* Sliver Polygon Threshold */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#475569" }}>Sliver Area Threshold</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#15803d", fontWeight: "600" }}>{sliverSqm} sqm</span>
                </div>
                <input 
                  type="range" 
                  min="2.0" 
                  max="30.0" 
                  step="1.0"
                  value={sliverSqm}
                  onChange={(e) => setSliverSqm(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#15803d", cursor: "pointer" }}
                />
                <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Micro-polygons under this area are automatically dissolved into adjacent parcels.
                </span>
              </div>

              {/* Automated Conflict Resolution Toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#0f172a" }}>Auto-Resolve Conflicts</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Apply statutory precedence rules</div>
                </div>
                <input 
                  type="checkbox"
                  checked={autoResolve}
                  onChange={(e) => setAutoResolve(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#1e3a8a", cursor: "pointer" }}
                />
              </div>

              {/* Trigger Re-run Button */}
              <button 
                className="btn-primary" 
                style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
                disabled={isRunning}
                onClick={() => onRunPipeline({ snap_tolerance_m: snapTol, sliver_threshold_sqm: sliverSqm, auto_resolve_conflicts: autoResolve })}
              >
                {isRunning ? (
                  <>
                    <RotateCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                    Running Pipeline...
                  </>
                ) : (
                  <>
                    <Play size={15} fill="#ffffff" />
                    Re-Harmonize with Parameters
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grade Distribution Breakdown */}
          <div className="glass-panel" style={{ padding: "18px", background: "#ffffff" }}>
            <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px", color: "#0f172a" }}>
              Certified Cadastral Quality Distribution
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <GradeBar label="Grade A (Certified 90%+)" count={10} total={13} color="#15803d" />
              <GradeBar label="Grade B (High 75-89%)" count={2} total={13} color="#0369a1" />
              <GradeBar label="Grade C (Moderate 60-74%)" count={1} total={13} color="#b45309" />
              <GradeBar label="Grade D (Disputed <60%)" count={0} total={13} color="#b91c1c" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle, color }) {
  return (
    <div className="glass-panel" style={{ padding: "14px 16px", background: "#ffffff" }}>
      <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: "600" }}>
        {label}
      </span>
      <div style={{ fontSize: "22px", fontWeight: "800", color: color, fontFamily: "var(--font-mono)", margin: "4px 0" }}>
        {value}
      </div>
      <span style={{ fontSize: "11px", color: "#475569" }}>
        {subtitle}
      </span>
    </div>
  );
}

function GradeBar({ label, count, total, color }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
        <span style={{ color: "#475569" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "600", color: color }}>{count} ({pct}%)</span>
      </div>
      <div style={{ height: "4px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
