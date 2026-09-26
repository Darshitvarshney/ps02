import React, { useState, useEffect } from "react";
import { 
  Search, 
  FileCheck2,
  RotateCw
} from "lucide-react";
import { fetchAttributeReconciliation } from "../services/api";

export default function AttributeWorkbench({ 
  records, 
  onSelectKhasra, 
  onOpenPassbook 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ledgerData, setLedgerData] = useState(records || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (records && records.length > 0) {
      setLedgerData(records);
    } else {
      setLoading(true);
      fetchAttributeReconciliation()
        .then((res) => {
          setLedgerData(res.reconciled_records || []);
          setLoading(false);
        })
        .catch((err) => {
          console.warn("Failed to fetch attribute reconciliation:", err);
          setLoading(false);
        });
    }
  }, [records]);

  const filtered = ledgerData.filter((r) => {
    const khasra = r.khasra_no ? String(r.khasra_no).toLowerCase() : "";
    const owner = r.owner_name_revenue ? String(r.owner_name_revenue).toLowerCase() : "";
    const term = searchTerm.toLowerCase();
    const matchesSearch = khasra.includes(term) || owner.includes(term);

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: "16px 20px", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Revenue RoR & Cadastral Reconciliation Ledger</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Fuzzy schema mapping between State Land Records (Bhoomi/RoR) and High-Resolution Surveyed Boundaries
            </p>
          </div>

          {/* Search bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "6px 12px",
            width: "280px"
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search by Khasra or Owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#0f172a",
                fontSize: "12px",
                width: "100%"
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "all", label: "All Records" },
            { id: "verified", label: "Verified & Clean" },
            { id: "area_mismatch", label: "Area Discrepancies (>3%)" },
            { id: "landuse_violation", label: "Land Use Conversions (Sec 143)" }
          ].map((flt) => (
            <button
              key={flt.id}
              onClick={() => setStatusFilter(flt.id)}
              style={{
                background: statusFilter === flt.id ? "#eff6ff" : "#f8fafc",
                color: statusFilter === flt.id ? "#0f2e5c" : "#64748b",
                border: statusFilter === flt.id ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel" style={{ padding: "0", overflow: "hidden", background: "#ffffff" }}>
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>
            <RotateCw size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px auto" }} />
            <p style={{ fontSize: "13px" }}>Querying Revenue Records & Reconciling Cadastral Attributes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "50px 0", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontSize: "13px" }}>No cadastral records found matching filter.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 16px" }}>Khasra / Khata</th>
                <th style={{ padding: "12px 16px" }}>Revenue RoR Owner Name</th>
                <th style={{ padding: "12px 16px" }}>Survey / Municipal Name</th>
                <th style={{ padding: "12px 16px" }}>Name Match</th>
                <th style={{ padding: "12px 16px" }}>Recorded Area</th>
                <th style={{ padding: "12px 16px" }}>Surveyed Area</th>
                <th style={{ padding: "12px 16px" }}>Area Delta (Δ)</th>
                <th style={{ padding: "12px 16px" }}>Land Use</th>
                <th style={{ padding: "12px 16px" }}>Audit Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isMismatch = r.status === "area_mismatch";
                const isConversion = r.status === "landuse_violation";

                return (
                  <tr 
                    key={r.khasra_no}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#0f2e5c" }}>
                      #{r.khasra_no} <span style={{ color: "#64748b", fontWeight: "400" }}>/ {r.khata_no}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>
                      {r.owner_name_revenue}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>
                      {r.owner_name_survey || r.owner_name_revenue}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: "600", color: r.name_similarity_score > 0.8 ? "#15803d" : "#b45309" }}>
                          {Math.round((r.name_similarity_score || 1) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#475569" }}>
                      {r.recorded_area_sqm} sqm
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#0f2e5c", fontWeight: "600" }}>
                      {r.gis_calculated_area_sqm} sqm
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: isMismatch ? "#b91c1c" : "#15803d",
                        fontWeight: "700"
                      }}>
                        {r.area_delta_sqm > 0 ? `+${r.area_delta_sqm}` : r.area_delta_sqm} sqm ({r.area_delta_percent}%)
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: "11px" }}>
                        <div style={{ color: "#64748b" }}>RoR: {r.revenue_land_use}</div>
                        <div style={{ color: "#0f2e5c", fontWeight: "600" }}>Survey: {r.actual_land_use_ai}</div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: "700",
                        background: isMismatch ? "#fef2f2" : isConversion ? "#fffbeb" : "#f0fdf4",
                        color: isMismatch ? "#b91c1c" : isConversion ? "#b45309" : "#15803d",
                        border: `1px solid ${isMismatch ? "#fecaca" : isConversion ? "#fde68a" : "#bbf7d0"}`
                      }}>
                        {r.status ? r.status.toUpperCase().replace("_", " ") : "VERIFIED"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        onClick={() => onOpenPassbook(r.khasra_no)}
                      >
                        <FileCheck2 size={13} />
                        Passbook
                      </button>
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
