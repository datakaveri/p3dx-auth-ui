import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyProjects, restartFlSession, getContractByProject } from "../api/auth";
import ContractPreviewModal from "../components/ContractPreviewModal";

// Projects page (see AppShell.jsx sidebar "Projects" link, under "Services").
// fl-orchestrator sees every project; anyone else sees only their own (as
// output owner) - the backend (GET /p3dx/projects) does that filtering, this
// page just renders whatever list comes back. Deliberately shows only the
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
  const [contractLoadingId, setContractLoadingId] = useState(null);
  const [contractError, setContractError] = useState(null);
  const [viewedContract, setViewedContract] = useState(null);

  const isOrchestrator = (user?.roles || []).includes("fl-orchestrator");

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
                    {!isOrchestrator && (
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
                          ? "Requested"
                          : "Start Again"}
                      </button>
                    )}
                  </div>
                </div>
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
