import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  previewContract, startTeeSession, getTeeSessionStatus,
  downloadTeeSessionOutput, terminateTeeSession,
} from "../api/workloads";
import {
  listAvailableDatasets, listAvailableInfrastructure, getInfrastructureDetails,
} from "../api/roleRequests";
import ContractPreviewModal from "../components/ContractPreviewModal";
import {
  Database, Search, Server, Play, X, HardDrive, FileText, ChevronDown, ShieldCheck,
  CheckCircle2, AlertCircle, Download, Loader2, RefreshCw, Square,
} from "lucide-react";

// How often to poll gov_layer for the TEE session's status once started.
const TEE_SESSION_POLL_MS = 5000;

// Statuses where the session is still in flight and worth polling.
const TEE_SESSION_ACTIVE = new Set(["provisioning", "attesting", "running"]);

const TEE_SESSION_LABELS = {
  provisioning: "Starting the confidential VM (cold boot can take a minute)…",
  attesting: "Verifying TEE attestation…",
  running: "Running anonymisation in the enclave…",
};

// One field row in the infra details panel — skips rendering when there's
// nothing to show, so absent/unregistered fields (e.g. GPU today) collapse
// away instead of leaving an empty value.
function DetailField({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

// Expanded detail panel for one infra row — the registered platform/capacity/
// attestation info behind `infra`'s summary row. `details` is the
// `rules.infrastructure` block from getInfrastructureDetails, or null if
// nothing more was registered.
function InfraDetails({ infra, details }) {
  const platform = details?.platform || {};
  const capacity = details?.capacity || {};
  const attestation = details?.attestation || {};
  const provider = infra.provider || platform.provider;

  return (
    <>
      <div className="grid">
        <DetailField label="Cloud Provider" value={provider ? provider.toUpperCase() : "Not specified"} />
        <DetailField label="Region" value={infra.region || "Not specified"} />
        <DetailField label="Deployment Model" value={platform.deployment_model} />
        <DetailField label="Execution Environment" value={platform.execution_environment} />
        <DetailField label="CPU" value={capacity.cpu_cores ? `${capacity.cpu_cores} vCPU` : "Not specified"} />
        <DetailField label="RAM" value={capacity.ram_mb ? `${(capacity.ram_mb / 1024).toFixed(1)} GB` : "Not specified"} />
        <DetailField label="GPU" value={capacity.gpu || "Not specified"} />
        <DetailField label="Storage" value={capacity.storage_gb ? `${capacity.storage_gb} GB` : undefined} />
        <DetailField label="Node Count" value={capacity.node_count} />
        <DetailField label="SGX Nodes" value={capacity.sgx_node_count} />
        <DetailField label="Max Concurrent Jobs" value={capacity.max_concurrent_jobs} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div className="label">Attestation</div>
        {attestation.required ? (
          <span className="cpm-badge cpm-badge--signed">
            <ShieldCheck size={12} /> Required{attestation.service ? ` · ${attestation.service}` : ""}
          </span>
        ) : (
          <span className="cpm-badge cpm-badge--pending">Not required</span>
        )}
      </div>
      {!details && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-light)" }}>
          No additional details registered for this infrastructure.
        </div>
      )}
    </>
  );
}

