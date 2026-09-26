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
  Map as MapIcon,
  Upload,
  Download,
  Trash2,
  RotateCcw,
  Maximize2,
  Play,
  CheckCircle2,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

export default function MapWorkbench({
  legacyData,
  droneData,
  harmonizedData,
  aiBuildings,
  utilityData,
  muniData,
  corsData,
  conflicts = [],
  onSelectParcel,
  selectedParcel,
  onOpenPassbook,
  onRunPipeline,
  isRunning,
  onOpenImport,
  onClearWorkspace,
  onReloadBenchmark,
  onExportHarmonized,
  currentProject
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
    legacy: true,
    drone: true,
    buildings: true,
    utilities: true,
    muni: true,
    cors: true,
    conflicts: true
  });

  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonOpacity, setComparisonOpacity] = useState(0.4);
  const [cursorCoords, setCursorCoords] = useState({ lat: 12.9350, lon: 77.6250 });

  const hasAnyData = Boolean(legacyData?.features?.length || droneData?.features?.length || harmonizedData?.features?.length || aiBuildings?.features?.length);
  const isHarmonized = Boolean(harmonizedData && harmonizedData.features?.length > 0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.938184, 77.621134],
      zoom: 17,
      zoomControl: false,
      attributionControl: true
    });

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    tileLayerRef.current = osm;

    // Zoom control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Track mouse coordinates
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
      drone: L.layerGroup().addTo(map),
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

  // Switch basemap
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
      newTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
      });
    } else {
      newTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
      });
    }

    newTileLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [basemapType]);

  // Fit bounds helper
  const handleFitExtent = () => {
    if (!mapInstanceRef.current) return;
    const active = harmonizedData || droneData || legacyData;
    if (active?.features?.length > 0) {
      try {
        const geoLayer = L.geoJSON(active);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (err) {
        console.warn("Could not fit bounds:", err);
      }
    }
  };

  // Render Geospatial Layers
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
            fillOpacity: comparisonMode ? comparisonOpacity : 0.08
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

    // 2. Drone Aerial Survey Parcels (5cm UAV Ground Truth Boundaries)
    if (groups.drone) {
      groups.drone.clearLayers();
      if (droneData?.features && layersVisible.drone) {
        L.geoJSON(droneData, {
          style: {
            color: "#0284c7",
            weight: 2,
            fillColor: "#38bdf8",
            fillOpacity: 0.12
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindTooltip(`<b>Drone Survey Parcel: Khasra ${p.khasra_no}</b><br/>Sensor: ${p.sensor || "UAV 5cm GSD"}<br/>Feature: ${p.boundary_type || "Masonry Wall"}`, {
              sticky: true
            });
            layer.on("click", () => onSelectParcel(feature));
          }
        }).addTo(groups.drone);
      }
    }

    // 3. Harmonized Cadastre (Forest Green clean boundary - ONLY when harmonized)
    if (groups.harmonized) {
      groups.harmonized.clearLayers();
      if (harmonizedData?.features && layersVisible.harmonized) {
        L.geoJSON(harmonizedData, {
          style: (feature) => {
            const isSelected = selectedParcel && (selectedParcel.properties?.khasra_no === feature.properties?.khasra_no);
            return {
              color: isSelected ? "#1d4ed8" : "#15803d",
              weight: isSelected ? 3.5 : 2.5,
              fillColor: isSelected ? "#3b82f6" : "#22c55e",
              fillOpacity: isSelected ? 0.35 : 0.22
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindTooltip(`<b>Harmonized Cadastral Parcel: Khasra ${props.khasra_no}</b><br/>Confidence: ${props.confidence_score || 94.2}% (${props.confidence_grade || 'Grade A'})<br/>Status: Statutorily Reconciled`, {
              sticky: true
            });
            layer.on("click", () => onSelectParcel(feature));
          }
        }).addTo(groups.harmonized);
      }
    }

    // 4. AI Building Footprints (Classic Slate / Navy)
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

    // 5. Utility Easements (Crimson & Steel Blue)
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

    // 6. Municipal Master Plan Road (Rust Orange Corridor)
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

    // 7. GNSS CORS Stations (Solid Deep Blue Survey Markers)
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

    // 8. Spatial Conflicts & Encroachment Alerts
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
    droneData,
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

  const toggleLayer = (layerName) => {
    setLayersVisible((prev) => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 128px)", overflow: "hidden" }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

      {/* TOP RIGHT: Dedicated Map Action Toolbar */}
      <div style={{
        position: "absolute",
        top: "14px",
        right: selectedParcel ? "334px" : "14px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "right 0.2s ease"
      }}>
        {/* Upload Custom Survey Button */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            className="btn-primary"
            title="Upload custom GeoJSON or Shapefile parcel boundaries"
            style={{
              padding: "7px 13px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "5px",
              background: "#0f2e5c",
              color: "#ffffff",
              border: "1px solid #0f2e5c",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(15, 46, 92, 0.2)"
            }}
          >
            <Upload size={14} color="#93c5fd" />
            Upload Custom Survey
          </button>
        )}

        {/* Clear Map Button */}
        {onClearWorkspace && (
          <button
            onClick={onClearWorkspace}
            title="Clear all active layers on the map"
            style={{
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: "500",
              borderRadius: "5px",
              background: "#ffffff",
              color: "#b91c1c",
              border: "1px solid #fca5a5",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
            }}
          >
            <Trash2 size={13} color="#dc2626" />
            Clear Map
          </button>
        )}

        {/* Reload Benchmark Sector 48 Button */}
        {onReloadBenchmark && (
          <button
            onClick={onReloadBenchmark}
            title="Restore Sector 48 benchmark survey"
            style={{
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: "500",
              borderRadius: "5px",
              background: "#ffffff",
              color: "#0369a1",
              border: "1px solid #bae6fd",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
            }}
          >
            <RotateCcw size={13} color="#0284c7" />
            Load Sector 48
          </button>
        )}

        {/* Fit Extent Button */}
        <button
          onClick={handleFitExtent}
          title="Zoom to parcel extent"
          style={{
            padding: "7px 9px",
            fontSize: "12px",
            borderRadius: "5px",
            background: "#ffffff",
            color: "#475569",
            border: "1px solid #cbd5e1",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
          }}
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Top Center Engineering State Banner */}
      <div style={{
        position: "absolute",
        top: "14px",
        left: "320px",
        zIndex: 999,
        maxWidth: "520px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)"
      }}>
        {!hasAnyData ? (
          <div style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            fontSize: "12px",
            color: "#475569"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FolderOpen size={15} color="#0f2e5c" style={{ flexShrink: 0 }} />
              <span>Workspace is empty. Click <strong>Upload Custom Survey</strong> or <strong>Load Sector 48</strong>.</span>
            </div>
          </div>
        ) : !isHarmonized ? (
          <div style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            fontSize: "12px",
            color: "#92400e"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0 }} />
              <span>
                <strong>Raw Multi-Source Survey Loaded:</strong> 1998 Paper Cadastre vs 2026 UAV Drone Survey.
              </span>
            </div>
            <button
              onClick={onRunPipeline}
              disabled={isRunning}
              style={{
                background: "#0f2e5c",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: isRunning ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0
              }}
            >
              <Play size={10} fill="#ffffff" />
              Harmonize
            </button>
          </div>
        ) : (
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            fontSize: "12px",
            color: "#166534"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>
                <strong>Harmonization Complete:</strong> {harmonizedData.features?.length || 9} Parcels Reconciled.
              </span>
            </div>
            {onExportHarmonized && (
              <button
                onClick={onExportHarmonized}
                style={{
                  background: "#166534",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 9px",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0
                }}
              >
                <Download size={11} />
                Export
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-Source Layers Control Panel (Left floating) */}
      <div className="glass-panel" style={{
        position: "absolute",
        top: "14px",
        left: "14px",
        zIndex: 1000,
        width: "295px",
        padding: "14px",
        background: "#ffffff",
        maxHeight: "calc(100vh - 165px)",
        overflowY: "auto"
      }}>
        {/* Panel Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Layers size={15} color="#0f2e5c" />
            <h3 style={{ fontSize: "12.5px", fontWeight: "700", color: "#0f2e5c", margin: 0 }}>
              Multi-Source Layers
            </h3>
          </div>
          <span style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
            {hasAnyData ? "8 Sources" : "Empty"}
          </span>
        </div>

        {/* Basemap Switcher */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>Basemap:</span>
          <div style={{ display: "flex", gap: "3px" }}>
            {[
              { id: "osm", label: "Street" },
              { id: "satellite", label: "Satellite" },
              { id: "topo", label: "Topo" }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setBasemapType(b.id)}
                style={{
                  padding: "2px 7px",
                  fontSize: "10.5px",
                  borderRadius: "3px",
                  border: basemapType === b.id ? "1px solid #0f2e5c" : "1px solid #e2e8f0",
                  background: basemapType === b.id ? "#eff6ff" : "#ffffff",
                  color: basemapType === b.id ? "#0f2e5c" : "#475569",
                  cursor: "pointer",
                  fontWeight: basemapType === b.id ? "600" : "400"
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layer Switches */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {/* Harmonized Cadastre */}
          <div 
            onClick={() => isHarmonized && toggleLayer("harmonized")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 8px",
              borderRadius: "4px",
              background: layersVisible.harmonized && isHarmonized ? "#f0fdf4" : "transparent",
              cursor: isHarmonized ? "pointer" : "default",
              fontSize: "11.5px",
              opacity: isHarmonized ? 1 : 0.6
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#15803d" }} />
              <span style={{ color: isHarmonized ? "#0f172a" : "#64748b", fontWeight: isHarmonized ? "600" : "400" }}>
                Harmonized Cadastre
              </span>
            </div>
            {isHarmonized ? (
              layersVisible.harmonized ? <Eye size={13} color="#15803d" /> : <EyeOff size={13} color="#94a3b8" />
            ) : (
              <span style={{ fontSize: "9.5px", background: "#fef3c7", color: "#b45309", padding: "1px 5px", borderRadius: "3px" }}>
                Pending Run
              </span>
            )}
          </div>

          <LayerRow 
            label="Legacy Cadastre (1998)" 
            color="#b45309" 
            active={layersVisible.legacy} 
            onToggle={() => toggleLayer("legacy")} 
          />
          <LayerRow 
            label="Drone Aerial Parcels (5cm)" 
            color="#0284c7" 
            active={layersVisible.drone} 
            onToggle={() => toggleLayer("drone")} 
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
            color="#991b1b" 
            active={layersVisible.conflicts} 
            onToggle={() => toggleLayer("conflicts")} 
          />
        </div>

        {/* Comparison / Swipe Slider */}
        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
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

        {/* DEDICATED DATA MANAGEMENT SECTION AT BOTTOM OF PANEL */}
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "7px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Survey Data Management
          </div>

          {/* Full-width Upload Button */}
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              style={{
                width: "100%",
                padding: "7px 10px",
                fontSize: "11.5px",
                fontWeight: "600",
                borderRadius: "4px",
                background: "#0f2e5c",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer"
              }}
            >
              <Upload size={13} color="#93c5fd" />
              Upload Custom Survey (GeoJSON)
            </button>
          )}

          {/* Side-by-side Clear and Reload */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {onClearWorkspace && (
              <button
                onClick={onClearWorkspace}
                style={{
                  padding: "6px 8px",
                  fontSize: "11px",
                  fontWeight: "500",
                  borderRadius: "4px",
                  background: "#ffffff",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  cursor: "pointer"
                }}
              >
                <Trash2 size={12} color="#dc2626" />
                Clear Map
              </button>
            )}
            {onReloadBenchmark && (
              <button
                onClick={onReloadBenchmark}
                style={{
                  padding: "6px 8px",
                  fontSize: "11px",
                  fontWeight: "500",
                  borderRadius: "4px",
                  background: "#ffffff",
                  color: "#0369a1",
                  border: "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  cursor: "pointer"
                }}
              >
                <RotateCcw size={12} color="#0284c7" />
                Restore Sector 48
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Coordinate & Reference Box (Bottom Left) */}
      <div className="glass-panel" style={{
        position: "absolute",
        bottom: "14px",
        left: "14px",
        zIndex: 1000,
        padding: "6px 12px",
        fontSize: "11px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        fontFamily: "var(--font-mono)",
        color: "#475569",
        background: "#ffffff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Compass size={13} color="#0f2e5c" />
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
          width: "310px",
          padding: "14px 16px",
          background: "#ffffff"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>
                Parcel Attributes
              </span>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f2e5c", margin: "2px 0 0 0" }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px" }}>
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
          <div style={{ marginTop: "10px", padding: "8px 10px", background: "#f8fafc", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "10.5px", color: "#64748b" }}>Harmonization Confidence</span>
              <span style={{ fontSize: "11.5px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "#166534" }}>
                {selectedParcel.properties?.confidence_score || 94.2}% ({selectedParcel.properties?.confidence_grade || "Grade A"})
              </span>
            </div>
            <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
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
            style={{ width: "100%", marginTop: "10px", justifyContent: "center", padding: "6px", fontSize: "11.5px" }}
            onClick={() => onOpenPassbook(selectedParcel.properties?.khasra_no || "104")}
          >
            <FileCheck size={14} />
            Generate Digital Land Passbook
          </button>
        </div>
      ) : null}
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
        padding: "5px 8px",
        borderRadius: "4px",
        background: active ? "#f8fafc" : "transparent",
        cursor: "pointer",
        fontSize: "11.5px",
        transition: "background 0.15s ease"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
        <span style={{ color: active ? "#0f172a" : "#94a3b8", fontWeight: active ? "500" : "400" }}>{label}</span>
      </div>
      {active ? <Eye size={13} color="#0f2e5c" /> : <EyeOff size={13} color="#94a3b8" />}
    </div>
  );
}

function AttributeRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "2px" }}>
      <span style={{ color: "#64748b" }}>{label}:</span>
      <span style={{ fontWeight: "600", color: "#0f172a" }}>{value}</span>
    </div>
  );
}
