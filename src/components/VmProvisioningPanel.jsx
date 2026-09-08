import { useEffect, useRef, useState } from "react";
import { triggerAutoProvision, subscribeToVmProvisioning, downloadVmPrivateKey } from "../api/vmProvisioning";

const STEP_ICON = { running: "⏳", ok: "✅", error: "❌", done: "✅" };

// Once the participant names their VM, this asks the backend to create it in
// the participant's own Azure subscription (a device-code Azure sign-in for
// Terraform itself, then `terraform apply`) and shows the live progress log,
// fed over SSE by vmAutoProvision.service.js — nothing runs in this browser
// tab, and no command needs to be copy-pasted anywhere.
export default function VmProvisioningPanel({ user, token, role }) {
  const [vmName, setVmName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [session, setSession] = useState({ status: "idle", events: [] });
  const [downloadError, setDownloadError] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!user?.username || !role) return undefined;
    unsubRef.current = subscribeToVmProvisioning(user.username, role, (data) => {
      setSession({ status: data.status || "idle", events: data.events || [] });
    });
    return () => unsubRef.current && unsubRef.current();
  }, [user?.username, role]);

  // The VM is named after whatever the participant types here, not their
  // username/id, so provisioning only starts once they've submitted a name -
  // no more auto-fire on mount.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitted || !token || !role) return;
    const trimmedName = vmName.trim();
    if (!trimmedName) return;
    setSubmitted(true);
    setStarting(true);
    setStartError(null);
    triggerAutoProvision(role, token, trimmedName)
      .catch((e) => {
        setSubmitted(false);
        setStartError(e.message);
      })
      .finally(() => setStarting(false));
  };

  const handleDownloadKey = async () => {
    setDownloadError(null);
    try {
      await downloadVmPrivateKey(token);
    } catch (e) {
      setDownloadError(e.message);
    }
  };

  const deviceLoginEvent = session.events.find((e) => e.step === "Azure device login" && e.status === "running");

  return (
    <div className="card" style={{ marginBottom: "18px" }}>
      <h3 className="section-title" style={{ marginTop: 0 }}>Provisioning your VM</h3>
      <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
        Creates one cheap VM in <strong>your own</strong> Azure subscription automatically.
        This needs one more Azure sign-in (a device code, separate from the one you
        just did) so Terraform can act on your behalf — watch below for the code.
      </div>

      {!submitted && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 240px" }}>
            <label>VM Name</label>
            <input
              className="input"
              placeholder="e.g. my-training-vm"
              value={vmName}
              onChange={(e) => setVmName(e.target.value)}
              disabled={starting}
            />
          </div>
          <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={starting || !vmName.trim()}>
            {starting ? "Starting…" : "Create VM"}
          </button>
        </form>
      )}

      {submitted && starting && !session.events.length && <div style={{ fontSize: "13px" }}>Starting…</div>}

      {startError && (
        <div className="fl-result-banner fl-result-banner--error" style={{ marginTop: "10px" }}>
          {startError}
        </div>
      )}

      {deviceLoginEvent && (
        <div className="fl-result-banner fl-result-banner--ok" style={{ marginTop: "10px" }}>
          {deviceLoginEvent.message}
        </div>
      )}

      {session.events.length > 0 && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "13px", marginBottom: "6px" }}>
            Status: <strong>{session.status}</strong>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "13px" }}>
            {session.events.map((e, i) => (
              <li key={i} style={{ padding: "3px 0" }}>
                {STEP_ICON[e.status] || "•"} <strong>{e.step}</strong>
                {e.command && (
                  <code style={{ marginLeft: "6px", opacity: 0.8 }}>{e.command}</code>
                )}
                {e.message && <span style={{ marginLeft: "6px" }}>— {e.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.status === "done" && (
        <div style={{ marginTop: "12px" }}>
          <button
            className="btn btn-secondary"
            type="button"
            style={{ width: "auto" }}
            onClick={handleDownloadKey}
          >
            Download SSH Key
          </button>
          {downloadError && (
            <div className="fl-result-banner fl-result-banner--error" style={{ marginTop: "10px" }}>
              {downloadError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
