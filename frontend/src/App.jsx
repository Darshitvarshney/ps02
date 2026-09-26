import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import MapWorkbench from "./components/MapWorkbench";
import GeoreferencingWorkbench from "./components/GeoreferencingWorkbench";
import PipelineWorkbench from "./components/PipelineWorkbench";
import SpatialMatchWorkbench from "./components/SpatialMatchWorkbench";
import ConflictWorkbench from "./components/ConflictWorkbench";
import AttributeWorkbench from "./components/AttributeWorkbench";
import ElevationWorkbench from "./components/ElevationWorkbench";
import PassbookModal from "./components/PassbookModal";
import ImportModal from "./components/ImportModal";
import HarmonizationProgressModal from "./components/HarmonizationProgressModal";
import { 
  fetchDataset, 
  runHarmonizationPipeline, 
  resolveConflict,
  fetchAuditReport,
  fetchInterdepartmentalExchange
} from "./services/api";
import { Download, FileText, Share2, Award } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [passbookKhasra, setPassbookKhasra] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState("Sector 48 — Urban Core (Koramangala Ward)");

  // Geospatial Multi-Source Datasets
  const [legacyData, setLegacyData] = useState(null);
  const [droneData, setDroneData] = useState(null);
  const [harmonizedData, setHarmonizedData] = useState(null);
  const [aiBuildings, setAiBuildings] = useState(null);
  const [utilityData, setUtilityData] = useState(null);
  const [muniData, setMuniData] = useState(null);
  const [corsData, setCorsData] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [revenueRecords, setRevenueRecords] = useState([]);

  // Initial Data Load (Loads source survey layers without pre-baking harmonization)
  useEffect(() => {
    loadAllDatasets();
  }, []);

  const loadAllDatasets = async () => {
    try {
      const [legacy, drone, buildings, utility, muni, cors, rev] = await Promise.all([
        fetchDataset("legacy"),
        fetchDataset("drone"),
        fetchDataset("buildings"),
        fetchDataset("utility"),
        fetchDataset("muni"),
        fetchDataset("cors"),
        fetchDataset("revenue")
      ]);

      setLegacyData(legacy);
      setDroneData(drone);
      setAiBuildings(buildings);
      setUtilityData(utility);
      setMuniData(muni);
      setCorsData(cors);
      if (rev?.records) setRevenueRecords(rev.records);

      // In a real product, harmonization is executed on-demand, not pre-baked
      setHarmonizedData(null);
      setConflicts([]);
      setMetrics(null);
    } catch (err) {
      console.warn("Could not load backend datasets, using simulated fallback:", err);
    }
  };

  const handleRunPipeline = async (customParams = {}) => {
    setIsProgressModalOpen(true);
    setIsRunning(true);
    try {
      const res = await runHarmonizationPipeline({
        apply_georeferencing: true,
        apply_topology_clean: true,
        apply_ai_spatial_match: true,
        apply_attribute_reconciliation: true,
        apply_conflict_resolution: true,
        apply_confidence_scoring: true,
        ...customParams
      });

      if (res) {
        setHarmonizedData(res.harmonized_cadastre);
        setConflicts(res.conflicts || []);
        setMetrics(res.summary_metrics);
      }
    } catch (err) {
      console.error("Failed to run harmonization pipeline:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleImportLayer = (layerType, geoJsonObj, fileName) => {
    if (layerType === "legacy") {
      setLegacyData(geoJsonObj);
    } else if (layerType === "drone") {
      setDroneData(geoJsonObj);
    } else if (layerType === "buildings") {
      setAiBuildings(geoJsonObj);
    } else if (layerType === "utility") {
      setUtilityData(geoJsonObj);
    }
    setCurrentProject(`Custom Survey (${fileName})`);
    // Reset harmonized state so user harmonizes their newly imported survey data
    setHarmonizedData(null);
    setMetrics(null);
    setActiveTab("map");
  };

  const handleClearWorkspace = () => {
    setLegacyData(null);
    setDroneData(null);
    setHarmonizedData(null);
    setAiBuildings(null);
    setUtilityData(null);
    setMuniData(null);
    setConflicts([]);
    setMetrics(null);
    setCurrentProject("Blank Workspace (Awaiting Import)");
  };

  const handleReloadBenchmark = () => {
    setCurrentProject("Sector 48 — Urban Core (Koramangala Ward)");
    loadAllDatasets();
  };

  const handleExportHarmonized = () => {
    const dataToExport = harmonizedData || legacyData;
    if (!dataToExport) return;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Harmonized_Cadastre_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
  };

  const handleResolveConflict = async (conflictId, chosenOption, notes) => {
    try {
      await resolveConflict(conflictId, chosenOption, notes);
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId
            ? { ...c, resolved: true, resolution_applied: `${chosenOption}: ${notes || "Statutory Precedence Enforced"}` }
            : c
        )
      );
      if (metrics) {
        setMetrics((prev) => ({
          ...prev,
          conflicts_resolved: (prev?.conflicts_resolved || 0) + 1
        }));
      }
    } catch (err) {
      console.error("Error resolving conflict:", err);
    }
  };

  const handleDownloadAuditReport = async () => {
    try {
      const data = await fetchAuditReport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NAKSHA_Cadastral_Audit_Report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (err) {
      console.error("Audit export failed:", err);
    }
  };

  const handleDownloadExchangePackage = async () => {
    try {
      const data = await fetchInterdepartmentalExchange();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Interdepartmental_Cadastre_Exchange_Package.json`;
      a.click();
    } catch (err) {
      console.error("Package export failed:", err);
    }
  };

  const conflictCount = (conflicts || []).filter(c => !c.resolved).length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Header
        onRunPipeline={() => handleRunPipeline()}
        isRunning={isRunning}
        metrics={metrics}
        currentProject={currentProject}
        onOpenImport={() => setIsImportModalOpen(true)}
      />

      {/* Navigation Tabs */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        conflictCount={conflictCount}
      />

      {/* Tab Views */}
      <main style={{ flex: 1 }}>
        {activeTab === "map" && (
          <MapWorkbench
            legacyData={legacyData}
            droneData={droneData}
            harmonizedData={harmonizedData}
            aiBuildings={aiBuildings}
            utilityData={utilityData}
            muniData={muniData}
            corsData={corsData}
            conflicts={conflicts}
            selectedParcel={selectedParcel}
            onSelectParcel={setSelectedParcel}
            onOpenPassbook={(khasra) => setPassbookKhasra(khasra)}
            onRunPipeline={() => handleRunPipeline()}
            isRunning={isRunning}
            onOpenImport={() => setIsImportModalOpen(true)}
            onClearWorkspace={handleClearWorkspace}
            onReloadBenchmark={handleReloadBenchmark}
            onExportHarmonized={handleExportHarmonized}
            currentProject={currentProject}
          />
        )}

        {activeTab === "georef" && (
          <GeoreferencingWorkbench />
        )}

        {activeTab === "pipeline" && (
          <PipelineWorkbench
            pipelineResult={{ summary_metrics: metrics }}
            onRunPipeline={handleRunPipeline}
            isRunning={isRunning}
          />
        )}

        {activeTab === "matching" && (
          <SpatialMatchWorkbench />
        )}

        {activeTab === "conflicts" && (
          <ConflictWorkbench
            conflicts={conflicts}
            onResolveConflict={handleResolveConflict}
          />
        )}

        {activeTab === "attributes" && (
          <AttributeWorkbench
            records={revenueRecords.length > 0 ? revenueRecords : null}
            onSelectKhasra={() => {
              setActiveTab("map");
            }}
            onOpenPassbook={(khasra) => setPassbookKhasra(khasra)}
          />
        )}

        {activeTab === "elevation" && (
          <ElevationWorkbench />
        )}

        {activeTab === "passbook" && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Top Export Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <FileText size={20} color="#1e3a8a" />
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Compliance Audit Report</h3>
                </div>
                <p style={{ fontSize: "12px", color: "#475569", marginBottom: "14px" }}>
                  Complete sector validation ledger covering topology, georeferencing RMSE, conflicts, and quality distribution.
                </p>
                <button className="btn-primary" onClick={handleDownloadAuditReport} style={{ width: "100%", justifyContent: "center" }}>
                  <Download size={14} />
                  Download Audit Report (JSON)
                </button>
              </div>

              <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <Share2 size={20} color="#0369a1" />
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Inter-Departmental Exchange</h3>
                </div>
                <p style={{ fontSize: "12px", color: "#475569", marginBottom: "14px" }}>
                  Standardized OGC LADM GeoJSON bundle for Revenue, Municipal Urban Local Bodies, and Utility Boards.
                </p>
                <button className="btn-secondary" onClick={handleDownloadExchangePackage} style={{ width: "100%", justifyContent: "center" }}>
                  <Download size={14} />
                  Export Multi-Dept Package
                </button>
              </div>

              <div className="glass-panel" style={{ padding: "20px", background: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <Award size={20} color="#15803d" />
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Digital Land Passbook</h3>
                </div>
                <p style={{ fontSize: "12px", color: "#475569", marginBottom: "14px" }}>
                  Official Record of Rights certificate with cryptographic QR verification stamp and geodetic datum.
                </p>
                <button className="btn-secondary" onClick={() => setPassbookKhasra("104")} style={{ width: "100%", justifyContent: "center" }}>
                  <Award size={14} />
                  Preview Sample (Khasra 104)
                </button>
              </div>
            </div>

            {/* Embedded Certificate Viewer */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
              <PassbookModal
                khasraNo={passbookKhasra || "104"}
                onClose={() => setActiveTab("map")}
              />
            </div>
          </div>
        )}
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportData={handleImportLayer}
      />

      {/* Harmonization Progress Stepper Modal */}
      <HarmonizationProgressModal
        isOpen={isProgressModalOpen}
        isRunning={isRunning}
        metrics={metrics}
        onComplete={() => setIsProgressModalOpen(false)}
      />

      {/* Modal if active on another tab */}
      {passbookKhasra && activeTab !== "passbook" && (
        <PassbookModal
          khasraNo={passbookKhasra}
          onClose={() => setPassbookKhasra(null)}
        />
      )}
    </div>
  );
}
