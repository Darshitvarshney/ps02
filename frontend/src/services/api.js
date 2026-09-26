export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    console.warn("Backend not reached, using local mode:", err);
    return { status: "offline" };
  }
}

export async function fetchDataset(datasetName) {
  const res = await fetch(`${API_BASE}/datasets/${datasetName}`);
  if (!res.ok) throw new Error(`Failed to load dataset ${datasetName}`);
  return await res.json();
}

export async function runHarmonizationPipeline(config = {}) {
  const res = await fetch(`${API_BASE}/harmonize/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error("Harmonization pipeline failed");
  return await res.json();
}

export async function fetchLastHarmonization() {
  const res = await fetch(`${API_BASE}/harmonize/last-result`);
  if (!res.ok) throw new Error("Failed to fetch last harmonized cadastre");
  return await res.json();
}

export async function resolveConflict(conflictId, chosenOption, notes = "") {
  const res = await fetch(`${API_BASE}/conflicts/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conflict_id: conflictId,
      chosen_option: chosenOption,
      user_notes: notes
    })
  });
  if (!res.ok) throw new Error("Conflict resolution failed");
  return await res.json();
}

export async function fetchElevationTransect(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/elevation/transect?${query}`);
  if (!res.ok) throw new Error("Failed to fetch elevation transect");
  return await res.json();
}

export async function fetchLandPassbook(khasraNo) {
  const res = await fetch(`${API_BASE}/export/passbook/${khasraNo}`);
  if (!res.ok) throw new Error(`Failed to fetch passbook for Khasra ${khasraNo}`);
  return await res.json();
}

export async function fetchDatabaseStatus() {
  try {
    const res = await fetch(`${API_BASE}/database/status`);
    if (!res.ok) return { connected: false };
    return await res.json();
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

export async function fetchSpatialMatch() {
  const res = await fetch(`${API_BASE}/spatial-match`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to run spatial match");
  return await res.json();
}

export async function fetchGeoreferenceDefault(method = "affine") {
  const res = await fetch(`${API_BASE}/georeference/default?method=${method}`);
  if (!res.ok) throw new Error("Failed to fetch georeference defaults");
  return await res.json();
}

export async function fetchAuditReport() {
  const res = await fetch(`${API_BASE}/export/audit-report`);
  if (!res.ok) throw new Error("Failed to fetch audit report");
  return await res.json();
}

export async function fetchInterdepartmentalExchange() {
  const res = await fetch(`${API_BASE}/export/interdepartmental-exchange`);
  if (!res.ok) throw new Error("Failed to fetch exchange package");
  return await res.json();
}

export async function fetchAttributeReconciliation() {
  const res = await fetch(`${API_BASE}/attribute-reconcile`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch attribute reconciliation");
  return await res.json();
}

