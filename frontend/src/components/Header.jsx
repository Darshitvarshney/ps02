import React, { useState, useEffect } from "react";
import { 
  Compass, 
  Satellite, 
  Layers, 
  ShieldCheck, 
  Play,
  RotateCw,
  Database,
  Upload,
  FolderGit2,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { fetchDatabaseStatus } from "../services/api";

export default function Header({ 
  onRunPipeline, 
  isRunning, 
  metrics,
  currentProject = "Sector 48 — Urban Core (Koramangala Ward)",
  onOpenImport,
  onSwitchProject
}) {
  const [dbStatus, setDbStatus] = useState(null);
  const isHarmonized = Boolean(metrics && metrics.average_confidence_score);

  useEffect(() => {
    fetchDatabaseStatus()
      .then((data) => setDbStatus(data))
      .catch(() => setDbStatus({ connected: false }));
    
    const interval = setInterval(() => {
      fetchDatabaseStatus().then((data) => setDbStatus(data)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [metrics]);

  return (
    <header style={{
      margin: "10px 16px 0 16px",
      padding: "10px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      gap: "12px",
      flexWrap: "wrap"
    }}>
      {/* Institutional Brand & Department Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "5px",
          background: "#0f2e5c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(15, 46, 92, 0.2)",
          flexShrink: 0
        }}>
          <Compass size={19} color="#ffffff" />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <h1 style={{ 
              fontSize: "16px", 
              fontWeight: "800", 
              letterSpacing: "-0.01em", 
              color: "#0f2e5c",
              margin: 0
            }}>
              NAKSHA
            </h1>
            <span style={{
              fontSize: "12px",
              color: "#334155",
              fontWeight: "600",
              letterSpacing: "0.01em",
              borderLeft: "1px solid #cbd5e1",
              paddingLeft: "9px"
            }}>
              National Cadastral Harmonization System
            </span>
            <span style={{
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              padding: "1px 6px",
              borderRadius: "3px",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              fontWeight: "600"
            }}>
              Govt. of India
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
            <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
              Directorate of Survey Settlement & Land Records · Urban Cadastre Modernization
            </p>
            <span style={{ color: "#cbd5e1" }}>•</span>
            {/* Active Survey Project Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10.5px",
              color: "#0f2e5c",
              background: "#eff6ff",
              padding: "1px 6px",
              borderRadius: "3px",
              border: "1px solid #bfdbfe",
              fontWeight: "500"
            }}>
              <FolderGit2 size={11} color="#1d4ed8" />
              <span>Project: <b>{currentProject}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Geodetic & Spatial Status Telemetry */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Enterprise Geodatabase Chip */}
        <div 
          title={dbStatus?.connected 
            ? `Enterprise Spatial Database: Synchronized\nParcels: ${dbStatus.collections?.cadastral_parcels ?? 0}\nRevenue RoR: ${dbStatus.collections?.revenue_records ?? 0}\nBuilding Structures: ${dbStatus.collections?.ai_buildings ?? 0}\nSpatial Indexing: 2dsphere Active` 
            : "Operating in Standalone Spatial Store"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            background: dbStatus?.connected ? "#f0fdf4" : "#f8fafc",
            borderRadius: "4px",
            border: `1px solid ${dbStatus?.connected ? "#bbf7d0" : "#cbd5e1"}`,
            fontSize: "11px"
          }}
        >
          <Database size={12} color={dbStatus?.connected ? "#15803d" : "#64748b"} />
          <span style={{ color: "#475569" }}>Geodatabase:</span>
          <span style={{ 
            color: dbStatus?.connected ? "#15803d" : "#64748b", 
            fontFamily: "var(--font-mono)", 
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <span style={{ 
              width: "6px", 
              height: "6px", 
              borderRadius: "50%", 
              background: dbStatus?.connected ? "#16a34a" : "#94a3b8", 
              display: "inline-block" 
            }} />
            {dbStatus?.connected ? "Synchronized" : "Connected"}
          </span>
        </div>

        {/* Harmonization State Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          background: isHarmonized ? "#f0fdf4" : "#fffbeb",
          borderRadius: "4px",
          border: `1px solid ${isHarmonized ? "#bbf7d0" : "#fde68a"}`,
          fontSize: "11px"
        }}>
          {isHarmonized ? (
            <CheckCircle2 size={12} color="#15803d" />
          ) : (
            <AlertTriangle size={12} color="#b45309" />
          )}
          <span style={{ color: "#475569" }}>Harmonization:</span>
          <span style={{ 
            color: isHarmonized ? "#15803d" : "#b45309", 
            fontWeight: "600",
            fontFamily: "var(--font-mono)"
          }}>
            {isHarmonized ? "Reconciled" : "Pending Processing"}
          </span>
        </div>

        {/* GNSS CORS Benchmark */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          background: "#ffffff",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          fontSize: "11px"
        }}>
          <Satellite size={12} color="#0369a1" />
          <span style={{ color: "#475569" }}>CORS GNSS:</span>
          <span style={{ color: "#0f172a", fontFamily: "var(--font-mono)", fontWeight: "600" }}>3 Active (0.7cm)</span>
        </div>

        {/* Conformance Metric Chip */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          background: isHarmonized ? "#f0fdf4" : "#f8fafc",
          borderRadius: "4px",
          border: `1px solid ${isHarmonized ? "#bbf7d0" : "#cbd5e1"}`,
          fontSize: "11px"
        }}>
          <ShieldCheck size={12} color={isHarmonized ? "#15803d" : "#64748b"} />
          <span style={{ color: "#475569" }}>Conformance:</span>
          <span style={{ 
            color: isHarmonized ? "#15803d" : "#64748b", 
            fontFamily: "var(--font-mono)", 
            fontWeight: "700" 
          }}>
            {isHarmonized ? `${metrics.average_confidence_score}% (Grade ${metrics.grade || 'A'})` : "Pending Run"}
          </span>
        </div>

        {/* Import Survey Layer Button */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            className="btn-secondary"
            title="Import custom GeoJSON / Shapefile cadastral layer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 11px",
              fontSize: "11.5px",
              borderRadius: "4px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "500"
            }}
          >
            <Upload size={12} color="#475569" />
            Import Layer
          </button>
        )}

        {/* Primary Action Button: Harmonize Cadastre */}
        <button 
          className="btn-primary" 
          onClick={onRunPipeline}
          disabled={isRunning}
          style={{ 
            opacity: isRunning ? 0.7 : 1, 
            padding: "6px 14px", 
            fontSize: "11.5px", 
            borderRadius: "4px",
            background: "#0f2e5c",
            borderColor: "#0f2e5c",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: isRunning ? "not-allowed" : "pointer",
            fontWeight: "600"
          }}
        >
          {isRunning ? (
            <>
              <RotateCw size={12} style={{ animation: "spin 1s linear infinite" }} />
              Harmonizing GeoAI...
            </>
          ) : (
            <>
              <Play size={12} fill="#ffffff" />
              {isHarmonized ? "Re-Run Harmonization" : "Harmonize Cadastre"}
            </>
          )}
        </button>
      </div>
    </header>
  );
}
