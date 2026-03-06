import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { submitPolicy } from "../api/policies";

const DATASETS = [
  { id: "ds-1", name: "Dataset A (Claims)" },
  { id: "ds-2", name: "Dataset B (Vitals)" },
  { id: "ds-3", name: "Dataset C (Lab Results)" },
  { id: "ds-4", name: "Dataset D (Imaging Metadata)" },
];

const APPLICATIONS = [
  { id: "app-1", name: "Model 1 (Risk Prediction)" },
  { id: "app-2", name: "Model 2 (Readmission)" },
  { id: "app-3", name: "Model 3 (Diabetes)" },
  { id: "app-4", name: "Model 4 (NLP Classifier)" },
];

const ORGS = [
  { id: "datakaveri", label: "@datakaveri.org" },
  { id: "city-hospital", label: "@city-hospital.org" },
  { id: "research-lab", label: "@researchlab.ai" },
  { id: "university", label: "@university.edu" },
  { id: "partner", label: "@partner.example" },
];

export default function PolicyForm() {
  const { user, isAdmin, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");

  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [form, setForm] = useState({
    dataset: DATASETS[0].id,
    application: APPLICATIONS[0].id,
    allowedOrg: ORGS[0].id,
    accessLevel: "read",
    expiresAt: "",
    purpose: "research",
    notes: "",
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

    const dataset = DATASETS.find(d => d.id === form.dataset);
    const application = APPLICATIONS.find(a => a.id === form.application);
    const org = ORGS.find(o => o.id === form.allowedOrg);

    const payload = {
      policyId: `policy-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      itemId: form.dataset,
      issuedBy: user?.username || user?.email || "unknown",
      rules: {
        dataset: {
          id: form.dataset,
          name: dataset?.name,
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
      },
      ...(form.expiresAt
        ? { expiresAt: new Date(`${form.expiresAt}T00:00:00.000Z`).toISOString() }
        : {}),
    };

    try {
      await submitPolicy(token, payload);
      window.setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 700);
    } catch (err) {
      setSubmitted(false);
      setError(err?.message || String(err));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <h3 className="section-title">Set Policy</h3>
        <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
          Proof-of-concept form. This does not store anything yet.
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {submitted ? <div className="info-banner">Policy submitted. Redirecting...</div> : null}

      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Dataset</label>
            <select
              className="select"
              value={form.dataset}
              onChange={e => setForm(f => ({ ...f, dataset: e.target.value }))}
              disabled={submitted}
            >
              {DATASETS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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

          <div className="form-group">
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

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
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
