import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { DataOwnerForm } from "../components/RoleForms";
import { getMyNotifications, markNotificationRead, respondToNotification } from "../api/auth";
import { BACKEND_URL } from "../config";

export default function FederatedLearningDashboard() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const wsRef = useRef(null);

  const [actionError, setActionError] = useState(null);

  // Notifications for data providers
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  // Participation-consent: per-notification reason draft + in-flight respond id.
  const [responseDrafts, setResponseDrafts] = useState({});
  const [respondingId, setRespondingId] = useState(null);

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasOutputOwner = roles.includes("output-owner");
  const hasDataProvider = roles.includes("data-provider");

  const serviceLabel = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/services/fl")) return "Federated Learning";
    if (path.includes("/services/smpc")) return "SMPC";
    if (path.includes("/services/dp")) return "Differential Privacy";
    return "Service";
  }, [location.pathname]);

  // Fetch notifications for data providers
  const fetchNotifications = async () => {
    if (!token || !hasDataProvider) return;
    setNotificationsLoading(true);
    try {
      console.log('[DEBUG] Fetching notifications for user:', user?.username, 'user object:', JSON.stringify({
        sub: user?.sub,
        id: user?.id,
        userId: user?.userId,
        keycloakId: user?.keycloakId,
        preferred_username: user?.preferred_username
      }));
      const res = await getMyNotifications(token);
      console.log('[DEBUG] Notifications response:', res);
      if (res?.status === "SUCCESS") {
        setNotifications(Array.isArray(res.notifications) ? res.notifications : []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkRead = async (notificationId) => {
    if (!token) return;
    try {
      await markNotificationRead(notificationId, token);
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  };

  // Answer a participation request: "accepted" or "declined", with an optional
  // reason that goes back to the output owner.
  const handleRespond = async (notificationId, response) => {
    if (!token) return;
    const message = (responseDrafts[notificationId] || "").trim();
    setRespondingId(notificationId);
    try {
      await respondToNotification(notificationId, response, message, token);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, response, response_message: message, responded_at: new Date().toISOString(), read: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Failed to send participation response:", err);
      setActionError(err.message || "Failed to send participation response");
    } finally {
      setRespondingId(null);
    }
  };

  // Real-time notifications via Server-Sent Events. The server sends a
  // {type:'notification'} nudge when a notification is created for this user;
  // we then refetch the canonical list, so the dashboard updates with no manual
  // refresh. EventSource reconnects automatically after transient drops.
  useEffect(() => {
    if (!hasDataProvider || !user?.username) return;

    const url = `${BACKEND_URL}/p3dx/notifications/stream?username=${encodeURIComponent(user.username)}`;
    const es = new EventSource(url);

    es.onopen = () => setWsConnected(true);

    es.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'notification') {
          fetchNotifications();
          setShowNotifications(true);
        }
      } catch (err) {
        console.error('[SSE] Error parsing message:', err);
      }
    };

    es.onerror = () => {
      // EventSource retries on its own; just reflect the transient state.
      setWsConnected(false);
    };

    wsRef.current = es;

    // Initial load of existing notifications.
    fetchNotifications();

    return () => {
      es.close();
      wsRef.current = null;
    };
  }, [token, hasDataProvider, user?.username]);

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

      {actionError ? <div className="error-message" style={{ marginBottom: "18px" }}>{actionError}</div> : null}

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

      {hasDataProvider && <DataOwnerForm user={user} token={token} />}

      {hasOutputOwner && (
        <div className="card" style={{ marginBottom: "18px" }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Output Owner</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
            Configure a federated learning session and select the data providers to invite.
          </div>
          <button
            className="btn btn-primary"
            type="button"
            style={{ width: "auto" }}
            onClick={() => navigate("/app/services/fl/federated-learning")}
          >
            Open Federated Learning Configuration
          </button>
        </div>
      )}

      {!hasDataProvider && !hasOutputOwner && (
        <div className="card" style={{ marginBottom: "18px" }}>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            You need the <strong>output-owner</strong> or <strong>data-provider</strong> role to use Federated Learning.
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            style={{ width: "auto", marginTop: "10px" }}
            onClick={() => navigate("/app/role-request")}
          >
            Request Access
          </button>
        </div>
      )}

      {/* Notifications Section for Data Providers */}
      {hasDataProvider && (
        <div className="card" style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h3 className="section-title" style={{ margin: 0 }}>Notifications</h3>
              {unreadCount > 0 && (
                <span style={{
                  backgroundColor: "var(--primary-color, #6c63ff)",
                  color: "white",
                  borderRadius: "12px",
                  padding: "2px 10px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{
                fontSize: "0.75rem",
                color: wsConnected ? "var(--success-color, #27ae60)" : "#888",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                {wsConnected ? "â— Live" : "â—‹ Offline"}
              </span>
              <button
                className="btn btn-secondary"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                onClick={() => {
                  console.log('[DEBUG] Manual refresh clicked');
                  fetchNotifications();
                }}
              >
                Refresh
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {showNotifications ? "Hide" : "Show"} Notifications
              </button>
            </div>
          </div>

          {showNotifications && (
            <div style={{ marginTop: "16px" }}>
              {notificationsLoading ? (
                <div style={{ padding: "12px", color: "#888", fontSize: "0.9rem" }}>Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: "12px", color: "#888", fontSize: "0.9rem" }}>No notifications yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {notifications.map((notification) => {
                    const payload = typeof notification.payload === "string"
                      ? (() => { try { return JSON.parse(notification.payload || "{}"); } catch { return {}; } })()
                      : (notification.payload || {});
                    const isRequest = payload.kind === "participation_request";
                    const isRoster = payload.kind === "participation_roster";
                    const selectedList = Array.isArray(payload.selected_providers) ? payload.selected_providers : [];
                    const requestedList = Array.isArray(payload.requested_providers) ? payload.requested_providers : [];
                    const willingList = Array.isArray(payload.willing_providers) ? payload.willing_providers : [];
                    const ownerLabel = payload.output_owner_id || notification.sender_username || "output owner";
                    const responded = !!notification.response;
                    const contract = payload.contract && typeof payload.contract === "object" ? payload.contract : null;
                    const partyList = contract?.parties && typeof contract.parties === "object" ? Object.values(contract.parties) : [];
                    const contractProviders = partyList.filter(p => p && p.role === "DATA_PROVIDER");
                    const draftingParty = partyList.find(p => p && p.role === "DRAFTING_PARTY") || null;
                    const sessionInfo = contract?.session_info || {};
                    const ci = sessionInfo.training_config || {};
                    return (
                    <div
                      key={notification.id}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: notification.read ? "var(--bg-light, #f8f9fa)" : "rgba(108, 99, 255, 0.08)",
                        border: `1px solid ${notification.read ? "var(--border-color, #ddd)" : "rgba(108, 99, 255, 0.3)"}`,
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
                          <div style={{
                            fontSize: "0.95rem",
                            fontWeight: notification.read ? 400 : 500,
                            color: "var(--text-dark, #333)",
                          }}>
                            {notification.message}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--primary-color, #6c63ff)", marginTop: "4px" }}>
                            From: {ownerLabel}
                          </div>
                        </div>
                        {!isRequest && !notification.read && (
                          <button
                            onClick={() => handleMarkRead(notification.id)}
                            style={{
                              padding: "4px 10px", fontSize: "0.75rem",
                              backgroundColor: "var(--primary-color, #6c63ff)", color: "white",
                              border: "none", borderRadius: "4px", cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            Mark Read
                          </button>
                        )}
                        {!isRequest && notification.read && (
                          <span style={{ fontSize: "0.75rem", color: "#888", whiteSpace: "nowrap" }}>Read</span>
                        )}
                      </div>

                      {isRequest && (requestedList.length > 0 || selectedList.length > 0) && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-light, #555)", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {requestedList.length > 0 && (
                            <div>
                              <strong>Requested to participate ({requestedList.length}):</strong> {requestedList.map(p => p.username || p.id).join(", ")}
                            </div>
                          )}
                          {selectedList.length > 0 && (
                            <div>
                              <strong>Accepted by output owner ({selectedList.length}):</strong> {selectedList.map(p => p.username || p.id).join(", ")}
                            </div>
                          )}
                        </div>
                      )}

                      {isRoster && (willingList.length > 0 || selectedList.length > 0) && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-light, #555)", display: "flex", flexDirection: "column", gap: "2px" }}>
                          {willingList.length > 0 && (
                            <div>
                              <strong>Willing to participate ({willingList.length}):</strong> {willingList.map(p => p.username || p.id).join(", ")}
                            </div>
                          )}
                          {selectedList.length > 0 && (
                            <div>
                              <strong>Selected by output owner ({selectedList.length}):</strong> {selectedList.map(p => p.username || p.id).join(", ")}
                            </div>
                          )}
                        </div>
                      )}

                      {contract && (
                        <div style={{
                          marginTop: "4px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: "var(--bg-light, #f8f9fa)",
                          border: "1px solid rgba(108, 99, 255, 0.3)",
                          fontSize: "0.8rem",
                          color: "var(--text-light, #555)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}>
                          <div style={{ fontWeight: 600, color: "var(--primary-color, #6c63ff)", fontSize: "0.85rem" }}>
                            ðŸ“œ Federated Learning Contract
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px" }}>
                            <span style={{ color: "#888" }}>Project</span><span><code>{contract.project_id}</code></span>
                            <span style={{ color: "#888" }}>Session</span><span><code>{sessionInfo.session_id}</code></span>
                            <span style={{ color: "#888" }}>Requested by</span><span>{sessionInfo.requested_by}</span>
                          </div>
                          {draftingParty && (
                            <div>
                              <strong>Output owner:</strong> {draftingParty.name || draftingParty.id}
                            </div>
                          )}
                          <div>
                            <strong>FL config:</strong> {[
                              ci.model && `model ${ci.model}`,
                              ci.framework && `framework ${ci.framework}`,
                              ci.num_server_rounds != null && `${ci.num_server_rounds} rounds`,
                              ci.local_epochs != null && `${ci.local_epochs} epochs`,
                              ci.learning_rate != null && `lr ${ci.learning_rate}`,
                              ci.batch_size != null && `batch ${ci.batch_size}`,
                            ].filter(Boolean).join(", ") || "â€”"}
                          </div>
                          {contractProviders.length > 0 && (
                            <div>
                              <strong>Participating data providers ({contractProviders.length}):</strong>
                              <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
                                {contractProviders.map((p, i) => (
                                  <li key={p.id || p.name || i}>
                                    {p.name || p.id}{p.data_resource_id ? ` â€” ${p.data_resource_id}` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {isRequest && !responded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <textarea
                            placeholder="Optional: a note for the output owner (e.g. why you can't participate)"
                            value={responseDrafts[notification.id] || ""}
                            onChange={e => setResponseDrafts(prev => ({ ...prev, [notification.id]: e.target.value }))}
                            rows={2}
                            style={{
                              width: "100%", fontSize: "0.85rem", padding: "8px",
                              borderRadius: "6px", border: "1px solid var(--border-color, #ddd)",
                              resize: "vertical", boxSizing: "border-box",
                            }}
                          />
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleRespond(notification.id, "accepted")}
                              disabled={respondingId === notification.id}
                              style={{
                                padding: "6px 14px", fontSize: "0.8rem",
                                backgroundColor: "var(--success-color, #27ae60)", color: "white",
                                border: "none", borderRadius: "6px",
                                cursor: respondingId === notification.id ? "default" : "pointer",
                              }}
                            >
                              {respondingId === notification.id ? "Sendingâ€¦" : "Yes, I'm willing"}
                            </button>
                            <button
                              onClick={() => handleRespond(notification.id, "declined")}
                              disabled={respondingId === notification.id}
                              style={{
                                padding: "6px 14px", fontSize: "0.8rem",
                                backgroundColor: "#e74c3c", color: "white",
                                border: "none", borderRadius: "6px",
                                cursor: respondingId === notification.id ? "default" : "pointer",
                              }}
                            >
                              No, not willing
                            </button>
                          </div>
                        </div>
                      )}

                      {isRequest && responded && (
                        <div style={{
                          fontSize: "0.85rem", fontWeight: 500,
                          color: notification.response === "accepted" ? "var(--success-color, #27ae60)" : "#e74c3c",
                        }}>
                          {notification.response === "accepted" ? "âœ… You accepted this request." : "âŒ You declined this request."}
                          {notification.response_message && (
                            <div style={{ fontWeight: 400, color: "var(--text-light, #555)", marginTop: "2px" }}>
                              Your note: {notification.response_message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "18px" }}>
        <h3 className="section-title">Actions</h3>
        <div className="action-grid">
          {hasDataProvider ? (
            <button
              className="action-card"
              type="button"
              onClick={() =>
                navigate("/app/services/policies", {
                  state: { returnTo: location.pathname },
                })
              }
            >
              <div className="action-title">Set Policies</div>
              <div className="action-description">
                Set access policies for datasets and applications (dummy flow).
              </div>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
