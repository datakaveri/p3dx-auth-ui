import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { DataOwnerForm, DP_VM_NAME_KEY } from "../components/RoleForms";
import { getMyNotifications, getNotificationResponses, markNotificationRead, respondToNotification, notifyAzureSignIn } from "../api/auth";
import { signInProviderWithAzure, completeProviderAzureSignIn } from "../api/azureAuth";
import FLSessionStartModal from "../components/FLSessionStartModal";
import { BACKEND_URL } from "../config";

function parseNotificationPayload(n) {
  try {
    return typeof n?.payload === "string" ? JSON.parse(n.payload || "{}") : (n?.payload || {});
  } catch {
    return {};
  }
}

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
  // Closed messages, both lists — dismiss is local-only (not persisted), so a
  // closed message just disappears from view here and comes back on reload.
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  // Messages for output owners: notifications they've sent, plus each
  // recipient's response.
  const [sentNotifications, setSentNotifications] = useState([]);
  const [sentNotificationsLoading, setSentNotificationsLoading] = useState(false);
  const [showSentNotifications, setShowSentNotifications] = useState(false);
  // Participation-consent: per-notification reason draft + in-flight respond id.
  const [responseDrafts, setResponseDrafts] = useState({});
  const [respondingId, setRespondingId] = useState(null);
  // FL-session-start sign-in modal: auto-opened as soon as an unread
  // "fl_session_start" notification is seen (matching the owner side, where
  // starting a session pops the Azure sign-in dialog immediately) - it can
  // also be reopened manually via "Sign in with Azure" on the notification
  // (see the notification list below and FLSessionStartModal).
  const [sessionStartModal, setSessionStartModal] = useState({ open: false, notification: null });
  const [azureSignInResult, setAzureSignInResult] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  // Notification ids we've already auto-popped the modal for, so a
  // still-unread notification doesn't reopen it on every poll/refetch.
  const autoOpenedSessionStartIds = useRef(new Set());
  // Editable right in the sign-in popup (see FLSessionStartModal) so naming
  // the VM can't be missed by skipping the separate Data Provider Form -
  // both read/write the same DP_VM_NAME_KEY sessionStorage entry.
  const [dpVmName, setDpVmNameState] = useState(
    () => sessionStorage.getItem(DP_VM_NAME_KEY) || user?.username || ""
  );
  const setDpVmName = (value) => {
    setDpVmNameState(value);
    sessionStorage.setItem(DP_VM_NAME_KEY, value);
  };

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");
  // No separate "output-owner" role to request/approve â€” any logged-in user
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

  // Fetch notifications for data providers. `isLiveUpdate` distinguishes a
  // fresh SSE push (a notification that just landed while this page is open)
  // from every other call (initial mount, manual refresh) - only a live push
  // is allowed to auto-pop the sign-in modal, otherwise a session-start
  // invite that's simply still unread from earlier would re-open the popup
  // on every page load/refresh instead of once, right after it actually happens.
  const fetchNotifications = async (isLiveUpdate = false) => {
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
        const list = Array.isArray(res.notifications) ? res.notifications : [];
        setNotifications(list);
        setUnreadCount(res.unread_count || 0);

        const unreadSessionStarts = list.filter(
          (n) => !n.read && parseNotificationPayload(n).kind === "fl_session_start"
        );
        if (isLiveUpdate) {
          // Pop the Azure sign-in dialog for a session-start request that just
          // arrived — but only ones not already accounted for, so a live push
          // triggered by some other notification doesn't reopen the popup for
          // an invite the provider already saw and dismissed earlier.
          const pending = unreadSessionStarts.find((n) => !autoOpenedSessionStartIds.current.has(n.id));
          if (pending) {
            // Marked seen right away so a poll landing during the delay below
            // can't queue up a second pop for the same invite; the popup
            // itself is deliberately held for a few seconds after the owner's
            // sign-in so it doesn't feel like it's firing in the same instant.
            autoOpenedSessionStartIds.current.add(pending.id);
            setTimeout(() => {
              setAzureSignInResult(null);
              setSessionStartModal({ open: true, notification: pending });
            }, 5000);
          }
        } else {
          // Not a live push (initial load / manual refresh): these invites
          // predate this page view, so mark them seen without popping —
          // otherwise a still-unread invite from earlier would re-open the
          // modal every time the dashboard is loaded or refreshed.
          unreadSessionStarts.forEach((n) => autoOpenedSessionStartIds.current.add(n.id));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

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

  // Close one message — local-only, just hides it from this view.
  const handleDismiss = (notificationId) => {
    setDismissedIds(prev => new Set(prev).add(notificationId));
  };

  // Close every currently-visible message in one list at once.
  const handleClearAll = (ids) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  // Shows the success banner, tells the output owner (best-effort - this
  // shouldn't block showing success just because the notify call failed),
  // and marks the triggering notification read. Shared by the inline
  // (silent-token) path below and by the post-redirect resume effect.
  const finishAzureSignIn = async (account, ctx) => {
    setAzureSignInResult({ ok: true, text: `Signed in as ${account?.username || "your Azure account"}.` });
    const freshToken = sessionStorage.getItem('access_token') || token;
    if (ctx?.ownerUsername && freshToken) {
      try {
        await notifyAzureSignIn(ctx.ownerUsername, ctx.submissionId, freshToken);
      } catch (err) {
        console.warn("Failed to notify owner of Azure sign-in:", err);
      }
    }
    if (ctx?.notificationId) {
      handleMarkRead(ctx.notificationId);
    }
    // Send this provider on to the FL Orchestrator page to create their own
    // VM (backend device-code Azure login + Terraform, see
    // vmAutoProvision.service.js) - kept off this page so it stays focused
    // on the FL workflow itself. Named after whatever they typed into the
    // "VM Name" field on their Data Provider Form (see DP_VM_NAME_KEY /
    // RoleForms.jsx) - falls back to their account name if they never
    // touched that form.
    const vmName = sessionStorage.getItem(DP_VM_NAME_KEY) || account?.username || user?.username;
    if (vmName) {
      navigate('/app/services/fl/orchestrator', { state: { role: 'data-provider', vmName } });
    }
  };

  // Resume after a full-page Azure redirect. signInProviderWithAzure uses
  // loginRedirect rather than a popup (see azureAuth.js), so a fresh sign-in
  // finishes here, on the next page load, rather than inline below.
  useEffect(() => {
    (async () => {
      try {
        const resumed = await completeProviderAzureSignIn();
        if (resumed) {
          setSigningIn(false);
          // The redirect reloaded the page, so the modal that was open before
          // navigating away is gone — reopen it with a stand-in notification
          // (built from the stashed context) so the sign-in confirmation and
          // VM provisioning progress are actually visible, not just fired
          // into state nobody's looking at.
          setSessionStartModal({
            open: true,
            notification: { id: resumed.context?.notificationId, message: "You've signed in with Azure for this FL session." },
          });
          await finishAzureSignIn(resumed.account, resumed.context);
        }
      } catch (err) {
        setAzureSignInResult({ ok: false, text: `Azure sign-in failed: ${err?.message || String(err)}` });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Provider signs in with their own Azure account in response to the
  // FL-session-start popup - separate identity from the output owner's Azure
  // login used for ARM/Terraform provisioning.
  const handleAzureSignIn = async () => {
    setSigningIn(true);
    const payload = parseNotificationPayload(sessionStartModal.notification);
    const context = {
      ownerUsername: payload.output_owner_id,
      submissionId: payload.submission_id,
      notificationId: sessionStartModal.notification?.id,
    };
    try {
      const result = await signInProviderWithAzure(context);
      if (result.redirected) return; // page is navigating to Microsoft
      await finishAzureSignIn(result.account, context);
    } catch (err) {
      setAzureSignInResult({ ok: false, text: `Azure sign-in failed: ${err?.message || String(err)}` });
    } finally {
      setSigningIn(false);
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
          fetchNotifications(true);
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

  // "fl_session_start" invites live only in the popup (see FLSessionStartModal
  // above) - they're deliberately excluded from the list so a provider never
  // sees the same invite sitting around twice, in the popup and in the feed.
  const visibleNotifications = notifications.filter(
    n => !dismissedIds.has(n.id) && parseNotificationPayload(n).kind !== "fl_session_start"
  );
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

      {!hasDataProvider && (
        <div className="card" style={{ marginBottom: "18px" }}>
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
        <div className="card" style={{ marginBottom: "18px" }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Output Owner</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
            {hasOutputOwner
              ? "Configure a federated learning session and select the data providers to invite."
              : "Fill in the federated learning configuration form."}
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
              {visibleNotifications.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "6px 12px", fontSize: "0.85rem" }}
                  onClick={() => handleClearAll(visibleNotifications.map(n => n.id))}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {showNotifications && (
            <div style={{ marginTop: "16px" }}>
              {notificationsLoading ? (
                <div style={{ padding: "12px", color: "#888", fontSize: "0.9rem" }}>Loading notifications...</div>
              ) : visibleNotifications.length === 0 ? (
                <div style={{ padding: "12px", color: "#888", fontSize: "0.9rem" }}>No notifications yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {visibleNotifications.map((notification) => {
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
                    // Governance layer's unified contract schema: parties is a
                    // fixed-shape object ({user, data_providers[], ...}), not a
                    // role-tagged map — read the arrays/fields directly.
                    const contractProviders = Array.isArray(contract?.parties?.data_providers) ? contract.parties.data_providers : [];
                    const draftingParty = contract?.parties?.user || null;
                    const sessionInfo = contract?.session_info || {};
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
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

                      {isRequest && (requestedList.length > 0 || selectedList.length > 0) && (() => {
                        const willingKeys = new Set(willingList.map(p => p.username || p.id));
                        return (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-light, #555)", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {requestedList.length > 0 && (
                            <div>
                              <strong>Requested to participate ({requestedList.length}):</strong>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                                {requestedList.map((p, i) => {
                                  const key = p.username || p.id;
                                  const isWilling = willingKeys.has(key);
                                  return (
                                    <span
                                      key={key || i}
                                      title={isWilling ? "Willing to participate" : "Not confirmed willing yet"}
                                      style={{
                                        padding: "2px 10px",
                                        borderRadius: "10px",
                                        fontSize: "0.75rem",
                                        fontWeight: 500,
                                        color: "white",
                                        backgroundColor: isWilling ? "var(--success-color, #27ae60)" : "#e74c3c",
                                      }}
                                    >
                                      {key}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {selectedList.length > 0 && (
                            <div>
                              <strong>Selected by output owner ({selectedList.length}):</strong> {selectedList.map(p => p.username || p.id).join(", ")}
                            </div>
                          )}
                        </div>
                        );
                      })()}

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
                          {contractProviders.length > 0 && (
                            <div>
                              <strong>Participating data providers ({contractProviders.length}):</strong>
                              <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
                                {contractProviders.map((p, i) => (
                                  <li key={p.id || p.name || i}>
                                    {p.name || p.id}{p.dataset_name ? ` — ${p.dataset_name}` : ""}
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

      <FLSessionStartModal
        open={sessionStartModal.open}
        notification={sessionStartModal.notification}
        onClose={() => setSessionStartModal({ open: false, notification: null })}
        onSignIn={handleAzureSignIn}
        signingIn={signingIn}
        result={azureSignInResult}
        vmName={dpVmName}
        onVmNameChange={setDpVmName}
      />
    </div>
  );
}
