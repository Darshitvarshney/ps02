import React, { useState, useEffect } from "react";
import { 
  Building2 
} from "lucide-react";
import { fetchElevationTransect } from "../services/api";

export default function ElevationWorkbench() {
  const [profile, setProfile] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    loadTransect();
  }, []);

  const loadTransect = async () => {
    try {
      const data = await fetchElevationTransect();
      setProfile(data.profile || []);
    } catch (err) {
      console.warn("Failed to fetch transect from elevation service:", err);
      setProfile([]);
    }
  };

  // SVG Chart bounds
  const width = 800;
  const height = 320;
  const padding = 50;

  const minElev = 580.0;
  const maxElev = 605.0;
  const maxDist = profile.length > 0 ? profile[profile.length - 1].distance_m : 400;

  const scaleX = (dist) => padding + (dist / maxDist) * (width - 2 * padding);
  const scaleY = (elev) => height - padding - ((elev - minElev) / (maxElev - minElev)) * (height - 2 * padding);

  const dtmPath = profile.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.distance_m)} ${scaleY(p.dtm_elevation_m)}`).join(" ");
  const dsmPath = profile.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.distance_m)} ${scaleY(p.dsm_elevation_m)}`).join(" ");

  let structurePolygons = [];
  profile.forEach((p) => {
    if (p.ndsm_height_m > 0) {
      const x = scaleX(p.distance_m);
      const yBottom = scaleY(p.dtm_elevation_m);
      const yTop = scaleY(p.dsm_elevation_m);
      structurePolygons.push({ x, yTop, yBottom, p });
    }
  });

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Base Datum</span>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e3a8a", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            MSL / WGS84
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Mean Sea Level Elevation</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Max Structure Height (nDSM)</span>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#15803d", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            18.5 meters
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Within 24m Municipal Cap</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Average Terrain Slope</span>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#6d28d9", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            2.1% Gradient
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Gentle Urban Drainage Plain</span>
        </div>

        <div className="glass-panel" style={{ padding: "14px 18px", background: "#ffffff" }}>
          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Transect Length</span>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#b45309", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
            {maxDist} meters
          </div>
          <span style={{ fontSize: "11px", color: "#475569" }}>Across Sector 14 Cadastre</span>
        </div>
      </div>

      {/* 3D Transect SVG Profile Chart */}
      <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>3D Elevation & nDSM Building Height Transect</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Cross-sectional profile sampling bare earth (DTM) vs surface structures (DSM) derived from Drone Photogrammetry
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "3px", background: "#b45309", borderRadius: "2px" }} />
              <span style={{ color: "#475569" }}>DTM (Bare Earth)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "3px", background: "#1e3a8a", borderRadius: "2px" }} />
              <span style={{ color: "#475569" }}>DSM (Surface Envelope)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", background: "#e2e8f0", border: "1px solid #64748b", borderRadius: "2px" }} />
              <span style={{ color: "#475569" }}>nDSM Building Mass (H = DSM - DTM)</span>
            </div>
          </div>
        </div>

        {/* SVG Visualization */}
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            {/* Grid Lines */}
            {[580, 585, 590, 595, 600, 605].map((elev) => (
              <g key={elev}>
                <line
                  x1={padding}
                  y1={scaleY(elev)}
                  x2={width - padding}
                  y2={scaleY(elev)}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 8}
                  y={scaleY(elev) + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {elev}m
                </text>
              </g>
            ))}

            {/* Building Columns (nDSM) */}
            {structurePolygons.map((sp, idx) => (
              <rect
                key={idx}
                x={sp.x - 8}
                y={sp.yTop}
                width={16}
                height={Math.max(1, sp.yBottom - sp.yTop)}
                fill="#e2e8f0"
                stroke="#64748b"
                strokeWidth="1.5"
                rx="2"
              />
            ))}

            {/* DTM Line (Ground) */}
            <path d={dtmPath} fill="none" stroke="#b45309" strokeWidth="2.5" />

            {/* DSM Line (Surface) */}
            <path d={dsmPath} fill="none" stroke="#1e3a8a" strokeWidth="2" strokeDasharray="3 2" />

            {/* Interactive Points */}
            {profile.map((p, idx) => (
              <circle
                key={idx}
                cx={scaleX(p.distance_m)}
                cy={scaleY(p.dsm_elevation_m)}
                r={hoveredPoint?.step === p.step ? 6 : 3.5}
                fill={p.ndsm_height_m > 0 ? "#1e3a8a" : "#b45309"}
                stroke="#fff"
                strokeWidth={hoveredPoint?.step === p.step ? 2 : 1}
                style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                onMouseEnter={() => setHoveredPoint(p)}
              />
            ))}
          </svg>
        </div>

        {/* Hovered Point Inspector */}
        {hoveredPoint ? (
          <div style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "#eff6ff",
            borderRadius: "6px",
            border: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Building2 size={16} color="#1e3a8a" />
              <div>
                <strong style={{ color: "#0f172a" }}>{hoveredPoint.feature_label}</strong>
                <span style={{ color: "#475569", marginLeft: "8px" }}>
                  Distance: <strong style={{ color: "#0f172a", fontFamily: "var(--font-mono)" }}>{hoveredPoint.distance_m}m</strong>
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", fontFamily: "var(--font-mono)" }}>
              <span>DTM (Ground): <strong style={{ color: "#b45309" }}>{hoveredPoint.dtm_elevation_m}m</strong></span>
              <span>DSM (Surface): <strong style={{ color: "#1e3a8a" }}>{hoveredPoint.dsm_elevation_m}m</strong></span>
              <span>Height (nDSM): <strong style={{ color: "#15803d" }}>{hoveredPoint.ndsm_height_m}m</strong></span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: "11.5px", marginTop: "10px" }}>
            Hover over any marker on the transect profile to inspect bare earth and structure heights.
          </div>
        )}
      </div>
    </div>
  );
}
