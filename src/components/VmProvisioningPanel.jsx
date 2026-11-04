import { useEffect, useRef, useState } from "react";
import { Copy, Check, Circle, CircleSlash, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { triggerAutoProvision, subscribeToVmProvisioning, downloadVmPrivateKey } from "../api/vmProvisioning";
import { issueVmCredential } from "../api/auth";
import { groupProvisioningEvents, friendlyFailure } from "./fl/provisioningPhases";
import { AZURE_DRY_RUN } from "../api/azureAuth";
import { flVmName } from "./fl/vmName";

const DEVICE_CODE_RE = /enter the code\s+([A-Z0-9-]{6,})/i;

const STATUS_ICON = {
  pending: <Circle size={16} />,
  running: <Loader2 size={16} className="prov-spin" />,
  complete: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  stopped: <CircleSlash size={16} />,
};

// Run status in plain words (the orchestrator's idle/running/done/error).
const STATUS_LABEL = { idle: "Starting", running: "In progress", done: "Complete", error: "Failed" };

// The orchestrator's own dry-run marker (DRY_RUN_VMS), e.g. "Dry run: using existing VM 1.2.3.4 — ...".
const DRY_RUN_EVENT_RE = /^Dry run:/i;

// A failed step: a short plain-language message, with the raw output
// (Terraform / SSH / Azure) behind a toggle for whoever has to debug it.
function FailureDetails({ step, raw }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="prov-failure">
      <div className="prov-failure__msg">{friendlyFailure(raw, step)}</div>
      {raw && (
        <>
          <button type="button" className="prov-failure__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide details" : "Show details"}
          </button>
          {open && <pre className="prov-failure__raw">{raw}</pre>}
        </>
      )}
    </div>
  );
}

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
// only to the controlplane; the browser gets back just a credential_id that is passed
// on to auto-create. Until then nothing auto-starts.
// resumeToken re-attaches to an existing run (page refresh / reopened run
// page): no auto-create and no credential step, just the stream + key download.
// The VM name is never typed here: for a session it is derived from the
// submission id (flVmName, matching the orchestrator); without one it falls
// back to initialVmName, then the username.
export default function VmProvisioningPanel({
  token,
  role,
  user = null,
  initialVmName = "",
  autoStart = false,
  submissionId = null,
  outputOwnerUsername = null,
  resumeToken = null,
  onRunToken = null,
  onRetry = null,
}) {
  const resuming = Boolean(resumeToken);
  const needsAuthorization = !resuming && role === "data-provider" && Boolean(submissionId);
  const vmName = (submissionId ? flVmName(submissionId) : "") || initialVmName.trim() || user?.username || "";
  const initialAutoStart = !resuming && !needsAuthorization && autoStart && Boolean(vmName);
  const [submitted, setSubmitted] = useState(initialAutoStart || resuming);
  const [starting, setStarting] = useState(initialAutoStart);
  const [startError, setStartError] = useState(null);
  const [session, setSession] = useState({ status: "idle", vmReady: false, events: [] });
  const [downloadError, setDownloadError] = useState(null);
  const [runToken, setRunToken] = useState(resumeToken || null);
  const [codeCopied, setCodeCopied] = useState(null);
  // User expand/collapse overrides per phase key; unset keys use the default.
  const [phaseOpen, setPhaseOpen] = useState({});
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
    if (!token || !role || (!trimmedName && !submissionId)) return;
    setStartError(null);
    triggerAutoProvision(role, token, trimmedName, runKeyRef.current, submissionId, credentialId, outputOwnerUsername)
      .then((data) => {
        if (data?.token) {
          setRunToken(data.token);
          if (onRunToken) onRunToken(data.token);
        }
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
    // Continue exactly as autoStart would; otherwise the Create VM button
    // below appears and uses this credential.
    const trimmedName = vmName;
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
      doStart(vmName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitted) return;
    if (needsAuthorization && !credential) return;
    const trimmedName = vmName;
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
      setDownloadError(
        resuming
          ? `${e.message}. The key can only be downloaded once, so it may already have been collected.`
          : e.message
      );
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(code);
      window.setTimeout(() => setCodeCopied(null), 2000);
    });
  };

  // Dry run: the orchestrator reuses an existing test VM (DRY_RUN_VMS) - no
  // Azure sign-in, no VM created, no fresh SSH key worth downloading.
  const dryRun = AZURE_DRY_RUN || session.events.some((e) => DRY_RUN_EVENT_RE.test(e.message || ""));
  const failed = session.status === "error";
  const phases = groupProvisioningEvents(session.events, role);
  // The orchestrator's run status stays "running" after a final "ok" event
  // (e.g. output collected), so a run whose every phase is done reads Complete.
  const statusLabel = !failed && phases.length && phases.every((ph) => ph.status === "complete")
    ? "Complete"
    : STATUS_LABEL[session.status] || session.status;

  return (
    <div className="card" style={{ marginBottom: "18px" }}>
      <h3 className="section-title" style={{ marginTop: 0 }}>Provisioning your VM</h3>
      {!resuming && (
      <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
        {dryRun ? (
          <>
            This is a test run: it uses an <strong>existing test VM</strong> instead of creating a
            new one, so no Azure sign-in or device code is needed.
          </>
        ) : (
          <>
            Creates one cheap VM in <strong>your own</strong> Azure subscription automatically.
            This needs one more Azure sign-in (a device code, separate from the one you
            just did) so Terraform can act on your behalf — watch below for the code.
          </>
        )}
      </div>
      )}

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

      {!submitted && !resuming && (!needsAuthorization || credential) && (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px", fontSize: "14px" }}>
            {vmName ? <>Your VM will be named <strong>{vmName}</strong></> : "No VM name available."}
          </div>
          <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={starting || !vmName}>
            {starting ? "Starting…" : "Create VM"}
          </button>
        </form>
      )}

      {resuming && vmName && (
        <div style={{ fontSize: "14px", marginBottom: "6px" }}>VM: <strong>{vmName}</strong></div>
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
            Status: <strong>{statusLabel}</strong>
          </div>
          <div className="prov-phases">
            {phases.map((phase) => {
              // Running/errored phases open by default; the user's toggle wins.
              const open = phaseOpen[phase.key] ?? (phase.status === "running" || phase.status === "error");
              const codeStep = phase.substeps.find((sub) => sub.status === "running" && DEVICE_CODE_RE.test(sub.message || ""));
              const code = codeStep?.message?.match(DEVICE_CODE_RE)?.[1];
              return (
                <div key={phase.key} className={`prov-phase prov-phase--${phase.status}`}>
                  <button
                    type="button"
                    className="prov-phase__head"
                    aria-expanded={open}
                    onClick={() => setPhaseOpen((m) => ({ ...m, [phase.key]: !open }))}
                  >
                    {STATUS_ICON[phase.status]}
                    <strong>{phase.label}</strong>
                    <span className="prov-phase__summary">{phase.summary}</span>
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {!open && code && (
                    <div className="prov-substeps" style={{ paddingTop: 0 }}>
                      {codeStep.message}{" "}
                      <button className="fl-code-copy" type="button" onClick={() => handleCopyCode(code)} title="Copy code">
                        {codeCopied === code ? <Check size={12} /> : <Copy size={12} />}
                        {codeCopied === code ? "Copied!" : "Copy code"}
                      </button>
                    </div>
                  )}
                  {open && (
                    <>
                      {phase.progress && (
                        <div className="prov-progress">
                          <div className="prov-progress__bar">
                            <div
                              className="prov-progress__fill"
                              style={{ width: `${Math.min(100, Math.round((phase.progress.round / phase.progress.max) * 100))}%` }}
                            />
                          </div>
                          <div className="prov-progress__label">Round {phase.progress.round} of {phase.progress.max}</div>
                        </div>
                      )}
                      <ul className="prov-substeps">
                        {phase.substeps.map((sub) => {
                          const subCode = sub.message?.match(DEVICE_CODE_RE)?.[1];
                          return (
                            <li key={sub.step} className={`prov-substep prov-substep--${sub.status}`}>
                              {STATUS_ICON[sub.status]}
                              <span>
                                <strong>{sub.step}</strong>
                                {sub.command && <code style={{ marginLeft: "6px", opacity: 0.8 }}>{sub.command}</code>}
                                {sub.message && sub.status !== "error" && <span style={{ marginLeft: "6px" }}>— {sub.message}</span>}
                              </span>
                              {sub.status === "error" && <FailureDetails step={sub.step} raw={sub.error} />}
                              {subCode && (
                                <button className="fl-code-copy" type="button" onClick={() => handleCopyCode(subCode)} title="Copy code">
                                  {codeCopied === subCode ? <Check size={12} /> : <Copy size={12} />}
                                  {codeCopied === subCode ? "Copied!" : "Copy code"}
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {failed && onRetry && (
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px" }}>This run did not finish.</span>
          <button className="btn btn-primary" type="button" style={{ width: "auto" }} onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {!dryRun && (session.vmReady || session.status === "done" || failed) && (
        <div style={{ marginTop: "12px" }}>
          {failed && (
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
