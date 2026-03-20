import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { getWorkloadResult } from "../api/workloads";

export default function WorkloadResult() {
  const { token } = useOutletContext();
  const { contractId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!token) {
      setError("MISSING_AUTH_TOKEN");
      setLoading(false);
      return;
    }

    if (!contractId) {
      setError("MISSING_CONTRACT_ID");
      setLoading(false);
      return;
    }

    getWorkloadResult(token, contractId)
      .then(res => {
        setResult(res);
      })
      .catch(err => {
        setError(err?.message || String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, contractId]);

  const signedContract = result?.signed_contract;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Workload Result</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Displays the TEE status and the final signed contract for this workload.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => navigate("/app/services")}
          >
            Back
          </button>
        </div>
      </div>

      {loading ? <div className="info-banner">Loading workload result...</div> : null}
      {error ? <div className="error-message">{error}</div> : null}

      {!loading && !error && result?.status === "SUCCESS" ? (
        <div>
          <div className="info-banner">
            <b>TEE started</b>. Contract: <b>{result.contract_id}</b>
            {result.app_id ? (
              <span>
                {" "}
                (App: <b>{result.app_id}</b>)
              </span>
            ) : null}
          </div>

          <div className="card" style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <div style={{ fontWeight: 700 }}>Signed Contract</div>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                type="button"
                onClick={() => navigate("/app/services/run")}
              >
                Run another workload
              </button>
            </div>

            <pre className="code-block">
              {signedContract ? JSON.stringify(signedContract, null, 2) : "No contract returned"}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
