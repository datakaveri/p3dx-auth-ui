import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { triggerAutoProvision, subscribeToVmProvisioning, downloadVmPrivateKey } from "../api/vmProvisioning";
import { issueVmCredential } from "../api/auth";

const DEVICE_CODE_RE = /enter the code\s+([A-Z0-9-]{6,})/i;

const STEP_ICON = { running: "⏳", ok: "✅", error: "❌", done: "✅" };

const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Incorrect password.",
  NOT_A_CONTRACT_PARTY: "You are not a data provider on this session's signed contract.",
  CONTRACT_NOT_SIGNED: "The session's contract is not fully signed yet.",
  CONTRACT_EXPIRED: "This session's contract has expired.",
};

function authErrorMessage(e) {
  return AUTH_ERROR_MESSAGES[e?.code] || `Could not authorize this VM (${e?.code || "UNKNOWN"}). Try again.`;
}

// auto-create rejected the VM credential - the provider must authorize again.
const CREDENTIAL_ERROR_MESSAGES = {
  MISSING_CREDENTIAL: "This VM has not been authorized yet. Re-enter your password to authorize it.",
  CREDENTIAL_NOT_CLAIMABLE: "This VM authorization is no longer valid. Re-enter your password to authorize it again.",
};

function formatExpiry(expiresAt) {
  const d = new Date(expiresAt);
  return Number.isNaN(d.getTime()) ? String(expiresAt) : d.toLocaleString();
}

