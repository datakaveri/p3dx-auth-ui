import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { getNotificationResponses } from "../api/auth";
import { listMyInfraPolicies } from "../api/policies";
import "../styles/notifications.css";

export default function FederatedLearningDashboard() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Notifications (the inbox) now live in the shell's bell + panel; this page
  // keeps only the output owner's view of the messages they have sent.
  const [sentNotifications, setSentNotifications] = useState([]);
  const [sentNotificationsLoading, setSentNotificationsLoading] = useState(false);
  const [showSentNotifications, setShowSentNotifications] = useState(false);
  // Closing a sent message is local-only (it comes back on reload).
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("provider");
  // A data provider runs its own training VM, so taking part in an FL
  // session also needs them to be an infra provider: the infra_provider role
  // plus a filled infra-provider form (enforced by gov_layer, see its
  // fl_participants.go); without both they're not listed or invitable.
  const hasInfraRole = roles.includes("infra_provider");
  // null while loading.
  const [hasInfraRegistration, setHasInfraRegistration] = useState(null);
  useEffect(() => {
    if (!token || !hasDataProvider || !hasInfraRole) return;
    let cancelled = false;
    listMyInfraPolicies(token)
      .then(res => { if (!cancelled) setHasInfraRegistration(Array.isArray(res?.data) && res.data.length > 0); })
      .catch(() => { if (!cancelled) setHasInfraRegistration(false); });
    return () => { cancelled = true; };
  }, [token, hasDataProvider, hasInfraRole]);
  // No separate "output-owner" role to request/approve — any logged-in user
  // who isn't a data-provider gets the full owner workflow.
  const hasOutputOwner = !hasDataProvider;
  const canSeeOutputOwnerForm = hasOutputOwner;

  const serviceLabel = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/services/fl")) return "Federated Learning";
    if (path.includes("/services/smpc")) return "SMPC";
    if (path.includes("/services/dp")) return "Differential Privacy";
    return "Service";
  }, [location.pathname]);
  // Fetch this output owner's own sent messages (with recipients' responses).
  const fetchSentNotifications = async () => {
    if (!token || !hasOutputOwner) return;
    setSentNotificationsLoading(true);
    try {
      const res = await getNotificationResponses(token);
      if (res?.status === "SUCCESS") {
        setSentNotifications(Array.isArray(res.notifications) ? res.notifications : []);
      }
    } catch (err) {
      console.warn("Failed to fetch sent notifications:", err);
    } finally {
      setSentNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasOutputOwner || !token) return;
    fetchSentNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hasOutputOwner]);
  const handleDismiss = (notificationId) => {
    setDismissedIds(prev => new Set(prev).add(notificationId));
  };

  const handleClearAll = (ids) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const visibleSentNotifications = sentNotifications.filter(n => !dismissedIds.has(n.id));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>{serviceLabel}</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Manage your access and actions for this service.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => navigate("/app/services")}
          >
            Back to Services
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="grid">
          <div>
            <div className="label">Username</div>
            <div className="value">{user.username}</div>
          </div>
          <div>
            <div className="label">Email</div>
            <div className="value">{user.email}</div>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div className="label" style={{ marginBottom: "8px" }}>
            Roles
          </div>
          <div className="pill-row">
            {Array.isArray(user.roles) && user.roles.length > 0 ? (
              user.roles.map(r => (
                <span key={r} className={r === "admin" ? "pill pill-admin" : "pill"}>
                  {r}
                </span>
              ))
            ) : (
              <span className="value">No roles</span>
            )}
          </div>
        </div>
      </div>

      {hasDataProvider && !hasInfraRole && (
        <div className="card" style={{ marginBottom: "18px", borderLeft: "4px solid #e67e22" }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Infra Provider Role Required</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
            To take part in federated learning sessions you must also be an <strong>infra-provider</strong>,
            because training runs on a VM you provide. Request the role, then fill the infrastructure form.
            Until then, output owners can't select you for a session.
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            style={{ width: "auto" }}
            onClick={() => navigate("/app/role-request")}
          >
            Request Infra Provider Role
          </button>
        </div>
      )}

      {hasDataProvider && hasInfraRole && hasInfraRegistration === false && (
        <div className="card" style={{ marginBottom: "18px", borderLeft: "4px solid #e67e22" }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Infrastructure Form Required</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
            To take part in federated learning sessions, register the infrastructure you'll train on.
            Until then, output owners can't select you for a session.
          </div>
          <button
            className="btn btn-primary"
            type="button"
            style={{ width: "auto" }}
            onClick={() => navigate("/app/services/infra-policy", { state: { returnTo: location.pathname } })}
          >
            Fill Infrastructure Form
          </button>
        </div>
      )}

      {/* The FL-only Data Provider Form is gone: Upload Dataset (PolicyForm.jsx)
          is now the single data-provider form for every service. */}
      <div className="fl-card-grid">
        {hasDataProvider ? (
          <div className="card">
            <h3 className="section-title" style={{ marginTop: 0 }}>Your Dataset</h3>
            <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
              Register your dataset, access policy and compute details on the Upload Dataset page.
              Output owners can then find you and invite you to federated learning sessions.
            </div>
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: "auto" }}
              onClick={() => navigate("/app/services/policies", { state: { returnTo: location.pathname } })}
            >
              Upload Dataset
            </button>
          </div>
        ) : (
          <div className="card">
            <h3 className="section-title" style={{ marginTop: 0 }}>Become a Data Provider</h3>
            <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
              Want to contribute a dataset to federated learning sessions instead? Request the{" "}
              <strong>data-provider</strong> role.
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              style={{ width: "auto" }}
              onClick={() => navigate("/app/role-request")}
            >
              Request Data Provider Role
            </button>
          </div>
        )}

        {canSeeOutputOwnerForm && (
          <div className="card">
            <h3 className="section-title" style={{ marginTop: 0 }}>Output Owner</h3>
            <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
              {hasOutputOwner
                ? "Pick the datasets to train on in the Catalogue, then configure the federated learning session."
                : "Fill in the federated learning configuration form."}
            </div>
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: "auto" }}
              onClick={() => navigate("/app/services/run", { state: { technique: "FL", returnTo: location.pathname } })}
            >
              Choose Datasets in Catalogue
            </button>
          </div>
        )}
      </div>

      {/* Messages Section for the output owner / user side: notifications
          this user has sent, plus each recipient's response. */}
      {hasOutputOwner && (
        <div className="card" style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 className="section-title" style={{ margin: 0 }}>Messages</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                className="btn btn-secondary"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                onClick={fetchSentNotifications}
              >
                Refresh
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                onClick={() => setShowSentNotifications(!showSentNotifications)}
              >
                {showSentNotifications ? "Hide" : "Show"} Messages
              </button>
              {visibleSentNotifications.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                  onClick={() => handleClearAll(visibleSentNotifications.map(n => n.id))}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {showSentNotifications && (
            <div style={{ marginTop: "16px" }}>
              {sentNotificationsLoading ? (
                <div style={{ padding: "12px", color: "#888", fontSize: "0.9rem" }}>Loading messages...</div>
              ) : visibleSentNotifications.length === 0 ? (
                <div style={{ padding: "12px", color: "#888", fontSize: "0.9rem" }}>No messages yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {visibleSentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-light, #f8f9fa)",
                        border: "1px solid var(--border-color, #ddd)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "4px" }}>
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                          <div style={{ fontSize: "0.95rem", color: "var(--text-dark, #333)" }}>
                            {notification.message}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--primary-color, #6c63ff)", marginTop: "4px" }}>
                            To: {notification.recipient_username || "recipient"}
                          </div>
                          {notification.response ? (
                            <div style={{
                              fontSize: "0.85rem", fontWeight: 500, marginTop: "4px",
                              color: notification.response === "accepted" ? "var(--success-color, #27ae60)" : "#e74c3c",
                            }}>
                              {notification.response === "accepted" ? "✅ Accepted" : "❌ Declined"}
                              {notification.response_message && (
                                <div style={{ fontWeight: 400, color: "var(--text-light, #555)", marginTop: "2px" }}>
                                  Note: {notification.response_message}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "4px" }}>Awaiting response</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          title="Close"
                          aria-label="Close"
                          style={{
                            padding: "2px 8px", fontSize: "0.9rem", lineHeight: 1,
                            backgroundColor: "transparent", color: "#888",
                            border: "1px solid var(--border-color, #ddd)", borderRadius: "4px",
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
