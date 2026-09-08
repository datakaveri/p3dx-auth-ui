import { X } from "lucide-react";

// VM provisioning progress is deliberately NOT shown here - it lives in the
// normal dashboard page (FederatedLearningDashboard's own section, fed by
// the same vm-provisioning SSE subscription) so it stays visible after this
// popup is closed, instead of disappearing with it.
//
// The VM Name field IS shown here (as well as on the separate Data Provider
// Form) - editing it right where "Sign in with Azure" is clicked means the
// name that actually gets used can't be missed by skipping a different part
// of the page. Both write to the same DP_VM_NAME_KEY sessionStorage entry
// that startVmProvisioning reads at sign-in time.
export default function FLSessionStartModal({ open, notification, onClose, onSignIn, signingIn, result, vmName, onVmNameChange }) {
  if (!open || !notification) return null;

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
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>VM Name</label>
            <input
              className="input"
              placeholder="e.g. alice-data-provider"
              value={vmName}
              onChange={(e) => onVmNameChange(e.target.value)}
              disabled={signingIn || result?.ok}
            />
            <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
              This is what your VM will be named once you sign in.
            </div>
          </div>
          {result && (
            <p style={{ color: result.ok ? "var(--success-color, #27ae60)" : "var(--danger-color, #e74c3c)" }}>
              {result.text}
              {result.ok && " Check the VM provisioning section on this page for progress."}
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
