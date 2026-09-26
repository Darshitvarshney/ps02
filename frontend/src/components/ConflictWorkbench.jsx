import React, { useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Clock, 
  Check, 
  Building 
} from "lucide-react";

export default function ConflictWorkbench({ 
  conflicts, 
  onResolveConflict 
}) {
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [userNotes, setUserNotes] = useState("");

  const filteredConflicts = (conflicts || []).filter((c) => {
    if (filterSeverity === "all") return true;
    return c.severity === filterSeverity;
  });

  const totalConflicts = conflicts?.length || 0;
  const resolvedCount = (conflicts || []).filter(c => c.resolved).length;
  const criticalCount = (conflicts || []).filter(c => c.severity === "critical" || c.severity === "high").length;
  const pendingCount = totalConflicts - resolvedCount;

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Total Disputed Zones</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {totalConflicts}
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Multi-source spatial conflicts</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Critical Easements</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#b91c1c", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {criticalCount}
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>High-Voltage & Road Setbacks</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Resolved Status</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#15803d", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {resolvedCount}
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Statutory precedence enforced</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Pending Field Actions</span>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#b45309", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Awaiting joint inspection</span>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "16px" }}>
        {/* Conflict List */}
        <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Spatial Conflict Records</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Detected across High-Resolution Survey Parcels, Utility Networks, Municipal Plans, and Cadastral Deeds
              </p>
            </div>

            {/* Filter buttons */}
            <div style={{ display: "flex", gap: "4px" }}>
              {["all", "critical", "warning"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  style={{
                    background: filterSeverity === sev ? "#eff6ff" : "#ffffff",
                    color: filterSeverity === sev ? "#1e40af" : "#64748b",
                    border: filterSeverity === sev ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    textTransform: "capitalize",
                    cursor: "pointer"
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredConflicts.map((conf) => {
              const isSelected = selectedConflict?.id === conf.id;
              const isCritical = conf.severity === "critical";

              return (
                <div
                  key={conf.id}
                  className="glass-card"
                  onClick={() => setSelectedConflict(conf)}
                  style={{
                    padding: "14px 16px",
                    cursor: "pointer",
                    borderColor: isSelected ? "#1e3a8a" : "#e2e8f0",
                    background: isSelected ? "#f8fafc" : "#ffffff",
                    boxShadow: isSelected ? "0 2px 8px rgba(30, 58, 138, 0.08)" : undefined
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "700",
                        background: isCritical ? "#fef2f2" : "#fffbeb",
                        color: isCritical ? "#b91c1c" : "#b45309",
                        border: `1px solid ${isCritical ? "#fecaca" : "#fde68a"}`
                      }}>
                        {conf.severity.toUpperCase()}
                      </span>
                      <h4 style={{ fontSize: "13.5px", fontWeight: "600", color: "#0f172a" }}>
                        {conf.title}
                      </h4>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {conf.resolved ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#15803d", fontWeight: "600" }}>
                          <CheckCircle2 size={13} />
                          Resolved
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#b45309", fontWeight: "600" }}>
                          <Clock size={13} />
                          Pending Review
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
                    {conf.description}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                    <div>
                      Disputed Slice: <strong style={{ color: "#0f172a", fontFamily: "var(--font-mono)" }}>{conf.disputed_area_sqm} sqm</strong>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {conf.sources_involved?.map((src, i) => (
                        <span key={i} style={{ background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "3px", fontSize: "10.5px", border: "1px solid #e2e8f0" }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conflict Resolution Action Center (Right) */}
        <div className="glass-panel" style={{ padding: "20px", background: "#ffffff", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <Scale size={18} color="#1e3a8a" />
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Statutory Resolution Engine</h3>
          </div>

          {selectedConflict ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: "600" }}>SELECTED CASE</span>
                <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#1e3a8a", marginTop: "2px" }}>
                  {selectedConflict.title}
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                  {selectedConflict.description}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>STATUTORY RECOMMENDATION</span>
                <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#15803d", marginTop: "3px" }}>
                  {selectedConflict.recommended_action}
                </div>
              </div>

              {/* Status if already resolved */}
              {selectedConflict.resolution_applied && (
                <div style={{ padding: "10px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: "10.5px", color: "#15803d", fontWeight: "700" }}>RESOLUTION APPLIED</span>
                  <p style={{ fontSize: "12px", color: "#0f172a", marginTop: "2px" }}>
                    {selectedConflict.resolution_applied}
                  </p>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label style={{ fontSize: "11.5px", color: "#475569", display: "block", marginBottom: "4px", fontWeight: "500" }}>
                  Officer Justification / Field Reference Notes:
                </label>
                <textarea
                  rows={3}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Enter cadastral inquiry notes or gazette notification reference..."
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    color: "#0f172a",
                    fontSize: "12px",
                    resize: "none"
                  }}
                />
              </div>

              {/* Resolution Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  className="btn-primary"
                  style={{ justifyContent: "center" }}
                  onClick={() => {
                    onResolveConflict(selectedConflict.id, "statutory_precedence", userNotes);
                    setUserNotes("");
                  }}
                >
                  <Check size={15} />
                  Enforce Statutory Precedence Rule
                </button>

                <button
                  className="btn-secondary"
                  style={{ justifyContent: "center" }}
                  onClick={() => {
                    onResolveConflict(selectedConflict.id, "drone_ground_truth", userNotes);
                    setUserNotes("");
                  }}
                >
                  <Building size={15} />
                  Snap to Drone Physical Compound Wall
                </button>

                <button
                  className="btn-secondary"
                  style={{ justifyContent: "center" }}
                  onClick={() => {
                    onResolveConflict(selectedConflict.id, "split_equal", userNotes);
                    setUserNotes("");
                  }}
                >
                  <Scale size={15} />
                  Partition Disputed Slice 50/50
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 10px", color: "#64748b", fontSize: "12px" }}>
              <AlertTriangle size={32} color="#cbd5e1" style={{ margin: "0 auto 8px auto", display: "block" }} />
              Select a conflict record from the left panel to review evidence and apply statutory resolution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
