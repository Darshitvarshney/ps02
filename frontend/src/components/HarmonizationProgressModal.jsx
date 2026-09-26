import React, { useEffect, useState } from "react";
import { CheckCircle2, RotateCw, Play, ShieldAlert, Cpu } from "lucide-react";

export default function HarmonizationProgressModal({ isOpen, isRunning, onComplete, metrics }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Geodetic CRS & Affine Helmert Alignment", desc: "Transforming 1998 revenue datum to WGS-84 / UTM 43N using Survey of India CORS GNSS base stations." },
    { title: "Topology Error Scrubbing & Gap Healing", desc: "Eliminating micro-slivers (< 5 sqm), overlapping boundaries, and unclosed polygon gaps." },
    { title: "AI/ML Boundary Conformance & Hausdorff Matching", desc: "Evaluating IoU overlap and Directed Hausdorff Distance against 5cm UAV drone imagery." },
    { title: "Statutory Easement & Utility Encroachment Check", desc: "Cross-referencing high-voltage power lines and water pipelines against parcel deeds." },
    { title: "Composite Confidence Index & LPM Passbook Sealing", desc: "Calculating Grade A-D compliance scores and generating Bhoomi e-Records." }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    if (isRunning) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 700);
      return () => clearInterval(interval);
    } else {
      setCurrentStep(steps.length);
    }
  }, [isOpen, isRunning]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "540px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        border: "1px solid #cbd5e1",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "#0f2e5c",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <Cpu size={20} color="#93c5fd" />
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>
              GeoAI Cadastral Harmonization Pipeline
            </h3>
            <p style={{ fontSize: "11px", color: "#bfdbfe", margin: "2px 0 0 0" }}>
              Automated multi-source geospatial alignment & compliance engine (PS-26013)
            </p>
          </div>
        </div>

        {/* Steps Content */}
        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {steps.map((step, idx) => {
              const isDone = currentStep > idx || (!isRunning && currentStep >= steps.length);
              const isCurrent = currentStep === idx && isRunning;
              return (
                <div key={idx} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "1px",
                    background: isDone ? "#dcfce7" : isCurrent ? "#eff6ff" : "#f1f5f9",
                    border: `1.5px solid ${isDone ? "#16a34a" : isCurrent ? "#2563eb" : "#cbd5e1"}`
                  }}>
                    {isDone ? (
                      <CheckCircle2 size={14} color="#16a34a" />
                    ) : isCurrent ? (
                      <RotateCw size={13} color="#2563eb" style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b" }}>{idx + 1}</span>
                    )}
                  </div>

                  <div>
                    <h4 style={{
                      fontSize: "12.5px",
                      fontWeight: "600",
                      color: isDone ? "#15803d" : isCurrent ? "#0f2e5c" : "#64748b",
                      margin: 0
                    }}>
                      {step.title}
                    </h4>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0", lineHeight: "1.4" }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Summary once complete */}
          {!isRunning && metrics && (
            <div style={{
              marginTop: "20px",
              padding: "12px 14px",
              background: "#f0fdf4",
              borderRadius: "6px",
              border: "1px solid #bbf7d0"
            }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#166534", marginBottom: "4px" }}>
                Harmonization Successfully Executed:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "11px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>Average Conformance:</span>
                  <div style={{ fontWeight: "700", color: "#15803d", fontSize: "13px" }}>
                    {metrics.average_confidence_score}% (Grade {metrics.grade || 'A'})
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Slivers Healed:</span>
                  <div style={{ fontWeight: "700", color: "#0f2e5c", fontSize: "13px" }}>
                    {metrics.slivers_removed || 1} polygons
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Discrepancies:</span>
                  <div style={{ fontWeight: "700", color: "#b91c1c", fontSize: "13px" }}>
                    {metrics.conflicts_detected || 2} flagged
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onComplete}
            disabled={isRunning}
            style={{
              padding: "7px 18px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "4px",
              background: isRunning ? "#94a3b8" : "#0f2e5c",
              border: "none",
              color: "#ffffff",
              cursor: isRunning ? "not-allowed" : "pointer"
            }}
          >
            {isRunning ? "Processing Survey Data..." : "View Harmonized Cadastre"}
          </button>
        </div>
      </div>
    </div>
  );
}
