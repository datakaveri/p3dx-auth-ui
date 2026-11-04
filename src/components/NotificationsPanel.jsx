import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { parseNotificationPayload } from "../hooks/useNotifications";
import "../styles/notifications.css";

const userKey = (p) => p?.username || p?.id;

function SessionDetails({ payload }) {
  const cfg = payload.session_config;
  const ownerLabel = payload.output_owner_id || "output owner";
  if (!cfg) {
    return (
      <div className="notif-details">
        <div className="notif-details__title">Session details</div>
        <div>Session details not available</div>
      </div>
    );
  }
  const selected = Array.isArray(payload.selected_providers) && payload.selected_providers.length
    ? payload.selected_providers
    : (Array.isArray(payload.requested_providers) ? payload.requested_providers : []);
  const willing = new Set((Array.isArray(payload.willing_providers) ? payload.willing_providers : []).map(userKey));
  return (
    <div className="notif-details">
      <div className="notif-details__title">Session details</div>
      <div><strong>Requested by:</strong> {ownerLabel}</div>
      {selected.length > 0 && (
        <div>
          <strong>Selected providers ({selected.length}):</strong>
          <ul>
            {selected.map((p, i) => (
              <li key={userKey(p) || i}>
                {userKey(p)}{p.dataset_name ? ` - ${p.dataset_name}` : ""}
                {willing.has(userKey(p)) ? <span title="Willing" style={{ color: "var(--success-color)", marginLeft: 6 }}>{"✓"} willing</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div><strong>Model:</strong> {cfg.model || "-"} ({cfg.framework || "-"})</div>
      <div>
        <strong>Training:</strong> {cfg.num_server_rounds} rounds, {cfg.local_epochs} local epochs, batch size {cfg.batch_size},
        learning rate {cfg.learning_rate}, fraction evaluate {cfg.fraction_evaluate}
      </div>
      {cfg.min_vcpus != null && cfg.min_vcpus !== "" && <div><strong>Min vCPUs:</strong> {cfg.min_vcpus}</div>}
    </div>
  );
}

export default function NotificationsPanel({ open, onClose, n }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-card" role="dialog" aria-modal="true" aria-label="Notifications" onClick={(e) => e.stopPropagation()}>
        <div className="notif-card__header">
          <h3 className="notif-card__title">Notifications</h3>
          <button type="button" className="notif-card__close" onClick={onClose} aria-label="Close">{"✕"}</button>
        </div>
        <div className="notif-card__body">
          {n.actionError && <div className="error-message">{n.actionError}</div>}
          {n.loading && n.notifications.length === 0 ? (
            <div className="notif-empty">Loading notifications...</div>
          ) : n.notifications.length === 0 ? (
            <div className="notif-empty">No notifications.</div>
          ) : (
            n.notifications.map((notification) => {
              const payload = parseNotificationPayload(notification);
              const kind = payload.kind;
              const isRequest = kind === "participation_request";
              const isUpdate = kind === "participation_update";
              const isAnswerable = isRequest || isUpdate;
              const isSignRequest = kind === "final_roster";
              const isSessionStart = kind === "fl_session_start";
              const isRemovedNotice = kind === "removed_from_session";
              const showDetails = isAnswerable || isSignRequest;
              const finalWarning = isAnswerable && !!payload.final_warning;
              const superseded = isAnswerable && n.latestAskBySession[payload.submission_id || ""] !== notification.id;
              const ownerLabel = payload.output_owner_id || notification.sender_username || "output owner";
              const busy = n.respondingId === notification.id;
              return (
                <div key={notification.id} className={`notif-row${notification.read ? "" : " notif-row--unread"}`}>
                  <div className="notif-row__head">
                    <div style={{ flex: 1 }}>
                      <div className="notif-row__time">{new Date(notification.created_at).toLocaleString()}</div>
                      <div className="notif-row__msg" style={{ fontWeight: notification.read ? 400 : 500 }}>{notification.message}</div>
                      <div className="notif-row__from">From: {ownerLabel}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {!isAnswerable && !notification.read && (
                        <button type="button" className="notif-btn notif-btn--primary" onClick={() => n.handleMarkRead(notification.id)}>
                          Mark read
                        </button>
                      )}
                      {(!isAnswerable || superseded) && (
                        <button type="button" className="notif-x" title="Dismiss" aria-label="Dismiss" onClick={() => n.handleDismiss(notification.id)}>
                          {"✕"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isUpdate && payload.removed_provider && (
                    <div className="notif-warn">
                      <strong>{payload.removed_provider}</strong> declined a second time and was removed from this session. The list below is the updated one.
                    </div>
                  )}
                  {isRemovedNotice && (
                    <div className="notif-warn">You have been removed from this session. You won't receive further requests for it.</div>
                  )}

                  {showDetails && <SessionDetails payload={payload} />}

                  {isSignRequest && (
                    <div>
                      <button
                        type="button"
                        className="notif-btn notif-btn--primary"
                        onClick={() => { onClose(); navigate("/app/services/contracts", { state: { returnTo: location.pathname } }); }}
                      >
                        Open in Contracts
                      </button>
                    </div>
                  )}

                  {isSessionStart && (
                    <div>
                      <button
                        type="button"
                        className="notif-btn notif-btn--primary"
                        onClick={() => { onClose(); n.openSessionStartModal(notification); }}
                      >
                        Go to session
                      </button>
                    </div>
                  )}

                  {isAnswerable && superseded && (
                    <div style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>
                      Replaced by a newer message for this session - answer the latest one.
                    </div>
                  )}

                  {isAnswerable && !superseded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {finalWarning && (
                        <div className="notif-warn">You declined an earlier request: if you decline again, you will be removed from the session.</div>
                      )}
                      <textarea
                        className="notif-textarea"
                        placeholder="Optional: a reason (e.g. why you can't participate)"
                        value={n.responseDrafts[notification.id] || ""}
                        onChange={(e) => n.setDraft(notification.id, e.target.value)}
                        rows={2}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="notif-btn notif-btn--yes"
                          onClick={() => n.handleRespond(notification.id, "accepted")}
                          disabled={busy || !n.canJoinFl}
                          title={n.canJoinFl ? undefined : "You need the infra-provider role and a filled infrastructure form to take part"}
                        >
                          {busy ? "Sending..." : "Yes (willing)"}
                        </button>
                        <button
                          type="button"
                          className="notif-btn notif-btn--no"
                          onClick={() => n.handleRespond(notification.id, "declined", finalWarning)}
                          disabled={busy}
                        >
                          No (not willing)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
