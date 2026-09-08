import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { submitPolicy } from "../api/policies";
import { applications as APPLICATIONS } from "../data/catalogueData";

const ORGS = [
  { id: "datakaveri", label: "@gmail.com" },
  { id: "city-hospital", label: "@datakaveri.org" },
  { id: "research-lab", label: "@yahoo.com" },
  { id: "university", label: "@university.edu" },
];

// Splits a comma-separated string into a trimmed, non-empty string array.
const toList = value => value.split(",").map(s => s.trim()).filter(Boolean);

export default function PolicyForm() {
  const { user, isAdmin, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");

  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [form, setForm] = useState({
    datasetId: "",
    datasetName: "",
    dataUrl: "",
    application: APPLICATIONS[0].id,
    allowedOrg: ORGS[0].id,
    accessLevel: "read",
    expiresAt: "",
    purpose: "research",
    notes: "",
    providerId: "",
    providerEmail: "",
    isPrivate: false,
    allowedUsers: "",
    allowedRoles: "",
    requiredRoles: "",
    allowedScopes: "",
    requiredScopes: "",
    allowedActions: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      navigate("/app/admin", { replace: true });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!hasDataProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [hasDataProvider, returnTo]);

  const onSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);

    const application = APPLICATIONS.find(a => a.id === form.application);
    const org = ORGS.find(o => o.id === form.allowedOrg);

    const payload = {
      policyId: `policy-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      itemId: form.datasetId,
      issuedBy: user?.username || user?.email || "unknown",
      dataset_id: form.datasetId,
      provider_id: form.providerId,
      provider_email: form.providerEmail,
      is_private: form.isPrivate,
      data_url: form.dataUrl,
      rules: {
        dataset: {
          id: form.datasetId,
          name: form.datasetName,
        },
        application: {
          id: form.application,
          name: application?.name,
        },
        allowedOrg: {
          id: form.allowedOrg,
          emailDomain: org?.label,
        },
        accessLevel: form.accessLevel,
        purpose: form.purpose,
        notes: form.notes,
        allowed_users: toList(form.allowedUsers),
        allowed_roles: toList(form.allowedRoles),
        required_roles: toList(form.requiredRoles),
        allowed_scopes: toList(form.allowedScopes),
        required_scopes: toList(form.requiredScopes),
        allowed_actions: toList(form.allowedActions),
      },
      ...(form.expiresAt
        ? { expiresAt: new Date(`${form.expiresAt}T00:00:00.000Z`).toISOString() }
        : {}),
    };

    try {
      await submitPolicy(token, payload);
      window.setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 1800);
    } catch (err) {
      setSubmitted(false);
      setError(err?.message || String(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Set Policy</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Submit a dataset access policy to APD so TOP can validate workload contracts.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            disabled={submitted}
            onClick={() => navigate(returnTo)}
          >
            Back
          </button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {submitted ? <div className="info-banner">Policy stored in APD successfully. Redirecting...</div> : null}

      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Dataset ID</label>
              <input
                className="input"
                placeholder="e.g. ds-my-dataset"
                value={form.datasetId}
                onChange={e => setForm(f => ({ ...f, datasetId: e.target.value }))}
                disabled={submitted}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Dataset name</label>
              <input
                className="input"
                placeholder="e.g. My Research Dataset"
                value={form.datasetName}
                onChange={e => setForm(f => ({ ...f, datasetName: e.target.value }))}
                disabled={submitted}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Data URL</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. https://storage.example.com/dataset.csv"
                value={form.dataUrl}
                onChange={e => setForm(f => ({ ...f, dataUrl: e.target.value }))}
                disabled={submitted}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Application (Model)</label>
            <select
              className="select"
              value={form.application}
              onChange={e => setForm(f => ({ ...f, application: e.target.value }))}
              disabled={submitted}
            >
              {APPLICATIONS.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Allowed organisation (by email domain)</label>
            <select
              className="select"
              value={form.allowedOrg}
              onChange={e => setForm(f => ({ ...f, allowedOrg: e.target.value }))}
              disabled={submitted}
            >
              {ORGS.map(o => (
                <option key={o.id} value={o.id}>
                  Users with emails ending {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid" style={{ marginTop: "12px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Access level</label>
              <select
                className="select"
                value={form.accessLevel}
                onChange={e => setForm(f => ({ ...f, accessLevel: e.target.value }))}
                disabled={submitted}
              >
                <option value="read">Read</option>
                <option value="read-write">Read + Write</option>
                <option value="aggregate">Aggregate only</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Expires on (optional)</label>
              <input
                className="input"
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                disabled={submitted}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "12px" }}>
            <label>Purpose</label>
            <select
              className="select"
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              disabled={submitted}
            >
              <option value="research">Research</option>
              <option value="clinical">Clinical</option>
              <option value="benchmarking">Benchmarking</option>
              <option value="internal">Internal testing</option>
            </select>
          </div>

          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Access Rules</div>

            <div className="grid">
              <div className="form-group">
                <label>Provider ID</label>
                <input
                  className="input"
                  type="text"
                  value={form.providerId}
                  onChange={e => setForm(f => ({ ...f, providerId: e.target.value }))}
                  placeholder="e.g. provider-123"
                  disabled={submitted}
                />
              </div>

              <div className="form-group">
                <label>Provider Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.providerEmail}
                  onChange={e => setForm(f => ({ ...f, providerEmail: e.target.value }))}
                  placeholder="provider@example.com"
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))}
                  disabled={submitted}
                />
                Private dataset
              </label>
            </div>

            <div className="form-group">
              <label>Allowed Users (comma-separated)</label>
              <input
                className="input"
                type="text"
                value={form.allowedUsers}
                onChange={e => setForm(f => ({ ...f, allowedUsers: e.target.value }))}
                placeholder="e.g. alice, bob"
                disabled={submitted}
              />
            </div>

            <div className="grid">
              <div className="form-group">
                <label>Allowed Roles (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.allowedRoles}
                  onChange={e => setForm(f => ({ ...f, allowedRoles: e.target.value }))}
                  placeholder="e.g. data-provider, admin"
                  disabled={submitted}
                />
              </div>

              <div className="form-group">
                <label>Required Roles (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.requiredRoles}
                  onChange={e => setForm(f => ({ ...f, requiredRoles: e.target.value }))}
                  placeholder="e.g. output-owner"
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="grid">
              <div className="form-group">
                <label>Allowed Scopes (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.allowedScopes}
                  onChange={e => setForm(f => ({ ...f, allowedScopes: e.target.value }))}
                  placeholder="e.g. read, compute"
                  disabled={submitted}
                />
              </div>

              <div className="form-group">
                <label>Required Scopes (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.requiredScopes}
                  onChange={e => setForm(f => ({ ...f, requiredScopes: e.target.value }))}
                  placeholder="e.g. openid"
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Allowed Actions (comma-separated)</label>
              <input
                className="input"
                type="text"
                value={form.allowedActions}
                onChange={e => setForm(f => ({ ...f, allowedActions: e.target.value }))}
                placeholder="e.g. compute, aggregate"
                disabled={submitted}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "12px" }}>
            <label>Notes</label>
            <textarea
              className="input"
              style={{ minHeight: "96px" }}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional constraints..."
              disabled={submitted}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <button
              className="btn btn-secondary"
              style={{ width: "auto" }}
              type="button"
              disabled={submitted}
              onClick={() => navigate(returnTo)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={submitted}>
              {submitted ? "Setting..." : "Set Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