// Once the participant names their VM, this asks the backend to create it in
// the participant's own Azure subscription (a device-code Azure sign-in for
// Terraform itself, then `terraform apply`) and shows the live progress log,
// fed over SSE by vmAutoProvision.service.js — nothing runs in this browser
// tab, and no command needs to be copy-pasted anywhere.
// initialVmName/autoStart let a caller that already collected the VM name
// elsewhere (e.g. the output-owner's config form, or the data-provider form)
// skip straight to provisioning instead of asking again here.
// A data-provider VM tied to a session (submissionId) additionally needs a VM
// credential first: the provider re-enters their P3DX password, which goes
// only to p3dx-aaa; the browser gets back just a credential_id that is passed
// on to auto-create. Until then nothing auto-starts.
export default function VmProvisioningPanel({ token, role, initialVmName = "", autoStart = false, submissionId = null }) {
  const needsAuthorization = role === "data-provider" && Boolean(submissionId);
  const initialAutoStart = !needsAuthorization && autoStart && Boolean(initialVmName.trim());
  const [vmName, setVmName] = useState(initialVmName);
  const [submitted, setSubmitted] = useState(initialAutoStart);
  const [starting, setStarting] = useState(initialAutoStart);
  const [startError, setStartError] = useState(null);
  const [session, setSession] = useState({ status: "idle", vmReady: false, events: [] });
  const [downloadError, setDownloadError] = useState(null);
  const [runToken, setRunToken] = useState(null);
  const [codeCopied, setCodeCopied] = useState(null);
  // VM authorization (data-provider + submissionId only). The password lives
  // only in this component's state and is cleared as soon as the call settles.
  const [password, setPassword] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [credential, setCredential] = useState(null); // { credentialId, expiresAt }
  const unsubRef = useRef(null);
  const autoStarted = useRef(false);
  // Identifies this component instance to the backend so a duplicate call
  // (StrictMode's double-invoke, a stray double-click) doesn't spawn a second
  // `az login` for the same run - other panel instances (other runToken/
  // runKey pairs) are unaffected and provision concurrently. Generated once
  // per mount, not per render.
  const runKeyRef = useRef(crypto.randomUUID());

  // Subscribe once this run has its own token (from triggerAutoProvision's
  // response) rather than by username+role - with several runs able to be in
  // flight at once now, "most recent for this username+role" could easily
  // resolve to a different panel's run.
  useEffect(() => {
    if (!runToken) return undefined;
    unsubRef.current = subscribeToVmProvisioning({ runToken }, (data) => {
      setSession({ status: data.status || "idle", vmReady: Boolean(data.vmReady), events: data.events || [] });
    });
    return () => unsubRef.current && unsubRef.current();
  }, [runToken]);

  const doStart = (trimmedName, credentialId = null) => {
    if (!token || !role || !trimmedName) return;
    setStartError(null);
    triggerAutoProvision(role, token, trimmedName, runKeyRef.current, submissionId, credentialId)
      .then((data) => {
        if (data?.token) setRunToken(data.token);
      })
      .catch((e) => {
        setSubmitted(false);
        if (needsAuthorization) {
          // A credential is claimed once by auto-create, so any failed start
          // needs a fresh authorization before retrying.
          setCredential(null);
          setAuthError(CREDENTIAL_ERROR_MESSAGES[e.code] || null);
          if (!CREDENTIAL_ERROR_MESSAGES[e.code]) setStartError(e.message);
        } else {
          setStartError(e.message);
        }
      })
      .finally(() => setStarting(false));
  };

  const handleAuthorize = async (e) => {
    e.preventDefault();
    if (authorizing || !password) return;
    setAuthorizing(true);
    setAuthError(null);
    setStartError(null);
    let issued = null;
    try {
      issued = await issueVmCredential(submissionId, password, token);
    } catch (err) {
      setAuthError(authErrorMessage(err));
    } finally {
      setPassword("");
      setAuthorizing(false);
    }
    if (!issued) return;
    setCredential({ credentialId: issued.credential_id, expiresAt: issued.expires_at });
    // Continue exactly as autoStart would when the VM name is already known;
    // otherwise the VM name form below appears and uses this credential.
    const trimmedName = vmName.trim();
    if (autoStart && trimmedName) {
      setSubmitted(true);
      setStarting(true);
      doStart(trimmedName, issued.credential_id);
    }
  };

  // The VM is named after whatever the participant types here, not their
  // username/id, so provisioning only starts once they've submitted a name -
  // unless a name was already chosen upstream and autoStart says to skip the form.
  useEffect(() => {
    if (initialAutoStart && !autoStarted.current) {
      autoStarted.current = true;
      doStart(initialVmName.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitted) return;
    if (needsAuthorization && !credential) return;
    const trimmedName = vmName.trim();
    if (!trimmedName) return;
    setSubmitted(true);
    setStarting(true);
    doStart(trimmedName, credential?.credentialId || null);
  };

  const handleDownloadKey = async () => {
    setDownloadError(null);
    try {
      await downloadVmPrivateKey(token, runToken);
    } catch (e) {
      setDownloadError(e.message);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(code);
      window.setTimeout(() => setCodeCopied(null), 2000);
    });
  };

  return (
    <div className="card" style={{ marginBottom: "18px" }}>
      <h3 className="section-title" style={{ marginTop: 0 }}>Provisioning your VM</h3>
      <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
        Creates one cheap VM in <strong>your own</strong> Azure subscription automatically.
        This needs one more Azure sign-in (a device code, separate from the one you
        just did) so Terraform can act on your behalf — watch below for the code.
      </div>

      {needsAuthorization && !credential && (
        <form onSubmit={handleAuthorize} style={{ marginBottom: "12px" }}>
          <h4 style={{ margin: "0 0 6px" }}>Authorize this VM</h4>
          <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "10px" }}>
            Re-enter your P3DX password so this VM can rejoin training on your behalf, even after you
            log out. The VM&apos;s access ends automatically when the contract expires.
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0, flex: "1 1 240px" }}>
              <label>P3DX Password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authorizing}
              />
            </div>
            <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={authorizing || !password}>
              {authorizing ? "Authorizing…" : "Authorize VM"}
            </button>
          </div>
        </form>
      )}

      {authError && (
        <div className="fl-result-banner fl-result-banner--error" style={{ marginBottom: "10px" }}>
          {authError}
        </div>
      )}

      {needsAuthorization && credential && (
        <div className="fl-result-banner fl-result-banner--ok" style={{ marginBottom: "10px" }}>
          VM authorized. Access valid until {formatExpiry(credential.expiresAt)}.
        </div>
      )}

      {!submitted && (!needsAuthorization || credential) && (
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

      {session.events.length > 0 && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "13px", marginBottom: "6px" }}>
            Status: <strong>{session.status}</strong>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "13px" }}>
            {session.events.map((e, i) => {
              const code = e.message?.match(DEVICE_CODE_RE)?.[1];
              return (
                <li key={i} style={{ padding: "3px 0", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <span>
                    {STEP_ICON[e.status] || "•"} <strong>{e.step}</strong>
                    {e.command && (
                      <code style={{ marginLeft: "6px", opacity: 0.8 }}>{e.command}</code>
                    )}
                    {e.message && <span style={{ marginLeft: "6px" }}>— {e.message}</span>}
                  </span>
                  {code && (
                    <button
                      className="fl-code-copy"
                      type="button"
                      onClick={() => handleCopyCode(code)}
                      title="Copy code"
                    >
                      {codeCopied === code ? <Check size={12} /> : <Copy size={12} />}
                      {codeCopied === code ? "Copied!" : "Copy code"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(session.vmReady || session.status === "done" || session.status === "error") && (
        <div style={{ marginTop: "12px" }}>
          {session.status === "error" && (
            <div style={{ fontSize: "13px", marginBottom: "8px", opacity: 0.85 }}>
              The VM may already exist even though provisioning failed — download the key below to SSH in and check.
            </div>
          )}
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
