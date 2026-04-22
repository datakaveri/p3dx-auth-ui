import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { getWorkloadResult } from "../api/workloads";

export default function WorkloadResult() {
  const { token } = useOutletContext();
  const { contractId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const contractText = signedContract
    ? JSON.stringify(signedContract, null, 2)
    : "No contract returned";

  const handleCopy = () => {
    navigator.clipboard.writeText(contractText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Workload Result</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            TEE status and signed contract for this workload.
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
          <div className="result-success-banner">
            <div className="result-success-icon">
              <CheckCircle2 size={18} />
            </div>
            <div className="result-success-text">
              <b>TEE started — Contract {result.contract_id}</b>
              <span>
                {result.app_id ? `Application: ${result.app_id}` : "Workload is running inside the TEE."}
              </span>
            </div>
          </div>

          <div className="card" style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>Signed Contract</div>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                type="button"
                onClick={() => navigate("/app/services/run")}
              >
                Run another workload
              </button>
            </div>

            <div className="code-block-wrap">
              <button
                className="code-block-copy"
                type="button"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <pre className="code-block">{contractText}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
