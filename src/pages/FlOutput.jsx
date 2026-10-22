import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { exportFlOutput, getFlOutput, flSessionId } from "../api/flOutput";
import FlOutputView from "../components/fl/FlOutputView";
import LayerSummaryModal from "../components/fl/LayerSummaryModal";
import { finalRound } from "../components/fl/flOutputFormat";

const FL_PAGE = "/app/services/fl/federated-learning";

// Output of a finished FL session for the Output Owner, opened from the FL
// page's "View output" button. The session name comes along in router state
// (the FL page's form); without it the title falls back to "FL session".
export default function FlOutput() {
  const { submissionId } = useParams();
  const { token } = useOutletContext();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const authToken = sessionStorage.getItem("access_token") || token;

  useEffect(() => {
    let cancelled = false;
    getFlOutput(submissionId, sessionStorage.getItem("access_token") || token)
      .then((data) => { if (!cancelled) setOutput(data); })
      .catch((err) => { if (!cancelled) setError(err); });
    return () => { cancelled = true; };
  }, [submissionId, token]);

  const sid = output?.session_id || flSessionId(submissionId);
  const roundCount = output?.rounds?.total || output?.rounds?.done;
  const round = finalRound(output);
  const ready = output?.status === "ready";

  return (
    <div>
      {summaryOpen && (
        <LayerSummaryModal sessionId={sid} token={authToken} onClose={() => setSummaryOpen(false)} />
      )}

      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            Output &middot; {state?.sessionName || "FL session"}
            {roundCount ? ` · ${roundCount} round${roundCount === 1 ? "" : "s"}` : ""}
          </h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Session <span className="fl-output__mono">{sid}</span>
            {round != null ? ` · final global model, round ${round}` : " · final global model"}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" style={{ width: "auto" }} type="button" onClick={() => navigate(FL_PAGE)}>
            Back
          </button>
          {ready && (
            <button
              className="btn btn-primary"
              style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: "8px" }}
              type="button"
              onClick={() => exportFlOutput(output, sid)}
            >
              <Download size={16} strokeWidth={2.2} aria-hidden="true" />
              Export
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="fl-result-banner fl-result-banner--error" role="alert">&#9888; {error.message}</div>
      ) : !output ? (
        <div className="fl-section-sub" style={{ marginTop: "20px" }}>Loading session output&hellip;</div>
      ) : !ready ? (
        <div className="fl-section-sub" style={{ marginTop: "20px" }}>
          Output not collected yet &mdash; go back to Federated Learning and use Fetch output.
        </div>
      ) : (
        <FlOutputView
          output={output}
          submissionId={submissionId}
          token={authToken}
          onOpenSummary={() => setSummaryOpen(true)}
        />
      )}
    </div>
  );
}
