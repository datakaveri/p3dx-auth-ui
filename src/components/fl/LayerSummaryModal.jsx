import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { authFetch } from "../../api/session";

// "Layer summary" of an FL session's final model (layers/shapes/params/sample).
// A .pt is opaque binary, so gov_layer's /final-model/summary makes it legible.
export default function LayerSummaryModal({ sessionId, token, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
        const res = await authFetch(`/api/v1/final-model/summary${q}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("access_token") || token}` },
          cache: "no-store",
        });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch { /* non-JSON (e.g. a 404 page) */ }
        if (cancelled) return;
        if (!data) {
          setError(
            res.status === 404
              ? "Model reader not available yet - restart the governance layer to load the /final-model/summary endpoint."
              : `Unexpected response (HTTP ${res.status}).`
          );
        } else if (data.status === "SUCCESS") {
          setSummary(data.summary);
        } else {
          setError(data.message || data.error || "Failed to read model");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, token]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fl-summary-title"
      onClick={onClose}
    >
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header cpm-header">
          <div className="modal-title" id="fl-summary-title">Final model &middot; layer summary</div>
          <button type="button" className="cat-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="cpm-body">
          {error ? (
            <div className="fl-result-banner fl-result-banner--error" style={{ marginTop: 0 }}>&#9888; {error}</div>
          ) : loading ? (
            <div className="fl-section-sub">Reading model...</div>
          ) : summary ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-dark)" }}>
                <strong>{summary.format}</strong>
                {" - "}{summary.num_tensors} tensors,{" "}
                <strong>{Number(summary.total_params || 0).toLocaleString()}</strong> parameters
              </div>
              <div className="cat-table-wrap">
                <table className="cat-table">
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th>dtype</th>
                      <th>shape</th>
                      <th style={{ textAlign: "right" }}>params</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.layers || []).map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "monospace" }}>{l.name}</td>
                        <td>{l.dtype}</td>
                        <td style={{ fontFamily: "monospace" }}>[{(l.shape || []).join(", ")}]</td>
                        <td style={{ textAlign: "right" }}>{Number(l.params || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {summary.sample && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                  <strong>Sample weights</strong> ({summary.sample.layer}, {summary.sample.dtype}):{" "}
                  <code>[{(summary.sample.values || []).join(", ")}]</code>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
