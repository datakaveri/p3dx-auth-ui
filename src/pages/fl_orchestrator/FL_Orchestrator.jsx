import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getMyNotifications, markNotificationRead, startFlSession } from "../../api/auth";
import { getAzureAccessToken } from "../../api/azureAuth";
import VmProvisioningPanel from "../../components/VmProvisioningPanel";

function parseNotificationPayload(n) {
  try {
    return typeof n?.payload === "string" ? JSON.parse(n.payload || "{}") : (n?.payload || {});
  } catch {
    return {};
  }
}

const POLL_MS = 5000;

// Landing page for the fl-orchestrator platform operator account (see
// p3dx-aaa/scripts/create-fl-orchestrator-user.js and the isOrchestrator
// redirect in AppShell.jsx). FL owners no longer sign in with Azure or
// provision VMs themselves - clicking "Start FL Session" on their own page
// just queues a request here (payload.kind: 'fl_session_pending'), and this
// page is where a human actually does the Azure sign-in Microsoft requires,
// then starts the session + provisions its VM on the owner's behalf.
export default function FL_Orchestrator() {
  const { token } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Every pending request can be signed in to and provisioned at once - Azure
  // device-code login is isolated per run, and each VmProvisioningPanel below
  // tracks its own run independently (see VmProvisioningPanel.jsx). The one
  // thing that still serializes is the actual `terraform apply` step, handled
  // server-side (vmAutoProvision.service.js queues those FIFO) - this page
  // doesn't need to know about that queueing.
  const [activeSessions, setActiveSessions] = useState([]); // [{ notificationId, submissionId, vmName }]
  // A Set, not a single id - with multiple rows startable at once, more than
  // one can be mid-flight (Azure sign-in + start-fl-session) simultaneously.
  const [processingIds, setProcessingIds] = useState(() => new Set());
  const [processError, setProcessError] = useState(null);

  const fetchPending = async () => {
    if (!token) return;
    try {
      const res = await getMyNotifications(token);
      if (res?.status === "SUCCESS") {
        const list = Array.isArray(res.notifications) ? res.notifications : [];
        setPending(list.filter((n) => !n.read && parseNotificationPayload(n).kind === "fl_session_pending"));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const h = setInterval(fetchPending, POLL_MS);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleProcess = async (notification) => {
    const payload = parseNotificationPayload(notification);
    setProcessingIds((prev) => new Set(prev).add(notification.id));
    setProcessError(null);
    try {
      const azureToken = await getAzureAccessToken();
      await startFlSession(
        payload.submission_id,
        azureToken,
        payload.participating_providers || [],
        token,
        payload.output_owner_username
      );
      await markNotificationRead(notification.id, token);
      setPending((prev) => prev.filter((n) => n.id !== notification.id));
      setActiveSessions((prev) => [
        ...prev,
        {
          notificationId: notification.id,
          submissionId: payload.submission_id,
          vmName: payload.vm_name || payload.output_owner_username || "",
        },
      ]);
    } catch (e) {
      setProcessError(`Submission ${payload.submission_id}: ${e.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>FL Orchestrator</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Pending "Start FL Session" requests. Each needs an Azure sign-in before it can start.
          </div>
        </div>
      </div>

      {error && <div className="fl-result-banner fl-result-banner--error">{error}</div>}
      {processError && <div className="fl-result-banner fl-result-banner--error">{processError}</div>}

      {activeSessions.map((s) => (
        <VmProvisioningPanel
          key={s.notificationId}
          token={token}
          role="user"
          initialVmName={s.vmName}
          autoStart
          submissionId={s.submissionId}
        />
      ))}

      <div className="card">
        {loading ? (
          <div style={{ fontSize: "13px", color: "var(--text-light)" }}>Loading...</div>
        ) : pending.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--text-light)" }}>No pending FL session requests.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {pending.map((n) => {
              const payload = parseNotificationPayload(n);
              const busy = processingIds.has(n.id);
              const disabled = busy;
              return (
                <li
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-color, #ddd)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>Submission {payload.submission_id}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-light)" }}>
                      Owner: {payload.output_owner_username || "unknown"} · {(payload.participating_providers || []).length} provider(s)
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-light)" }}>
                      Project: {payload.project_id || "—"}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-light)" }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{ width: "auto" }}
                    disabled={disabled}
                    onClick={() => handleProcess(n)}
                  >
                    {busy ? "Signing in..." : "Sign in with Azure & Start Session"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