export default function WorkloadForm() {
  const { isAdmin, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";
  // FL vs SMPC is chosen on the dashboard the user came from, not here.
  const technique = location.state?.technique;
  // Infrastructure selection (InfraCat) only applies to SMPC — Spider/FL/TEE
  // never show or require it.
  const isSMPCTechnique = technique === "SMPC";

  // Redirect admins
  useEffect(() => {
    if (isAdmin) navigate("/app/admin", { replace: true });
  }, [isAdmin]);

  // Catalogue state
  // SMPC only: which catalogue tab is active. Datasets/TEE/FL never see tabs
  // at all, so this only matters when isSMPCTechnique is true.
  const [activeTab, setActiveTab] = useState("dataset");
  // Each tab keeps its own independent search term.
  const [datasetSearchQuery, setDatasetSearchQuery] = useState("");
  const [infraSearchQuery, setInfraSearchQuery] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState(null);

  // Real, registered datasets (from APD via aaa's /available-datasets) — each
  // a {id, name} pair (id is the real item_id a by-item policy lookup needs;
  // name is what's shown). No catalogue metadata (category/description/
  // size/etc.) exists for these yet.
  const [datasetList, setDatasetList] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [datasetsError, setDatasetsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDatasets() {
      setDatasetsLoading(true);
      setDatasetsError(null);
      try {
        const data = await listAvailableDatasets(token);
        if (!cancelled) {
          setDatasetList(Array.isArray(data?.datasets) ? data.datasets : []);
        }
      } catch (err) {
        if (!cancelled) setDatasetsError(err.message || "Failed to load datasets");
      } finally {
        if (!cancelled) setDatasetsLoading(false);
      }
    }
    if (token) loadDatasets();
    return () => { cancelled = true; };
  }, [token]);

  // Infrastructure Catalogue (InfraCat) — registered infra-provider policies,
  // SMPC only. Mirrors the dataset-loading effect above.
  const [selectedInfraId, setSelectedInfraId] = useState(null);
  const [infraList, setInfraList] = useState([]);
  const [infraLoading, setInfraLoading] = useState(true);
  const [infraError, setInfraError] = useState(null);
  // Which infra rows have their "expand for details" panel open — independent
  // of selectedInfraId, so a user can compare several without picking one.
  const [expandedInfraIds, setExpandedInfraIds] = useState(new Set());
  // Lazily-fetched, per-item detail cache: { [item_id]: { loading?, data?, error? } }.
  const [infraDetailsCache, setInfraDetailsCache] = useState({});

  useEffect(() => {
    if (!isSMPCTechnique) return undefined;
    let cancelled = false;
    async function loadInfrastructure() {
      setInfraLoading(true);
      setInfraError(null);
      try {
        const data = await listAvailableInfrastructure(token);
        if (!cancelled) {
          setInfraList(Array.isArray(data?.infrastructure) ? data.infrastructure : []);
        }
      } catch (err) {
        if (!cancelled) setInfraError(err.message || "Failed to load infrastructure");
      } finally {
        if (!cancelled) setInfraLoading(false);
      }
    }
    if (token) loadInfrastructure();
    return () => { cancelled = true; };
  }, [isSMPCTechnique, token]);

  // Workload state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [showContractPreview, setShowContractPreview] = useState(false);

  // TEE session lifecycle: null (not started) | { sessionId, status, error }
  // status: "provisioning"|"attesting"|"running"|"complete"|"failed"|"terminated"
  const [teeSession, setTeeSession] = useState(null);
  const [datasetUrl, setDatasetUrl] = useState("");
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  // Filtered lists
  const filteredDatasetList = useMemo(() => {
    const q = datasetSearchQuery.toLowerCase();
    return datasetList.filter(d => !q || d.name.toLowerCase().includes(q));
  }, [datasetList, datasetSearchQuery]);

  const filteredInfraList = useMemo(() => {
    const q = infraSearchQuery.toLowerCase();
    return infraList.filter(infra => {
      if (!q) return true;
      const haystack = `${infra.name || ""} ${infra.region || ""} ${infra.item_id || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [infraList, infraSearchQuery]);

  const handleDatasetSelect = (id) => {
    setSelectedDatasetId(prev => prev === id ? null : id);
  };

  const selectedDataset = useMemo(
    () => datasetList.find(d => d.id === selectedDatasetId) || null,
    [datasetList, selectedDatasetId]
  );

  const handleInfraSelect = (itemId) => {
    setSelectedInfraId(prev => prev === itemId ? null : itemId);
  };

  const toggleInfraDetails = (itemId) => {
    setExpandedInfraIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
    // Fetch once per item, on first expand — re-toggling reuses the cache.
    if (infraDetailsCache[itemId] !== undefined) return;
    setInfraDetailsCache(prev => ({ ...prev, [itemId]: { loading: true } }));
    getInfrastructureDetails(token, itemId)
      .then(res => {
        setInfraDetailsCache(prev => ({ ...prev, [itemId]: { data: res?.infrastructure || null } }));
      })
      .catch(err => {
        setInfraDetailsCache(prev => ({ ...prev, [itemId]: { error: err.message || "Failed to load details" } }));
      });
  };

  const selectedInfra = useMemo(
    () => infraList.find(i => i.item_id === selectedInfraId) || null,
    [infraList, selectedInfraId]
  );

  const handleGenerateContract = async () => {
    if (!selectedDatasetId || !technique) return;
    if (isSMPCTechnique && !selectedInfraId) return;
    setError(null);
    setGeneratedContract(null);
    setTeeSession(null);
    setDownloadError(null);
    setIsGenerating(true);
    try {
      if (!token) throw new Error("MISSING_AUTH_TOKEN");
      const res = await previewContract(token, {
        datasetId: selectedDatasetId,
        datasetName: selectedDataset?.name,
        technique,
        infraId: selectedInfraId,
      });
      const contract = res?.contract || null;
      setGeneratedContract(contract);
      // Policies set on the "Set Policy" page can carry a data URL for the
      // dataset — prefill the run form with it so the consumer doesn't have
      // to re-type a URL the provider already declared.
      setDatasetUrl(contract?.parties?.data_providers?.[0]?.data_url || "");
    } catch (err) {
      setError(err.message || "Contract generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunTee = async () => {
    if (!datasetUrl) return;
    setDownloadError(null);
    setIsStartingRun(true);
    try {
      const res = await startTeeSession(token, {
        datasetUrl,
        datasetId: selectedDatasetId,
        datasetName: selectedDataset?.name,
      });
      setTeeSession({ sessionId: res.sessionId, status: res.status || "provisioning", error: null });
    } catch (err) {
      setTeeSession({ sessionId: null, status: "failed", error: err.message || "Failed to start TEE session" });
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleDownloadResult = async () => {
    if (!teeSession?.sessionId) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadTeeSessionOutput(token, teeSession.sessionId);
    } catch (err) {
      setDownloadError(err.message || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTerminate = async () => {
    if (!teeSession?.sessionId) return;
    setIsTerminating(true);
    try {
      await terminateTeeSession(token, teeSession.sessionId);
      setTeeSession(prev => (prev ? { ...prev, status: "terminated" } : prev));
    } catch (err) {
      setDownloadError(err.message || "Terminate failed");
    } finally {
      setIsTerminating(false);
    }
  };

  // Poll gov_layer for the session's status while it's still in flight.
  useEffect(() => {
    if (!teeSession?.sessionId || !TEE_SESSION_ACTIVE.has(teeSession.status)) return undefined;
    const interval = setInterval(async () => {
      try {
        const status = await getTeeSessionStatus(token, teeSession.sessionId);
        setTeeSession(prev =>
          prev?.sessionId === status.sessionId
            ? { ...prev, status: status.status, error: status.error || null }
            : prev
        );
      } catch {
        // Transient poll failure — keep retrying on the next tick.
      }
    }, TEE_SESSION_POLL_MS);
    return () => clearInterval(interval);
  }, [teeSession?.sessionId, teeSession?.status, token]);

  const canRun = selectedDatasetId && technique && (!isSMPCTechnique || selectedInfraId);
  const missingItems = [];
  if (!selectedDatasetId) missingItems.push("dataset");
  if (isSMPCTechnique && !selectedInfraId) missingItems.push("infrastructure");
  if (!technique) missingItems.push("service (go back to Services and start from SMPC or Anonymization)");

  return (
    <div className="cat-layout">
      {/* Left sidebar */}
      <aside className="cat-sidebar">
        <div className="cat-sidebar__header">
          {isSMPCTechnique && activeTab === "infra" ? <HardDrive size={16} /> : <Database size={16} />}
          <span>{isSMPCTechnique && activeTab === "infra" ? "Infrastructure" : "Datasets"}</span>
        </div>
        <div className="cat-sidebar__nav" style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-light)" }}>
          {isSMPCTechnique && activeTab === "infra"
            ? "Registered infrastructure isn't categorized yet — search by name or region instead."
            : "Registered datasets aren't categorized yet — search by name instead."}
        </div>
      </aside>

      {/* Main content */}
      <div className="cat-main">
        {/* Toolbar */}
        <div className="cat-toolbar">
          {isSMPCTechnique && (
            <div className="cat-tabs">
              <button
                type="button"
                className={`cat-tab${activeTab === "dataset" ? " cat-tab--active" : ""}`}
                onClick={() => setActiveTab("dataset")}
              >
                <Database size={14} />
                Datasets
              </button>
              <button
                type="button"
                className={`cat-tab${activeTab === "infra" ? " cat-tab--active" : ""}`}
                onClick={() => setActiveTab("infra")}
              >
                <HardDrive size={14} />
                Infrastructure
              </button>
            </div>
          )}
          <div className="cat-search">
            <Search size={14} className="cat-search__icon" />
            {isSMPCTechnique && activeTab === "infra" ? (
              <input
                className="cat-search__input"
                placeholder="Search infrastructure..."
                value={infraSearchQuery}
                onChange={e => setInfraSearchQuery(e.target.value)}
              />
            ) : (
              <input
                className="cat-search__input"
                placeholder="Search datasets..."
                value={datasetSearchQuery}
                onChange={e => setDatasetSearchQuery(e.target.value)}
              />
            )}
          </div>
          <button
            className="btn btn-secondary cat-back-btn"
            onClick={() => navigate(returnTo)}
          >
            ← Back
          </button>
        </div>

        {/* Content area */}
        <div className="cat-content">
          {isSMPCTechnique && activeTab === "infra" ? (
            /* Infrastructure Catalogue (InfraCat) tab — SMPC only. */
            <div className="cat-list">
              {infraLoading ? (
                <div className="cat-empty">
                  <HardDrive size={40} />
                  <p>Loading infrastructure…</p>
                </div>
              ) : infraError ? (
                <div className="cat-empty">
                  <AlertCircle size={40} />
                  <p>Could not load infrastructure</p>
                  <span>{infraError}</span>
                </div>
              ) : filteredInfraList.length > 0 ? (
                <div className="cat-simple-list">
                  {filteredInfraList.map(infra => {
                    const isSelected = selectedInfraId === infra.item_id;
                    const isExpanded = expandedInfraIds.has(infra.item_id);
                    const detail = infraDetailsCache[infra.item_id];
                    return (
                      <div key={infra.item_id} className={`cat-infra-item${isSelected ? " cat-infra-item--selected" : ""}`}>
                        <div className="cat-infra-item__row">
                          <button
                            type="button"
                            className="cat-infra-item__select"
                            onClick={() => handleInfraSelect(infra.item_id)}
                          >
                            <HardDrive size={16} />
                            <span className="cat-simple-item__name">
                              {infra.name || infra.item_id}
                              {infra.region ? ` — ${infra.region}` : ""}
                            </span>
                            {isSelected && <CheckCircle2 size={15} />}
                          </button>
                          <button
                            type="button"
                            className={`cat-infra-item__expand${isExpanded ? " cat-infra-item__expand--open" : ""}`}
                            onClick={() => toggleInfraDetails(infra.item_id)}
                            title={isExpanded ? "Hide details" : "Show details"}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="cat-infra-item__details">
                            {!detail || detail.loading ? (
                              <div className="cat-status" style={{ justifyContent: "flex-start" }}>
                                <Loader2 size={14} className="spin" />
                                <span>Loading infrastructure details…</span>
                              </div>
                            ) : detail.error ? (
                              <div className="error-message" style={{ fontSize: 13 }}>{detail.error}</div>
                            ) : (
                              <InfraDetails infra={infra} details={detail.data} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="cat-empty">
                  <HardDrive size={40} />
                  <p>No infrastructure registered yet</p>
                  <span>Infrastructure shows up here once an infrastructure provider registers one</span>
                </div>
              )}
            </div>
          ) : (
            /* Dataset tab — default, and the only tab for FL/TEE (no tab bar shown at all). */
            <div className="cat-list">
              {datasetsLoading ? (
                <div className="cat-empty">
                  <Database size={40} />
                  <p>Loading datasets…</p>
                </div>
              ) : datasetsError ? (
                <div className="cat-empty">
                  <AlertCircle size={40} />
                  <p>Could not load datasets</p>
                  <span>{datasetsError}</span>
                </div>
              ) : filteredDatasetList.length > 0 ? (
                <div className="cat-simple-list">
                  {filteredDatasetList.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      className={`cat-simple-item${selectedDatasetId === d.id ? " cat-simple-item--selected" : ""}`}
                      onClick={() => handleDatasetSelect(d.id)}
                    >
                      <Database size={16} />
                      <span className="cat-simple-item__name">{d.name}</span>
                      {selectedDatasetId === d.id && <CheckCircle2 size={15} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="cat-empty">
                  <Database size={40} />
                  <p>No datasets registered yet</p>
                  <span>Datasets show up here once a data provider registers one</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — selection summary */}
      <aside className="cat-summary">
        <div className="cat-summary__header">
          <Server size={16} />
          <span>Workload Configuration</span>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Technique slot */}
        <div className={`cat-slot${technique ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Server size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Service</div>
            {technique
              ? <div className="cat-slot__value">{technique}</div>
              : <div className="cat-slot__placeholder">Not set — start from Services &gt; SMPC or Anonymization</div>
            }
          </div>
        </div>

        {/* Dataset slot */}
        <div className={`cat-slot${selectedDatasetId ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Database size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Dataset</div>
            {selectedDatasetId
              ? <div className="cat-slot__value">{selectedDataset?.name || selectedDatasetId}</div>
              : <div className="cat-slot__placeholder">No dataset selected</div>
            }
          </div>
          {selectedDatasetId && (
            <button className="cat-icon-btn cat-slot__clear" onClick={() => setSelectedDatasetId(null)} title="Clear">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Infrastructure slot — SMPC only */}
        {isSMPCTechnique && (
          <div className={`cat-slot${selectedInfraId ? " cat-slot--filled" : ""}`}>
            <div className="cat-slot__icon">
              <HardDrive size={16} />
            </div>
            <div className="cat-slot__info">
              <div className="cat-slot__label">Infrastructure</div>
              {selectedInfra
                ? <div className="cat-slot__value">{selectedInfra.name || selectedInfra.item_id}</div>
                : <div className="cat-slot__placeholder">No infrastructure selected</div>
              }
            </div>
            {selectedInfraId && (
              <button className="cat-icon-btn cat-slot__clear" onClick={() => setSelectedInfraId(null)} title="Clear">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Status */}
        <div className={`cat-status${canRun ? " cat-status--ready" : ""}`}>
          {canRun
            ? <><CheckCircle2 size={15} /><span>Ready to generate contract</span></>
            : <><AlertCircle size={15} /><span>Select {missingItems.join(", ")} to continue</span></>
          }
        </div>

        {/* Generate button — this only builds and displays a contract. For
            TEE/SMPC it can then be submitted for a run via the button below. */}
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 0 }}
          disabled={!canRun || isGenerating}
          onClick={handleGenerateContract}
        >
          {isGenerating ? (
            "Generating Contract..."
          ) : (
            <><Play size={14} style={{ marginRight: 6 }} />Generate Contract</>
          )}
        </button>

        {generatedContract && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="cat-summary__header" style={{ padding: 0, marginBottom: 10 }}>
              <CheckCircle2 size={16} />
              <span>Generated Contract (preview only — not submitted)</span>
            </div>
            <div className="grid">
              <div>
                <div className="label">Technique</div>
                <div className="value">{generatedContract.technique}</div>
              </div>
              <div>
                <div className="label">Contract ID</div>
                <div className="value" style={{ fontSize: 12, wordBreak: "break-all" }}>{generatedContract.contract_id}</div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => setShowContractPreview(true)}
            >
              <FileText size={14} style={{ marginRight: 6 }} />Preview Contract
            </button>

            {(technique === "TEE" || technique === "SMPC") && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                {(!teeSession || teeSession.status === "failed") && (
                  <>
                    {!datasetUrl && (
                      <div className="error-message" style={{ marginBottom: 10, fontSize: 13 }}>
                        This dataset's policy has no data URL set — go to Set Policy and add one before running.
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      disabled={isStartingRun || !datasetUrl}
                      onClick={handleRunTee}
                    >
                      {isStartingRun ? (
                        <><Loader2 size={14} className="spin" style={{ marginRight: 6 }} />Starting TEE session...</>
                      ) : (
                        <><Play size={14} style={{ marginRight: 6 }} />Run TEE</>
                      )}
                    </button>
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-light)" }}>
                      This starts a real confidential VM — it bills while running.
                    </div>
                    {teeSession?.status === "failed" && (
                      <div className="error-message" style={{ marginTop: 10, fontSize: 13 }}>
                        {teeSession.error || "TEE session failed"}
                      </div>
                    )}
                  </>
                )}

                {teeSession && TEE_SESSION_ACTIVE.has(teeSession.status) && (
                  <>
                    <div className="cat-status" style={{ justifyContent: "flex-start" }}>
                      <Loader2 size={15} className="spin" />
                      <span>{TEE_SESSION_LABELS[teeSession.status] || "Working…"}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", marginTop: 8 }}
                      disabled={isTerminating}
                      onClick={handleTerminate}
                    >
                      {isTerminating ? (
                        <><Loader2 size={13} className="spin" style={{ marginRight: 6 }} />Stopping...</>
                      ) : (
                        <><Square size={12} style={{ marginRight: 6 }} />Stop / terminate VM</>
                      )}
                    </button>
                  </>
                )}

                {teeSession?.status === "complete" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      disabled={isDownloading}
                      onClick={handleDownloadResult}
                    >
                      {isDownloading ? (
                        <><Loader2 size={14} className="spin" style={{ marginRight: 6 }} />Downloading...</>
                      ) : (
                        <><Download size={14} style={{ marginRight: 6 }} />Download Anonymized Data</>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", marginTop: 8 }}
                      disabled={isTerminating}
                      onClick={handleTerminate}
                    >
                      {isTerminating ? (
                        <><Loader2 size={13} className="spin" style={{ marginRight: 6 }} />Stopping...</>
                      ) : (
                        <><Square size={12} style={{ marginRight: 6 }} />Stop / terminate VM</>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", marginTop: 8 }}
                      onClick={() => { setTeeSession(null); setDownloadError(null); }}
                    >
                      <RefreshCw size={13} style={{ marginRight: 6 }} />Run again
                    </button>
                    {downloadError && (
                      <div className="error-message" style={{ marginTop: 10, fontSize: 13 }}>
                        {downloadError}
                      </div>
                    )}
                  </>
                )}

                {teeSession?.status === "terminated" && (
                  <>
                    <div className="cat-status">
                      <CheckCircle2 size={15} />
                      <span>VM terminated</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: "100%", marginTop: 8 }}
                      onClick={() => { setTeeSession(null); setDownloadError(null); }}
                    >
                      <RefreshCw size={13} style={{ marginRight: 6 }} />Run again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      <ContractPreviewModal
        open={showContractPreview}
        contract={generatedContract}
        onClose={() => setShowContractPreview(false)}
      />
    </div>
  );
}
