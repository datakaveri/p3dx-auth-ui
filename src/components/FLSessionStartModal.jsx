import { X } from "lucide-react";
import { flVmName } from "./fl/vmName";

// VM provisioning progress is deliberately NOT shown here - it lives on the
// FL Orchestrator page the provider is sent to after signing in. The VM name
// is derived from the session (see flVmName), not typed by the provider.
export default function FLSessionStartModal({ open, notification, onClose, onSignIn, signingIn, result, submissionId }) {
  if (!open || !notification) return null;
  const vmName = flVmName(submissionId);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="modal-title">FL Session Started</div>
          <button type="button" className="cat-icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p>{notification.message}</p>
          <p>Sign in with your Azure account to join this session.</p>
          {vmName && (
            <p style={{ fontSize: "13px", color: "var(--text-light)" }}>
              Your VM will be named <code>{vmName}</code>
            </p>
          )}
          {result && (
            <p style={{ color: result.ok ? "var(--success-color, #27ae60)" : "var(--danger-color, #e74c3c)" }}>
              {result.text}
            </p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" style={{ width: "auto" }} onClick={onClose}>
            Later
          </button>
          <button
            className="btn btn-primary"
            style={{ width: "auto" }}
            onClick={onSignIn}
            disabled={signingIn || result?.ok}
          >
            {signingIn ? "Signing in..." : "Sign in with Azure"}
          </button>
        </div>
      </div>
    </div>
  );
}
