import React from "react";
import { 
  Map, 
  Cpu, 
  AlertTriangle, 
  FileSpreadsheet, 
  Mountain, 
  FileCheck2,
  Compass,
  GitCompare
} from "lucide-react";

export default function Navigation({ activeTab, setActiveTab, conflictCount = 0 }) {
  const tabs = [
    { id: "map", label: "Cadastral Map Workbench", icon: Map, color: "#0f2e5c" },
    { id: "georef", label: "GCP Georeferencing", icon: Compass, color: "#0369a1" },
    { id: "pipeline", label: "Harmonization Pipeline", icon: Cpu, color: "#1e40af" },
    { id: "matching", label: "Boundary Conformance & Hausdorff", icon: GitCompare, color: "#475569" },
    { 
      id: "conflicts", 
      label: "Spatial Discrepancies & Easements", 
      icon: AlertTriangle, 
      color: "#b45309",
      badge: conflictCount > 0 ? conflictCount : null 
    },
    { id: "attributes", label: "Record of Rights (RoR) Ledger", icon: FileSpreadsheet, color: "#15803d" },
    { id: "elevation", label: "3D Elevation & DSM Transect", icon: Mountain, color: "#0f766e" },
    { id: "passbook", label: "Certified Passbook & Exports", icon: FileCheck2, color: "#0f2e5c" }
  ];

  return (
    <nav style={{
      margin: "8px 16px 0 16px",
      display: "flex",
      gap: "4px",
      borderBottom: "1px solid #cbd5e1",
      paddingBottom: "6px",
      overflowX: "auto"
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px 13px",
              borderRadius: "4px",
              border: isActive ? "1px solid #cbd5e1" : "1px solid transparent",
              background: isActive ? "#ffffff" : "transparent",
              color: isActive ? "#0f2e5c" : "#64748b",
              boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: isActive ? "600" : "500",
              whiteSpace: "nowrap",
              transition: "all 0.12s ease"
            }}
          >
            <Icon size={14} color={isActive ? tab.color : "#64748b"} />
            <span>{tab.label}</span>

            {tab.badge && (
              <span style={{
                background: "#b91c1c",
                color: "#ffffff",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: "700",
                padding: "1px 5px",
                borderRadius: "3px"
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
