import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { runWorkload } from "../api/workloads";

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
  const { isAdmin, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [form, setForm] = useState({
    dataset: DATASETS[0].id,
    application: APPLICATIONS[0].id,
  });

  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

  const onSubmit = async e => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitted(true);

    try {
      if (!token) {
        throw new Error("MISSING_AUTH_TOKEN");
      }

      const res = await runWorkload(token, {
        datasetId: form.dataset,
        applicationId: form.application,
      });

      setResult(res);

      const contractId = res?.contract?.contract_id;
      if (contractId) {
        navigate(`/app/services/run/${contractId}`);
      }
    } catch (err) {
      setError(err.message || "Run workload failed");
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Run Workload</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Select a dataset and application to generate a signed contract and start the TEE flow.
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

      {error ? (
        <div className="error-message">{error}</div>
      ) : null}

      {result?.contract?.contract_id ? (
        <div className="info-banner">
          Contract created: <b>{result.contract.contract_id}</b>. Dataset: {selectedDataset}. Application: {selectedApp}.
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
            <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={submitted}>
              {submitted ? "Running..." : "Run Workload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
