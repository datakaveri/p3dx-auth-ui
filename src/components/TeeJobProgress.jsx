import { useEffect, useState } from "react";
import { getTeeJob, getTeeJobResult } from "../api/workloads";
import {
  CheckCircle2, AlertCircle, Loader2, Circle, Eye, Download, X, FileText,
} from "lucide-react";

// How often to poll the coordinator's GetJob once Run TEE has a jobId.
const TEE_JOB_POLL_MS = 5000;

// Coordinator states after which the job never changes — stop polling.
const TERMINAL_STATES = new Set(["JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED"]);

// "JOB_STATE_SUCCEEDED" -> "Succeeded"
function stateLabel(state) {
  if (!state) return "Waiting…";
  const s = state.replace(/^JOB_STATE_/, "").replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(iso) {
  if (!iso || iso.startsWith("0001-01-01")) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function duration(from, to) {
  const a = Date.parse(from), b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  const sec = Math.round((b - a) / 1000);
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function Step({ done, active, failed, label, time }) {
  const color = failed ? "var(--danger, #c62828)" : done ? "var(--success, #2e7d32)" : "var(--text-light)";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0" }}>
      <span style={{ color, marginTop: 1 }}>
        {failed ? <AlertCircle size={14} />
          : done ? <CheckCircle2 size={14} />
            : active ? <Loader2 size={14} className="spin" />
              : <Circle size={14} />}
      </span>
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ color: done || active || failed ? "inherit" : "var(--text-light)" }}>{label}</div>
        {time && <div style={{ fontSize: 11, color: "var(--text-light)" }}>{time}</div>}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, color: "var(--text-light)" }}>{label}</div>
      <div style={{ wordBreak: "break-all", ...(mono ? { fontFamily: "monospace", fontSize: 11 } : {}) }}>{value}</div>
    </div>
  );
}

// Left-sidebar progress for the job Run TEE submitted to the Kata
// coordinator: polls GetJob every 5s until a terminal state, then offers
// View Result (the result blob, fetched by gov_layer).
export default function TeeJobProgress({ token, jobId }) {
  const [job, setJob] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState(null); // null | { data } | { error }
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  const state = job?.state;
  const terminal = TERMINAL_STATES.has(state);

  useEffect(() => {
    setJob(null);
    setPollError(null);
    setResult(null);
    setResultOpen(false);
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !token || terminal) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getTeeJob(token, jobId);
        if (cancelled) return;
        setJob(res.job || {});
        setPollError(null);
      } catch (err) {
        // Transient poll failure — show it, keep retrying on the next tick.
        if (!cancelled) setPollError(err.message || "Couldn't reach the coordinator");
      } finally {
        if (!cancelled) setLastChecked(new Date());
      }
    };
    tick();
    const interval = setInterval(tick, TEE_JOB_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [jobId, token, terminal]);

  const handleViewResult = async () => {
    setResultOpen(true);
    if (result?.data !== undefined) return;
    setIsLoadingResult(true);
    try {
      const res = await getTeeJobResult(token, jobId);
      setResult({ data: res.result !== undefined ? res.result : res.output });
    } catch (err) {
      setResult({ error: err.message || "Couldn't load the result" });
    } finally {
      setIsLoadingResult(false);
    }
  };

  const resultText = result?.data === undefined ? ""
    : typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2);

  const handleDownload = () => {
    const blob = new Blob([resultText], { type: typeof result?.data === "string" ? "text/plain" : "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${jobId}-result.${typeof result?.data === "string" ? "txt" : "json"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!jobId) return null;

  const failed = state === "JOB_STATE_FAILED" || state === "JOB_STATE_CANCELLED";
  const succeeded = state === "JOB_STATE_SUCCEEDED";
  const started = !!formatTime(job?.startedAt);
  const finished = !!formatTime(job?.finishedAt) || terminal;
  const conf = job?.confidential || {};
  const badgeColor = succeeded ? "var(--success, #2e7d32)" : failed ? "var(--danger, #c62828)" : "var(--primary, #1565c0)";

  return (
    <div style={{ borderTop: "1px solid var(--border-color)", padding: "12px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>TEE Job Progress</div>
      <div style={{ color: "var(--text-light)", marginBottom: 8, wordBreak: "break-all" }}>
        <code>{jobId}</code>
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 10,
        border: `1px solid ${badgeColor}`, color: badgeColor, fontWeight: 600, marginBottom: 8,
      }}>
        {!terminal && <Loader2 size={11} className="spin" />}
        {stateLabel(state)}
      </div>

      <Step done={!!job} active={!job} label="Submitted" time={formatTime(job?.createdAt)} />
      <Step done={started} active={!!job && !started && !terminal} label="Started" time={formatTime(job?.startedAt)} />
      <Step
        done={finished && !failed} active={started && !terminal} failed={failed}
        label={failed ? stateLabel(state) : started && !terminal ? "Running in enclave…" : "Finished"}
        time={formatTime(job?.finishedAt) && [formatTime(job.finishedAt), duration(job.startedAt, job.finishedAt)].filter(Boolean).join(" · ")}
      />

      {job?.reason && <div className="error-message" style={{ marginTop: 8, fontSize: 12 }}>{job.reason}</div>}

      <Row label="Attestation" value={conf.phase && `${conf.phase}${conf.podRuntimeClass ? ` (${conf.podRuntimeClass})` : ""}`} />
      <Row label="Measurement" value={conf.measurement} mono />
      <Row label="Callback" value={job?.callbackState} />

      {pollError && <div className="error-message" style={{ marginTop: 8, fontSize: 12 }}>{pollError}</div>}
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-light)" }}>
        {terminal ? "Final state — stopped checking." : "Checking every 5s"}
        {lastChecked && ` · last ${lastChecked.toLocaleTimeString()}`}
      </div>

      {succeeded && (
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={handleViewResult}>
          <Eye size={14} style={{ marginRight: 6 }} />View Result
        </button>
      )}

      {resultOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setResultOpen(false)}>
          <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header cpm-header">
              <div className="modal-title">
                <FileText size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                TEE Result · <code style={{ fontSize: 13 }}>{jobId}</code>
              </div>
              <button type="button" className="cat-icon-btn" onClick={() => setResultOpen(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <div className="cpm-body">
              {isLoadingResult ? (
                <div className="cat-status" style={{ justifyContent: "flex-start" }}>
                  <Loader2 size={15} className="spin" /><span>Loading result…</span>
                </div>
              ) : result?.error ? (
                <div className="error-message" style={{ fontSize: 13 }}>{result.error}</div>
              ) : (
                <>
                  <pre style={{
                    margin: 0, padding: 12, borderRadius: 6, background: "rgba(15, 23, 42, 0.04)",
                    border: "1px solid var(--border-color)", fontSize: 12, overflow: "auto", maxHeight: "55vh",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>{resultText}</pre>
                  <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={handleDownload}>
                    <Download size={14} style={{ marginRight: 6 }} />Download
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
