import React, { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X, Layers, Sparkles, Code, FileArchive } from "lucide-react";

export default function ImportModal({ isOpen, onClose, onImportData }) {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "paste" | "samples"
  const [file, setFile] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [rawText, setRawText] = useState("");
  const [layerType, setLayerType] = useState("legacy");
  const [error, setError] = useState(null);
  const [featureSummary, setFeatureSummary] = useState(null);

  if (!isOpen) return null;

  const validateAndSetData = (parsed, sourceName) => {
    try {
      if (!parsed.features && parsed.type !== "Feature" && parsed.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON: Must contain a Feature or FeatureCollection.");
      }
      const features = parsed.features || [parsed];
      setGeoJsonData(parsed);
      setFeatureSummary({
        sourceName,
        count: features.length,
        types: Array.from(new Set(features.map(f => f.geometry?.type || "Unknown"))).join(", ")
      });
      setError(null);
    } catch (err) {
      setError(`Validation failed: ${err.message}`);
      setGeoJsonData(null);
      setFeatureSummary(null);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);

    // If zip (Shapefile archive)
    if (selectedFile.name.endsWith(".zip")) {
      setError("Note: Shapefile archives (.zip) must contain a .shp or converted .geojson. For direct browser processing, please upload the exported .geojson or .json format.");
      setGeoJsonData(null);
      setFeatureSummary(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        validateAndSetData(parsed, selectedFile.name);
      } catch (err) {
        setError(`Failed to parse file: ${err.message}`);
        setGeoJsonData(null);
        setFeatureSummary(null);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(selectedFile);
  };

  const handleParseText = () => {
    if (!rawText.trim()) return;
    try {
      const parsed = JSON.parse(rawText);
      validateAndSetData(parsed, "Pasted GeoJSON");
    } catch (err) {
      setError(`Invalid JSON syntax: ${err.message}`);
    }
  };

  // Sample pre-configured test survey layers for one-click testing
  const loadSampleDataset = (sampleKey) => {
    setError(null);
    let sampleData;
    let label;

    if (sampleKey === "ward12") {
      label = "Ward 12 Suburban Cadastre (12 Parcels)";
      sampleData = {
        type: "FeatureCollection",
        features: Array.from({ length: 12 }, (_, i) => {
          const k = 201 + i;
          const r = Math.floor(i / 4);
          const c = i % 4;
          const lon = 77.6200 + c * 0.0010;
          const lat = 12.9360 + r * 0.0009;
          return {
            type: "Feature",
            id: `WARD12-KHASRA-${k}`,
            geometry: {
              type: "Polygon",
              coordinates: [[
                [lon, lat],
                [lon + 0.0009, lat],
                [lon + 0.0009, lat + 0.0008],
                [lon, lat + 0.0008],
                [lon, lat]
              ]]
            },
            properties: {
              khasra_no: String(k),
              owner_name: `Cadastral Allottee ${k}`,
              recorded_area_sqm: 4180 + i * 25,
              tenure_type: "Private Freehold",
              source: "Ward 12 Sub-Registrar Survey (2026)"
            }
          };
        })
      };
      setLayerType("legacy");
    } else if (sampleKey === "drone_uhi") {
      label = "UAV 5cm Drone Physical Survey Polygons";
      sampleData = {
        type: "FeatureCollection",
        features: Array.from({ length: 8 }, (_, i) => {
          const k = 301 + i;
          const c = i % 4;
          const r = Math.floor(i / 4);
          const lon = 77.6205 + c * 0.00095;
          const lat = 12.9365 + r * 0.00085;
          return {
            type: "Feature",
            id: `DRONE-PARCEL-${k}`,
            geometry: {
              type: "Polygon",
              coordinates: [[
                [lon, lat],
                [lon + 0.0009, lat],
                [lon + 0.0009, lat + 0.0008],
                [lon, lat + 0.0008],
                [lon, lat]
              ]]
            },
            properties: {
              khasra_no: String(k),
              sensor: "DJI Matrice 350 RTK / 5cm GSD",
              boundary_type: "Physical RCC Compound Wall",
              extraction_confidence: 0.98
            }
          };
        })
      };
      setLayerType("drone");
    } else {
      label = "High-Voltage Transmission Easement Corridor";
      sampleData = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "UTILITY-HV-220KV",
            geometry: {
              type: "LineString",
              coordinates: [
                [77.6190, 12.9375],
                [77.6240, 12.9372],
                [77.6280, 12.9368]
              ]
            },
            properties: {
              name: "220kV State Grid Transmission Line",
              utility_type: "Electricity",
              buffer_m: 17.5,
              voltage_kv: 220
            }
          }
        ]
      };
      setLayerType("utility");
    }

    validateAndSetData(sampleData, label);
  };

  const handleConfirmImport = () => {
    if (!geoJsonData) return;
    onImportData(layerType, geoJsonData, featureSummary?.sourceName || file?.name || "custom_survey.geojson");
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.6)",
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
        maxWidth: "560px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
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
                Upload Custom Survey Dataset
              </h3>
              <p style={{ fontSize: "11px", color: "#bfdbfe", margin: "2px 0 0 0" }}>
                Import GeoJSON parcel boundaries, Shapefiles, or test preloaded survey wards
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

        {/* Tab navigation inside modal */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: "0 20px"
        }}>
          {[
            { id: "file", label: "Upload File (.geojson / .shp)", icon: Upload },
            { id: "samples", label: "One-Click Test Datasets", icon: Sparkles },
            { id: "paste", label: "Paste Raw GeoJSON", icon: Code }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: active ? "600" : "500",
                  color: active ? "#0f2e5c" : "#64748b",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? "2px solid #0f2e5c" : "2px solid transparent",
                  cursor: "pointer",
                  marginBottom: "-1px"
                }}
              >
                <Icon size={13} color={active ? "#0f2e5c" : "#64748b"} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: "18px 20px" }}>
          {/* Target Layer Category */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
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
                    padding: "8px 12px",
                    borderRadius: "5px",
                    border: layerType === opt.id ? "2px solid #0f2e5c" : "1px solid #cbd5e1",
                    background: layerType === opt.id ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>{opt.label}</div>
                  <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* TAB 1: File Upload */}
          {activeTab === "file" && (
            <div style={{ marginBottom: "14px" }}>
              <label style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "22px 16px",
                border: "2px dashed #94a3b8",
                borderRadius: "6px",
                background: "#f8fafc",
                cursor: "pointer"
              }}>
                <Upload size={26} color="#0f2e5c" style={{ marginBottom: "6px" }} />
                <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#0f2e5c" }}>
                  Select or drag & drop survey file
                </span>
                <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                  Accepts .geojson, .json (EPSG:4326 WGS-84). Shapefiles (.shp) can be converted or zipped.
                </span>
                <input 
                  type="file" 
                  accept=".geojson,.json,application/json,.zip" 
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}

          {/* TAB 2: One-Click Test Datasets */}
          {activeTab === "samples" && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11.5px", color: "#475569", marginBottom: "8px" }}>
                Click any of these preloaded real-world survey datasets to instantly test custom layer rendering:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { key: "ward12", title: "Ward 12 Suburban Cadastre", desc: "12 agricultural/suburban land parcels ready for harmonization." },
                  { key: "drone_uhi", title: "DJI Matrice 350 RTK Drone Survey", desc: "8 high-resolution 5cm compound walls extracted via computer vision." },
                  { key: "utility_line", title: "220kV High-Voltage Transmission Corridor", desc: "Statutory 17.5m easement buffer intersecting private holdings." }
                ].map((s) => (
                  <div
                    key={s.key}
                    onClick={() => loadSampleDataset(s.key)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f2e5c" }}>{s.title}</div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{s.desc}</div>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: "4px 9px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "#0f2e5c",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                    >
                      Load Sample
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Paste Raw GeoJSON */}
          {activeTab === "paste" && (
            <div style={{ marginBottom: "14px" }}>
              <textarea
                rows={5}
                placeholder='Paste FeatureCollection JSON here: {"type": "FeatureCollection", "features": [...]}'
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  padding: "8px 10px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box"
                }}
              />
              <button
                type="button"
                onClick={handleParseText}
                style={{
                  marginTop: "6px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: "#0f2e5c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Parse & Validate GeoJSON
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: "9px 12px",
              borderRadius: "5px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "11.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px"
            }}>
              <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Validated Summary */}
          {featureSummary && (
            <div style={{
              padding: "9px 12px",
              borderRadius: "5px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: "11.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px"
            }}>
              <CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>
                <strong>{featureSummary.sourceName}</strong>: Successfully loaded {featureSummary.count} features ({featureSummary.types}).
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
            Import to Map Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
