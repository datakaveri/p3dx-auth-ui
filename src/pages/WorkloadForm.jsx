import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

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

export default function WorkloadForm() {
  const { isAdmin } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [form, setForm] = useState({
    dataset: DATASETS[0].id,
    application: APPLICATIONS[0].id,
  });

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      navigate("/app/admin", { replace: true });
    }
  }, [isAdmin]);

  const selectedDataset = useMemo(
    () => DATASETS.find(d => d.id === form.dataset)?.name,
    [form.dataset]
  );

  const selectedApp = useMemo(
    () => APPLICATIONS.find(a => a.id === form.application)?.name,
    [form.application]
  );

  const onSubmit = e => {
    e.preventDefault();
    setSubmitted(true);

    window.setTimeout(() => {
      navigate(returnTo, { replace: true });
    }, 900);
  };

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <h3 className="section-title">Run Workload</h3>
        <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
          Proof-of-concept. This does not create a contract or run anything yet.
        </div>
      </div>

      {submitted ? (
        <div className="info-banner">
          Workload started (dummy). Dataset: {selectedDataset}. Application: {selectedApp}. Redirecting...
        </div>
      ) : null}

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
              {submitted ? "Running..." : "Run Workload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
