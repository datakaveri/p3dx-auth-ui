import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getMyProjects, restartFlSession, getContractByProject, getSessionContractSignatures, queueRestartedFlSession } from "../api/auth";
import ContractPreviewModal from "../components/ContractPreviewModal";
import ContractSignatureStatus from "../components/ContractSignatureStatus";

// Projects page (see AppShell.jsx sidebar "Projects" link, under "Services").
// fl-orchestrator sees every project; anyone else sees the ones they own the
// output of, plus the ones they are a data provider on - gov_layer
// (GET /me/projects) does that filtering, this page just renders whatever
// list comes back. On a data provider's rows only "View run" (their own VM's
// run page) and "View Contract" are offered. Deliberately shows only the
// project number and its data providers, no owner name (see FL_Orchestrator.jsx
// for the pending-request view, which is a different list).
export default function ProjectsList() {
  const { user, token } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restartingId, setRestartingId] = useState(null);
  const [restartError, setRestartError] = useState(null);
  const [restartedId, setRestartedId] = useState(null);
  // The restarted project awaiting signatures on its new contract:
  // { projectId, sessionId, usernames } - its "Start FL Session" unlocks once its signatures match (tee "can run").
  const [pendingRestart, setPendingRestart] = useState(null);
  const [restartAllSigned, setRestartAllSigned] = useState(false);
  const [queueingRestart, setQueueingRestart] = useState(false);
  const [restartQueued, setRestartQueued] = useState(false);
  const [contractLoadingId, setContractLoadingId] = useState(null);
  const [contractError, setContractError] = useState(null);
  const [viewedContract, setViewedContract] = useState(null);

  const navigate = useNavigate();
  const isOrchestrator = (user?.roles || []).includes("fl-orchestrator");

  // The list is newest first, so the first row seen per session is its newest.
  const newestRowIds = new Set();
  {
    const seen = new Set();
    for (const p of projects) {
      if (p.session_id && !seen.has(p.session_id)) {
        seen.add(p.session_id);
        newestRowIds.add(p.project_id);
      }
    }
  }
  // The owner is whoever started the session (gov_layer's output_owner_username).
  // Legacy rows without it fall back to "not one of the data providers".
  const isOwner = (p) =>
    Boolean(user?.username) &&
    (p.output_owner_username
      ? p.output_owner_username === user.username
      : !(p.data_provider_usernames || []).includes(user.username));

  // A row where the caller takes part as a data provider, not as its owner.
  const isProviderRow = (p) =>
    !isOwner(p) && Boolean(user?.username) && (p.data_provider_usernames || []).includes(user.username);

  const handleViewRun = (p) => {
    const sid = encodeURIComponent(p.session_id);
    navigate(isOwner(p) ? `/app/services/fl/run/${sid}` : `/app/services/fl/orchestrator/${sid}`);
  };

  const handleViewOutput = (p) => {
    navigate(`/app/services/fl/federated-learning/output/${encodeURIComponent(p.session_id)}`, {
      state: { sessionName: `Project ${p.project_id}`, from: "/app/projects" },
    });
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyProjects(token);
        if (!cancelled) setProjects(Array.isArray(res.projects) ? res.projects : []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleStartAgain = async (project) => {
    setRestartingId(project.project_id);
    setRestartError(null);
    try {
      await restartFlSession(project.session_id, project.data_provider_usernames || [], token);
      setRestartedId(project.project_id);
      setRestartAllSigned(false);
      setRestartQueued(false);
      setPendingRestart({
        projectId: project.project_id,
        sessionId: project.session_id,
        usernames: project.data_provider_usernames || [],
      });
      // The restart creates a new project (see /gov/restart-fl-session), so
      // refresh the list to show it rather than leaving the stale one on screen.
      const res = await getMyProjects(token);
      setProjects(Array.isArray(res.projects) ? res.projects : []);
    } catch (e) {
      setRestartError(`Project ${project.project_id}: ${e.message}`);
    } finally {
      setRestartingId(null);
    }
  };

  const handleQueueRestart = async () => {
    if (!pendingRestart) return;
    setQueueingRestart(true);
    setRestartError(null);
    try {
      await queueRestartedFlSession(pendingRestart.sessionId, pendingRestart.usernames, token);
      setRestartQueued(true);
    } catch (e) {
      setRestartError(`Project ${pendingRestart.projectId}: ${e.message}`);
    } finally {
      setQueueingRestart(false);
    }
  };

  const handleViewContract = async (project) => {
    setContractLoadingId(project.project_id);
    setContractError(null);
    try {
      const data = await getContractByProject(project.project_id, token);
      if (data?.contract) {
        setViewedContract(data.contract);
      } else {
        setContractError(`Project ${project.project_id}: no contract found.`);
      }
    } catch (e) {
      setContractError(`Project ${project.project_id}: ${e.message}`);
    } finally {
      setContractLoadingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Projects</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Federated learning projects and their participating data providers.
          </div>
        </div>
      </div>

      {error && <div className="fl-result-banner fl-result-banner--error">{error}</div>}
      {restartError && <div className="fl-result-banner fl-result-banner--error">{restartError}</div>}
      {contractError && <div className="fl-result-banner fl-result-banner--error">{contractError}</div>}

      <div className="card">
        {loading ? (
          <div style={{ fontSize: "13px", color: "var(--text-light)" }}>Loading...</div>
        ) : projects.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--text-light)" }}>No projects yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {projects.map((p) => (
              <li
                key={p.project_id}
                className="expandable-row"
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-color, #ddd)",
                }}
              >
                <div style={{ fontWeight: 500 }}>Project {p.project_id}</div>
                <div
                  className="expandable-row__details"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}
                >
                  <span>
                    {(p.data_provider_usernames || []).length > 0
                      ? `Data providers: ${p.data_provider_usernames.join(", ")}`
                      : "No data providers recorded"}
                  </span>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      style={{ width: "auto" }}
                      disabled={contractLoadingId === p.project_id}
                      onClick={() => handleViewContract(p)}
                    >
                      {contractLoadingId === p.project_id ? "Loading..." : "View Contract"}
                    </button>
                    {!isOrchestrator && newestRowIds.has(p.project_id) && (
                      <>
                        <button className="btn btn-secondary" type="button" style={{ width: "auto" }} onClick={() => handleViewRun(p)}>
                          View run
                        </button>
                        {/* Only the output owner who started the session sees its output
                            (gov_layer also gates it); providers never get the button. */}
                        {isOwner(p) && (
                          <button className="btn btn-secondary" type="button" style={{ width: "auto" }} onClick={() => handleViewOutput(p)}>
                            View output
                          </button>
                        )}
                      </>
                    )}
                    {!isOrchestrator && !isProviderRow(p) && (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        style={{ width: "auto" }}
                        disabled={restartingId === p.project_id}
                        onClick={() => handleStartAgain(p)}
                      >
                        {restartingId === p.project_id
                          ? "Starting..."
                          : restartedId === p.project_id
                          ? "Sent for signing"
                          : "Start Again"}
                      </button>
                    )}
                  </div>
                </div>
                {!isOrchestrator && pendingRestart?.projectId === p.project_id && (
                  <div style={{ marginTop: "8px" }}>
                    <ContractSignatureStatus
                      key={`${pendingRestart.sessionId}:${pendingRestart.projectId}`}
                      pollKey={`${pendingRestart.sessionId}:${pendingRestart.projectId}`}
                      fetchStatus={() => getSessionContractSignatures(pendingRestart.sessionId, token)}
                      onStatus={(s) => setRestartAllSigned(s?.tee === "can run")}
                      blockedText="The FL session can't start until every data provider has signed the new contract."
                    />
                    <button
                      className="btn btn-primary"
                      type="button"
                      style={{ width: "auto" }}
                      disabled={!restartAllSigned || queueingRestart || restartQueued}
                      onClick={handleQueueRestart}
                    >
                      {queueingRestart ? "Requesting..." : restartQueued ? "Requested" : "Start FL Session"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ContractPreviewModal
        open={!!viewedContract}
        contract={viewedContract}
        onClose={() => setViewedContract(null)}
      />
    </div>
  );
}
