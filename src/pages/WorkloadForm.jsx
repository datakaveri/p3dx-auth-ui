import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import {
  previewContract, startTeeSession, getTeeSessionStatus,
  downloadTeeSessionOutput, terminateTeeSession,
} from "../api/workloads";
import { listAvailableDatasets } from "../api/roleRequests";
import {
  Database, Search, Server, Play, X,
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

export default function WorkloadForm() {
  const { isAdmin, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";
  // FL vs SMPC is chosen on the dashboard the user came from, not here.
  const technique = location.state?.technique;

  // Redirect admins
  useEffect(() => {
    if (isAdmin) navigate("/app/admin", { replace: true });
  }, [isAdmin]);

  // Catalogue state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatasetName, setSelectedDatasetName] = useState(null);

  // Real, registered dataset names (from APD via aaa's /available-datasets) —
  // no catalogue metadata (category/description/size/etc.) exists for these yet.
  const [datasetNames, setDatasetNames] = useState([]);
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
          setDatasetNames(Array.isArray(data?.datasets) ? data.datasets : []);
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

  // Workload state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [showRawContract, setShowRawContract] = useState(false);

  // TEE session lifecycle: null (not started) | { sessionId, status, error }
  // status: "provisioning"|"attesting"|"running"|"complete"|"failed"|"terminated"
  const [teeSession, setTeeSession] = useState(null);
  const [datasetUrl, setDatasetUrl] = useState("");
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  // Filtered lists
  const filteredDatasetNames = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return datasetNames.filter(name => !q || name.toLowerCase().includes(q));
  }, [datasetNames, searchQuery]);

  const handleDatasetSelect = (name) => {
    setSelectedDatasetName(prev => prev === name ? null : name);
  };

  const handleGenerateContract = async () => {
    if (!selectedDatasetName || !technique) return;
    setError(null);
    setGeneratedContract(null);
    setTeeSession(null);
    setDownloadError(null);
    setIsGenerating(true);
    try {
      if (!token) throw new Error("MISSING_AUTH_TOKEN");
      const res = await previewContract(token, {
        datasetId: selectedDatasetName,
        technique,
      });
      setGeneratedContract(res?.contract || null);
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
        datasetId: selectedDatasetName,
        datasetName: selectedDatasetName,
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

  const canRun = selectedDatasetName && technique;
  const missingItems = [];
  if (!selectedDatasetName) missingItems.push("dataset");
  if (!technique) missingItems.push("service (go back to Services and start from SMPC or Anonymization)");

  return (
    <div className="cat-layout">
      {/* Left sidebar */}
      <aside className="cat-sidebar">
        <div className="cat-sidebar__header">
          <Database size={16} /><span>Datasets</span>
        </div>
        <div className="cat-sidebar__nav" style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-light)" }}>
          Registered datasets aren't categorized yet — search by name instead.
        </div>
      </aside>

      {/* Main content */}
      <div className="cat-main">
        {/* Toolbar */}
        <div className="cat-toolbar">
          <div className="cat-search">
            <Search size={14} className="cat-search__icon" />
            <input
              className="cat-search__input"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
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
          {/* Cards list */}
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
            ) : filteredDatasetNames.length > 0 ? (
              <div className="cat-simple-list">
                {filteredDatasetNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    className={`cat-simple-item${selectedDatasetName === name ? " cat-simple-item--selected" : ""}`}
                    onClick={() => handleDatasetSelect(name)}
                  >
                    <Database size={16} />
                    <span className="cat-simple-item__name">{name}</span>
                    {selectedDatasetName === name && <CheckCircle2 size={15} />}
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
        <div className={`cat-slot${selectedDatasetName ? " cat-slot--filled" : ""}`}>
          <div className="cat-slot__icon">
            <Database size={16} />
          </div>
          <div className="cat-slot__info">
            <div className="cat-slot__label">Dataset</div>
            {selectedDatasetName
              ? <div className="cat-slot__value">{selectedDatasetName}</div>
              : <div className="cat-slot__placeholder">No dataset selected</div>
            }
          </div>
          {selectedDatasetName && (
            <button className="cat-icon-btn cat-slot__clear" onClick={() => setSelectedDatasetName(null)} title="Clear">
              <X size={13} />
            </button>
          )}
        </div>

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
                <div className="value">{generatedContract.contract_id}</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="label">Dataset</div>
              <div className="value">{generatedContract.parties?.data_providers?.[0]?.dataset_name}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="label">Parties</div>
              <div className="value" style={{ fontSize: 13 }}>
                Consumer: {generatedContract.parties?.user?.id}<br />
                Data Provider: {generatedContract.parties?.data_providers?.[0]?.name}<br />
                Application Provider: {generatedContract.parties?.application_providers?.[0]?.name}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => setShowRawContract(v => !v)}
            >
              {showRawContract ? "Hide raw contract" : "View raw contract"}
            </button>
            {showRawContract && (
              <pre style={{ marginTop: 10, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(generatedContract, null, 2)}
              </pre>
            )}

            {(technique === "TEE" || technique === "SMPC") && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                {(!teeSession || teeSession.status === "failed") && (
                  <>
                    <label className="label" style={{ display: "block", marginBottom: 6 }}>
                      Dataset blob URL (https)
                    </label>
                    <input
                      type="url"
                      placeholder="https://anondata2.blob.core.windows.net/encrypted-data/..."
                      value={datasetUrl}
                      onChange={e => setDatasetUrl(e.target.value)}
                      className="cat-search__input"
                      style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      disabled={isStartingRun || !datasetUrl}
                      onClick={handleRunTee}
                    >
                      {isStartingRun ? (
                        <><Loader2 size={14} className="spin" style={{ marginRight: 6 }} />Starting {technique} session...</>
                      ) : (
                        <><Play size={14} style={{ marginRight: 6 }} />Run {technique}</>
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
    </div>
  );
}
