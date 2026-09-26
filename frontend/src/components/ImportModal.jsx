import React, { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, Layers } from "lucide-react";

export default function ImportModal({ isOpen, onClose, onImportData }) {
  const [file, setFile] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [layerType, setLayerType] = useState("legacy");
  const [error, setError] = useState(null);
  const [featureSummary, setFeatureSummary] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.features && parsed.type !== "Feature" && parsed.type !== "FeatureCollection") {
          throw new Error("Invalid GeoJSON: Must contain a Feature or FeatureCollection.");
        }
        const features = parsed.features || [parsed];
        setGeoJsonData(parsed);
        setFeatureSummary({
          count: features.length,
          types: Array.from(new Set(features.map(f => f.geometry?.type || "Unknown"))).join(", ")
        });
      } catch (err) {
        setError(`Failed to parse GeoJSON file: ${err.message}`);
        setGeoJsonData(null);
        setFeatureSummary(null);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmImport = () => {
    if (!geoJsonData) return;
    onImportData(layerType, geoJsonData, file?.name || "custom_survey.geojson");
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.55)",
      backdropFilter: "blur(4px)",
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
        maxWidth: "520px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        border: "1px solid #cbd5e1",
        overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 20px",
          background: "#0f2e5c",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Upload size={18} color="#93c5fd" />
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>
                Import Custom Survey Dataset
              </h3>
              <p style={{ fontSize: "11px", color: "#bfdbfe", margin: "2px 0 0 0" }}>
                Add local GeoJSON parcel boundaries, drone polygons, or utility lines
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "4px",
              display: "flex"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px" }}>
          {/* Target Layer Category */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
              Target Cadastral Layer Category:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { id: "legacy", label: "Legacy Cadastre", desc: "1998 Paper/Revenue Map" },
                { id: "drone", label: "Drone Aerial Parcels", desc: "5cm UAV Boundary Polygons" },
                { id: "buildings", label: "Building Footprints", desc: "Deep Learning Rooftops" },
                { id: "utility", label: "Utility Network", desc: "Statutory Easement Lines" }
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setLayerType(opt.id)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: layerType === opt.id ? "2px solid #0f2e5c" : "1px solid #cbd5e1",
                    background: layerType === opt.id ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{opt.label}</div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* File Upload Drop Zone */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
              Select GeoJSON / JSON File:
            </label>
            <label style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
              border: "2px dashed #94a3b8",
              borderRadius: "6px",
              background: "#f8fafc",
              cursor: "pointer",
              transition: "border-color 0.15s ease"
            }}>
              <Upload size={28} color="#64748b" style={{ marginBottom: "8px" }} />
              <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#0f2e5c" }}>
                Click to browse or drop file here
              </span>
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                Supports standard .geojson, .json format (WGS84 EPSG:4326)
              </span>
              <input 
                type="file" 
                accept=".geojson,.json,application/json" 
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Validation Feedback */}
          {error && (
            <div style={{
              padding: "10px 12px",
              borderRadius: "5px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px"
            }}>
              <AlertCircle size={15} color="#dc2626" />
              <span>{error}</span>
            </div>
          )}

          {featureSummary && (
            <div style={{
              padding: "10px 12px",
              borderRadius: "5px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px"
            }}>
              <CheckCircle size={15} color="#16a34a" />
              <span>
                <strong>{file?.name}</strong>: Validated {featureSummary.count} features ({featureSummary.types}) ready to render.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "12px 20px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px"
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              borderRadius: "4px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#475569",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!geoJsonData}
            style={{
              padding: "6px 16px",
              fontSize: "12px",
              borderRadius: "4px",
              background: geoJsonData ? "#0f2e5c" : "#94a3b8",
              border: "none",
              color: "#ffffff",
              fontWeight: "600",
              cursor: geoJsonData ? "pointer" : "not-allowed"
            }}
          >
            Import to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
