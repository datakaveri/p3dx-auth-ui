import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import VmProvisioningPanel from "../components/VmProvisioningPanel";
import { getMyRuns } from "../api/vmProvisioning";
import { getSessionContract } from "../api/auth";

// How the caller relates to a session, from its contract's parties:
// "owner" | "provider" | "none", or null when that can't be told (no contract
// yet, or it couldn't be read) - the page then behaves as before.
function sessionRelation(contract, user) {
  const parties = contract?.parties;
  if (!parties || !user) return null;
  const mine = new Set([user.username, user.sub, user.id, user.userId].filter(Boolean));
  if (mine.has(parties.user?.name) || mine.has(parties.user?.id)) return "owner";
  if ((parties.data_providers || []).some((p) => mine.has(p.name) || mine.has(p.id))) return "provider";
  return "none";
}

// Dedicated landing spot for the "one more Azure sign-in + VM creation" step,
// reached right after a data-provider finishes their own Azure sign-in (or an
// output-owner starts an FL session) - kept off the main FL pages so those stay
// focused on the FL workflow itself rather than Terraform/VM plumbing.
//
// With a :submissionId route param the page first looks up the caller's latest
// run for that session and re-attaches to it (so a refresh or a reopened link
// keeps the progress). `viewAs="owner"` (services/fl/run/:submissionId) is the
// read-only output-owner view: it only ever resumes an existing run.
// When the caller has no run there, the session's contract tells whether they
// are part of it at all, so a stranger is told so instead of "no run yet".
export default function FlOrchestrator({ viewAs = "provider" }) {
  const { user, token } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { submissionId: routeSubmissionId } = useParams();
  const ownerView = viewAs === "owner";

  const params = new URLSearchParams(location.search);
  const role = ownerView ? "user" : location.state?.role || params.get("role") || "data-provider";
  const submissionId = routeSubmissionId || location.state?.submissionId || params.get("submissionId") || null;
  const roleLabel = role === "user" ? "output-owner" : "data-provider";
  // Set by the notification flow right after the provider's Azure sign-in
  // (useNotifications.finishAzureSignIn), which closes its modal on the way here.
  const signedInAs = location.state?.azureSignedInAs || null;

  // undefined = still looking up; null = no existing run; string = run token.
  const [resumeToken, setResumeToken] = useState(routeSubmissionId ? undefined : null);
  // undefined = still looking up (only when there is no run); see sessionRelation.
  const [relation, setRelation] = useState(undefined);
  // Bumped by Retry: mounts a fresh panel that starts a new run.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!routeSubmissionId || !token) return undefined;
    let cancelled = false;
    getMyRuns(token, { submissionId: routeSubmissionId })
      .then((runs) => {
        if (cancelled) return;
        const run = runs.find((r) => r.role === role);
        setResumeToken(run?.token || null);
      })
      .catch(() => { if (!cancelled) setResumeToken(null); });
    return () => { cancelled = true; };
  }, [routeSubmissionId, token, role]);

  // Only needed when there is no run of the caller's to show.
  useEffect(() => {
    if (!routeSubmissionId || !token || resumeToken !== null) return undefined;
    let cancelled = false;
    getSessionContract(routeSubmissionId, token)
      .then((data) => { if (!cancelled) setRelation(sessionRelation(data?.contract, user)); })
      .catch(() => { if (!cancelled) setRelation(null); });
    return () => { cancelled = true; };
  }, [routeSubmissionId, token, resumeToken, user]);

  const lookingUp = resumeToken === undefined || (resumeToken === null && routeSubmissionId && relation === undefined);
  const notParty = resumeToken === null && relation === "none";
  // A data provider on the owner-only run page: their own run lives elsewhere.
  const providerOnOwnerView = ownerView && resumeToken === null && relation === "provider";

  const retry = () => {
    setResumeToken(null);
    setAttempt((n) => n + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>{ownerView ? "FL Run" : "FL Orchestrator"}</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            {ownerView
              ? "Progress of this federated learning run."
              : `Creating and registering your ${roleLabel} VM for this federated learning run.`}
          </div>
        </div>
      </div>

      {signedInAs && !lookingUp && !notParty && (
        <div className="fl-result-banner fl-result-banner--ok" style={{ marginTop: 0, marginBottom: "12px" }}>
          Signed in as {signedInAs}.
        </div>
      )}

      {lookingUp ? (
        <div style={{ fontSize: "13px", color: "var(--text-light)", marginBottom: "18px" }}>Loading run…</div>
      ) : notParty ? (
        <div className="card" style={{ marginBottom: "18px", fontSize: "14px" }}>
          <strong>You&apos;re not part of this session.</strong>
          <div style={{ color: "var(--text-light)", marginTop: "4px" }}>
            Only the session&apos;s owner and the data providers on its contract can follow this run.
          </div>
        </div>
      ) : providerOnOwnerView ? (
        <div className="card" style={{ marginBottom: "18px", fontSize: "14px" }}>
          This page is for the session&apos;s owner.{" "}
          <Link to={`/app/services/fl/orchestrator/${encodeURIComponent(routeSubmissionId)}`}>Open your own run</Link>.
        </div>
      ) : resumeToken ? (
        <VmProvisioningPanel
          user={user}
          token={token}
          role={role}
          submissionId={submissionId}
          resumeToken={resumeToken}
          onRetry={ownerView ? null : retry}
        />
      ) : ownerView ? (
        <div className="card" style={{ marginBottom: "18px", fontSize: "14px", color: "var(--text-light)" }}>
          No run has been started for this session yet.
        </div>
      ) : (
        <VmProvisioningPanel
          key={attempt}
          user={user}
          token={token}
          role={role}
          initialVmName={location.state?.vmName || params.get("vmName") || ""}
          autoStart={Boolean(location.state?.vmName || params.get("vmName") || submissionId)}
          submissionId={submissionId}
          onRetry={retry}
        />
      )}

      <button className="btn btn-secondary" type="button" style={{ width: "auto" }} onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}
