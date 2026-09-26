import React, { useState, useEffect } from "react";
import { 
  Compass, 
  Satellite, 
  Layers, 
  ShieldCheck, 
  Play,
  RotateCw,
  Database
} from "lucide-react";
import { fetchDatabaseStatus } from "../services/api";

export default function Header({ 
  onRunPipeline, 
  isRunning, 
  metrics 
}) {
  const [dbStatus, setDbStatus] = useState(null);

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
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
    }}>
      {/* Institutional Brand & Department Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "5px",
          background: "#0f2e5c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(15, 46, 92, 0.2)"
        }}>
          <Compass size={20} color="#ffffff" />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ 
              fontSize: "17px", 
              fontWeight: "800", 
              letterSpacing: "-0.01em", 
              color: "#0f2e5c"
            }}>
              NAKSHA
            </h1>
            <span style={{
              fontSize: "12px",
              color: "#334155",
              fontWeight: "600",
              letterSpacing: "0.01em",
              borderLeft: "1px solid #cbd5e1",
              paddingLeft: "10px"
            }}>
              National Cadastral Harmonization System
            </span>
            <span style={{
              background: "#f8fafc",
              color: "#475569",
              border: "1px solid #cbd5e1",
              padding: "1px 6px",
              borderRadius: "3px",
              fontSize: "10.5px",
              fontFamily: "var(--font-mono)",
              fontWeight: "600"
            }}>
              Govt. of India
            </span>
          </div>

          <p style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>
            Directorate of Survey Settlement & Land Records · Urban Cadastre Modernization
          </p>
        </div>
      </div>

      {/* Geodetic & Spatial Status Telemetry */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Enterprise Geodatabase Chip */}
        <div 
          title={dbStatus?.connected 
            ? `Enterprise Spatial Database: Synchronized\nParcels: ${dbStatus.collections?.cadastral_parcels ?? 0}\nRevenue RoR: ${dbStatus.collections?.revenue_records ?? 0}\nBuilding Structures: ${dbStatus.collections?.ai_buildings ?? 0}\nSpatial Indexing: 2dsphere Active` 
            : "Connecting to Enterprise Geodatabase..."}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "5px 10px",
            background: dbStatus?.connected ? "#f0fdf4" : "#f8fafc",
            borderRadius: "4px",
            border: `1px solid ${dbStatus?.connected ? "#bbf7d0" : "#cbd5e1"}`,
            fontSize: "11.5px"
          }}
        >
          <Database size={13} color={dbStatus?.connected ? "#15803d" : "#64748b"} />
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
            {dbStatus?.connected ? "Synchronized" : "Connecting..."}
          </span>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "5px 10px",
          background: "#ffffff",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          fontSize: "11.5px"
        }}>
          <Satellite size={13} color="#0369a1" />
          <span style={{ color: "#475569" }}>CORS GNSS:</span>
          <span style={{ color: "#0f172a", fontFamily: "var(--font-mono)", fontWeight: "600" }}>3 Active (0.7cm)</span>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "5px 10px",
          background: "#ffffff",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          fontSize: "11.5px"
        }}>
          <Layers size={13} color="#475569" />
          <span style={{ color: "#475569" }}>Orthophoto:</span>
          <span style={{ color: "#0f172a", fontFamily: "var(--font-mono)", fontWeight: "600" }}>5cm GSD</span>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "5px 10px",
          background: "#ffffff",
          borderRadius: "4px",
          border: "1px solid #cbd5e1",
          fontSize: "11.5px"
        }}>
          <ShieldCheck size={13} color="#15803d" />
          <span style={{ color: "#475569" }}>Conformance:</span>
          <span style={{ color: "#15803d", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
            {metrics?.average_confidence_score ? `${metrics.average_confidence_score}%` : "—"}
          </span>
        </div>

        {/* Primary Action Button */}
        <button 
          className="btn-primary" 
          onClick={onRunPipeline}
          disabled={isRunning}
          style={{ 
            opacity: isRunning ? 0.7 : 1, 
            padding: "6px 14px", 
            fontSize: "12px", 
            borderRadius: "4px",
            background: "#0f2e5c",
            borderColor: "#0f2e5c"
          }}
        >
          {isRunning ? (
            <>
              <RotateCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              Harmonizing...
            </>
          ) : (
            <>
              <Play size={13} fill="#ffffff" />
              Harmonize Cadastre
            </>
          )}
        </button>
      </div>
    </header>
  );
}
