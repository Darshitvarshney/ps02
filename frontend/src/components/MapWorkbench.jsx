import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Crosshair, 
  FileCheck, 
  Info, 
  Compass,
  Map as MapIcon
} from "lucide-react";

export default function MapWorkbench({
  legacyData,
  harmonizedData,
  aiBuildings,
  utilityData,
  muniData,
  corsData,
  conflicts,
  onSelectParcel,
  selectedParcel,
  onOpenPassbook
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupsRef = useRef({});
  const tileLayerRef = useRef(null);

  // Basemap selection (100% free, no API key needed)
  const [basemapType, setBasemapType] = useState("osm");

  // Layer visibility toggles
  const [layersVisible, setLayersVisible] = useState({
    harmonized: true,
    legacy: false,
    buildings: true,
    utilities: true,
    muni: true,
    cors: true,
    conflicts: true
  });

  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonOpacity, setComparisonOpacity] = useState(0.4);
  const [cursorCoords, setCursorCoords] = useState({ lat: 12.9350, lon: 77.6250 });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9350, 77.6250],
      zoom: 17,
      zoomControl: false,
      attributionControl: true
    });

    // 100% freely available OpenStreetMap tile layer (No API key needed!)
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    tileLayerRef.current = osm;

    // Zoom control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Track mouse coordinate
    map.on("mousemove", (e) => {
      setCursorCoords({
        lat: parseFloat(e.latlng.lat.toFixed(6)),
        lon: parseFloat(e.latlng.lng.toFixed(6))
      });
    });

    mapInstanceRef.current = map;

    // Create layer groups
    layerGroupsRef.current = {
      legacy: L.layerGroup().addTo(map),
      harmonized: L.layerGroup().addTo(map),
      buildings: L.layerGroup().addTo(map),
      utilities: L.layerGroup().addTo(map),
      muni: L.layerGroup().addTo(map),
      cors: L.layerGroup().addTo(map),
      conflicts: L.layerGroup().addTo(map)
    };

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch freely available basemap
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let newTileLayer;
    if (basemapType === "osm") {
      newTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      });
    } else if (basemapType === "satellite") {
      // Free keyless Esri World Imagery
      newTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
      });
    } else {
      // Esri World Topo Map (Free, keyless)
      newTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
      });
    }

    newTileLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [basemapType]);

  // Update Layers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const groups = layerGroupsRef.current;

    // 1. Legacy Cadastral (Warm Amber / Ochre dashed boundary)
    if (groups.legacy) {
      groups.legacy.clearLayers();
      if (legacyData?.features && layersVisible.legacy) {
        L.geoJSON(legacyData, {
          style: {
            color: "#b45309",
            weight: 2,
            dashArray: "6, 4",
            fillColor: "#d97706",
            fillOpacity: comparisonMode ? comparisonOpacity : 0.12
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindTooltip(`<b>Legacy Khasra ${props.khasra_no}</b><br/>Area: ${props.recorded_area_sqm} sqm<br/>Source: 1998 Paper Cadastre`, {
              sticky: true
            });
            layer.on("click", () => onSelectParcel(feature));
          }
        }).addTo(groups.legacy);
      }
    }

    // 2. Harmonized Cadastre (Forest Green clean boundary)
    if (groups.harmonized) {
      groups.harmonized.clearLayers();
      const activeData = harmonizedData || legacyData;
      if (activeData?.features && layersVisible.harmonized) {
        L.geoJSON(activeData, {
          style: (feature) => {
            const isSelected = selectedParcel && (selectedParcel.properties?.khasra_no === feature.properties?.khasra_no);
            return {
              color: isSelected ? "#1d4ed8" : "#166534",
              weight: isSelected ? 3 : 2,
              fillColor: isSelected ? "#3b82f6" : "#22c55e",
              fillOpacity: isSelected ? 0.35 : 0.18
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindTooltip(`<b>Harmonized Khasra ${props.khasra_no}</b><br/>Confidence: ${props.confidence_score || 94}% (${props.confidence_grade || 'Grade A'})`, {
              sticky: true
            });
            layer.on("click", () => onSelectParcel(feature));
          }
        }).addTo(groups.harmonized);
      }
    }

    // 3. AI Building Footprints (Classic Slate / Navy)
    if (groups.buildings) {
      groups.buildings.clearLayers();
      if (aiBuildings?.features && layersVisible.buildings) {
        L.geoJSON(aiBuildings, {
          style: {
            color: "#334155",
            weight: 1.5,
            fillColor: "#475569",
            fillOpacity: 0.35
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindTooltip(`<b>Building ${p.building_id}</b><br/>Floors: ${p.floors} (${p.ndsm_height_m}m height)<br/>Roof: ${p.roof_type}`, {
              sticky: true
            });
          }
        }).addTo(groups.buildings);
      }
    }

    // 4. Utility Easements (Crimson & Steel Blue)
    if (groups.utilities) {
      groups.utilities.clearLayers();
      if (utilityData?.features && layersVisible.utilities) {
        L.geoJSON(utilityData, {
          style: (feature) => {
            const isPower = feature.properties?.utility_type === "Electricity";
            return {
              color: isPower ? "#b91c1c" : "#0284c7",
              weight: 3,
              dashArray: isPower ? "8, 4" : "4, 4"
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindTooltip(`<b>${p.name}</b><br/>Statutory Buffer: ${p.buffer_m}m RoW`, { sticky: true });
          }
        }).addTo(groups.utilities);
      }
    }

    // 5. Municipal Master Plan Road (Rust Orange Corridor)
    if (groups.muni) {
      groups.muni.clearLayers();
      if (muniData?.features && layersVisible.muni) {
        L.geoJSON(muniData, {
          style: (feature) => {
            if (feature.geometry.type === "LineString") {
              return { color: "#c2410c", weight: 3.5 };
            }
            return { color: "#9a3412", weight: 1, fillOpacity: 0.04 };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindTooltip(`<b>${p.name}</b><br/>Statutory Setback Corridor`, { sticky: true });
          }
        }).addTo(groups.muni);
      }
    }

    // 6. GNSS CORS Stations (Solid Deep Blue Survey Markers)
    if (groups.cors) {
      groups.cors.clearLayers();
      if (corsData?.features && layersVisible.cors) {
        corsData.features.forEach((feat) => {
          const [lon, lat] = feat.geometry.coordinates;
          const p = feat.properties;
          const marker = L.circleMarker([lat, lon], {
            radius: 7,
            fillColor: "#1d4ed8",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          });
          marker.bindTooltip(`<b>CORS Station: ${p.station_code}</b><br/>Receiver: ${p.receiver}<br/>Accuracy: ${p.accuracy_h_cm}cm (Horizontal)`, {
            sticky: true
          });
          marker.addTo(groups.cors);
        });
      }
    }

    // 7. Spatial Conflicts (Deep Brick Red Warning Zones)
    if (groups.conflicts) {
      groups.conflicts.clearLayers();
      if (conflicts && layersVisible.conflicts) {
        conflicts.forEach((c) => {
          if (c.evidence_geometry) {
            L.geoJSON(c.evidence_geometry, {
              style: {
                color: "#991b1b",
                weight: 2,
                fillColor: "#dc2626",
                fillOpacity: 0.45
              }
            }).bindTooltip(`<b>⚠️ ${c.title}</b><br/>Disputed Area: ${c.disputed_area_sqm} sqm<br/>Recommended Action: ${c.recommended_action}`, {
              sticky: true
            }).addTo(groups.conflicts);
          }
        });
      }
    }

  }, [
    legacyData,
    harmonizedData,
    aiBuildings,
    utilityData,
    muniData,
    corsData,
    conflicts,
    layersVisible,
    comparisonMode,
    comparisonOpacity,
    selectedParcel
  ]);

  const toggleLayer = (layerKey) => {
    setLayersVisible((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const resetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([12.9350, 77.6250], 17);
    }
  };

  return (
    <div style={{ position: "relative", height: "calc(100vh - 145px)", margin: "12px 16px" }}>
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ width: "100%", height: "100%", borderRadius: "10px", border: "1px solid #cbd5e1" }} 
      />

      {/* Floating Layer Controls Panel (Left side) */}
      <div className="glass-panel" style={{
        position: "absolute",
        top: "14px",
        left: "14px",
        zIndex: 1000,
        width: "270px",
        padding: "14px 16px",
        background: "#ffffff"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>
            <Layers size={16} color="#1e3a8a" />
            <span>Multi-Source Layers</span>
          </div>
          <button 
            onClick={resetView} 
            title="Reset Map Extent"
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <Crosshair size={14} />
          </button>
        </div>

        {/* Basemap Switcher */}
        <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px" }}>
          <span style={{ color: "#64748b" }}>Basemap:</span>
          <div style={{ display: "flex", gap: "3px" }}>
            <button
              onClick={() => setBasemapType("osm")}
              style={{
                padding: "2px 7px",
                fontSize: "10.5px",
                borderRadius: "4px",
                border: basemapType === "osm" ? "1px solid #1e3a8a" : "1px solid #e2e8f0",
                background: basemapType === "osm" ? "#eff6ff" : "#ffffff",
                color: basemapType === "osm" ? "#1e3a8a" : "#475569",
                cursor: "pointer",
                fontWeight: basemapType === "osm" ? "600" : "400"
              }}
            >
              Street
            </button>
            <button
              onClick={() => setBasemapType("satellite")}
              style={{
                padding: "2px 7px",
                fontSize: "10.5px",
                borderRadius: "4px",
                border: basemapType === "satellite" ? "1px solid #1e3a8a" : "1px solid #e2e8f0",
                background: basemapType === "satellite" ? "#eff6ff" : "#ffffff",
                color: basemapType === "satellite" ? "#1e3a8a" : "#475569",
                cursor: "pointer",
                fontWeight: basemapType === "satellite" ? "600" : "400"
              }}
            >
              Satellite
            </button>
            <button
              onClick={() => setBasemapType("topo")}
              style={{
                padding: "2px 7px",
                fontSize: "10.5px",
                borderRadius: "4px",
                border: basemapType === "topo" ? "1px solid #1e3a8a" : "1px solid #e2e8f0",
                background: basemapType === "topo" ? "#eff6ff" : "#ffffff",
                color: basemapType === "topo" ? "#1e3a8a" : "#475569",
                cursor: "pointer",
                fontWeight: basemapType === "topo" ? "600" : "400"
              }}
            >
              Topo
            </button>
          </div>
        </div>

        {/* Layer Switches */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <LayerRow 
            label="Harmonized Cadastre" 
            color="#166534" 
            active={layersVisible.harmonized} 
            onToggle={() => toggleLayer("harmonized")} 
          />
          <LayerRow 
            label="Legacy Cadastre (1998)" 
            color="#b45309" 
            active={layersVisible.legacy} 
            onToggle={() => toggleLayer("legacy")} 
          />
          <LayerRow 
            label="Extracted Building Footprints" 
            color="#334155" 
            active={layersVisible.buildings} 
            onToggle={() => toggleLayer("buildings")} 
          />
          <LayerRow 
            label="Utility Network Easements" 
            color="#b91c1c" 
            active={layersVisible.utilities} 
            onToggle={() => toggleLayer("utilities")} 
          />
          <LayerRow 
            label="Municipal Road Corridor" 
            color="#c2410c" 
            active={layersVisible.muni} 
            onToggle={() => toggleLayer("muni")} 
          />
          <LayerRow 
            label="GNSS CORS Stations & GCPs" 
            color="#1d4ed8" 
            active={layersVisible.cors} 
            onToggle={() => toggleLayer("cors")} 
          />
          <LayerRow 
            label="Spatial Conflicts & Alerts" 
            color="#991b1c" 
            active={layersVisible.conflicts} 
            onToggle={() => toggleLayer("conflicts")} 
          />
        </div>

        {/* Comparison / Swipe Slider */}
        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px" }}>
            <span style={{ color: "#475569" }}>Legacy Boundary Blend</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "#b45309", fontWeight: "600" }}>{Math.round(comparisonOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={comparisonOpacity}
            onChange={(e) => {
              setComparisonOpacity(parseFloat(e.target.value));
              setComparisonMode(true);
              setLayersVisible(prev => ({ ...prev, legacy: true }));
            }}
            style={{ width: "100%", marginTop: "4px", accentColor: "#b45309", cursor: "pointer" }}
          />
        </div>
      </div>

      {/* Coordinate & Reference Box (Bottom Left) */}
      <div className="glass-panel" style={{
        position: "absolute",
        bottom: "14px",
        left: "14px",
        zIndex: 1000,
        padding: "6px 12px",
        fontSize: "11.5px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        fontFamily: "var(--font-mono)",
        color: "#475569",
        background: "#ffffff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Compass size={14} color="#1e3a8a" />
          <span>CRS: <strong style={{ color: "#0f172a" }}>EPSG:4326 (WGS84)</strong></span>
        </div>
        <span>LAT: <strong style={{ color: "#0f172a" }}>{cursorCoords.lat}</strong></span>
        <span>LON: <strong style={{ color: "#0f172a" }}>{cursorCoords.lon}</strong></span>
      </div>

      {/* Selected Parcel Inspector Panel (Right side) */}
      {selectedParcel ? (
        <div className="glass-panel" style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1000,
          width: "320px",
          padding: "16px 18px",
          background: "#ffffff"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>
                Parcel Attributes
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e3a8a" }}>
                Khasra No. {selectedParcel.properties?.khasra_no || "N/A"}
              </h3>
            </div>
            <button 
              onClick={() => onSelectParcel(null)}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
            <AttributeRow label="Khata / Revenue Ledger" value={selectedParcel.properties?.khata_no || "Khata #18"} />
            <AttributeRow label="Recorded Area (RoR)" value={`${selectedParcel.properties?.recorded_area_sqm || 4220} sqm`} />
            <AttributeRow 
              label="Surveyed Area (Orthophoto)" 
              value={`${selectedParcel.properties?.calculated_area_sqm || selectedParcel.properties?.recorded_area_sqm || 4220} sqm`} 
            />
            <AttributeRow label="Tenure Type" value={selectedParcel.properties?.tenure_type || "Freehold Private"} />
            <AttributeRow label="Land Use" value={selectedParcel.properties?.ai_land_use || "Mixed Residential"} />
          </div>

          {/* Confidence Gauge */}
          <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Harmonization Confidence</span>
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#166534" }}>
                {selectedParcel.properties?.confidence_score || 94.2}% ({selectedParcel.properties?.confidence_grade || "Grade A"})
              </span>
            </div>
            <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ 
                height: "100%", 
                width: `${selectedParcel.properties?.confidence_score || 94.2}%`, 
                background: "#166534" 
              }} />
            </div>
          </div>

          {/* Action to view Certified Land Passbook */}
          <button 
            className="btn-primary" 
            style={{ width: "100%", marginTop: "12px", justifyContent: "center" }}
            onClick={() => onOpenPassbook(selectedParcel.properties?.khasra_no || "104")}
          >
            <FileCheck size={16} />
            Generate Digital Land Passbook
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1000,
          padding: "8px 14px",
          fontSize: "12px",
          color: "#475569",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#ffffff"
        }}>
          <Info size={14} color="#1e3a8a" />
          <span>Click any parcel boundary to inspect verified cadastral attributes</span>
        </div>
      )}
    </div>
  );
}

function LayerRow({ label, color, active, onToggle }) {
  return (
    <div 
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderRadius: "4px",
        background: active ? "#f8fafc" : "transparent",
        cursor: "pointer",
        fontSize: "12px",
        transition: "background 0.15s ease"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
        <span style={{ color: active ? "#0f172a" : "#94a3b8", fontWeight: active ? "500" : "400" }}>{label}</span>
      </div>
      {active ? <Eye size={14} color="#1e3a8a" /> : <EyeOff size={14} color="#94a3b8" />}
    </div>
  );
}

function AttributeRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "3px" }}>
      <span style={{ color: "#64748b" }}>{label}:</span>
      <span style={{ fontWeight: "600", color: "#0f172a" }}>{value}</span>
    </div>
  );
}
