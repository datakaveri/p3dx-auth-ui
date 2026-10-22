import { useState } from "react";
import { File } from "lucide-react";
import { downloadFlOutput } from "../../api/flOutput";
import {
  DASH,
  accuracyScale,
  formatAccuracy,
  formatDateTime,
  formatLoss,
  formatMB,
  isNum,
} from "./flOutputFormat";

// Output of a finished FL session (final global model + per-round metrics)
// for the Output Owner: stats, per-round chart and the model artifact. Shown
// on pages/FlOutput.jsx. Layout follows the TaskOutput design board, restyled
// with the app's tokens (.fl-output__* in global.css).

const MIN_BAR_PCT = 20;
const LABEL_THIN_THRESHOLD = 30;

function RoundChart({ output, scale }) {
  const rows = output?.per_round || [];
  const hasAcc = rows.some((r) => isNum(r.accuracy));
  const hasLoss = rows.some((r) => isNum(r.loss));
  const metric = hasAcc ? "accuracy" : hasLoss ? "loss" : null;
  const title = metric === "loss" ? "Loss per round" : "Accuracy per round";

  const fmt = (v) => (metric === "accuracy" ? formatAccuracy(v, scale) : formatLoss(v));
  const known = metric ? rows.filter((r) => isNum(r[metric])) : [];
  const values = known.map((r) => r[metric]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const heightPct = (v) => {
    if (!isNum(v)) return 0;
    if (max === min) return 100;
    return MIN_BAR_PCT + ((v - min) / (max - min)) * (100 - MIN_BAR_PCT);
  };
  const thin = rows.length > LABEL_THIN_THRESHOLD;
  const first = known[0];
  const last = known[known.length - 1];
  const ariaLabel = first
    ? `${title}, from ${fmt(first[metric])} in round ${first.round} to ${fmt(last[metric])} in round ${last.round}`
    : title;

  return (
    <section className="fl-output__card">
      <div className="fl-output__card-head">
        <span className="fl-output__card-title">{title}</span>
      </div>
      {!metric ? (
        <div className="fl-output__empty">No per-round metrics were reported for this session.</div>
      ) : (
        <div className="fl-output__chart" role="img" aria-label={ariaLabel}>
          {rows.map((r, i) => {
            const isLast = i === rows.length - 1;
            const tip = `Round ${r.round} · ${formatAccuracy(r.accuracy, scale)} · loss ${formatLoss(r.loss)}`;
            return (
              <div key={r.round ?? i} className="fl-output__bar-col" title={tip}>
                <div className="fl-output__bar-track">
                  <div
                    className={`fl-output__bar${isLast ? " fl-output__bar--final" : ""}`}
                    style={{ height: `${heightPct(r[metric])}%` }}
                  />
                </div>
                <span
                  className={`fl-output__bar-label${isLast ? " fl-output__bar-label--final" : ""}`}
                  aria-hidden="true"
                >
                  {thin && i % 2 === 1 && !isLast ? " " : r.round}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function FlOutputView({ output, submissionId, token, onOpenSummary }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const scale = accuracyScale(output);
  const done = output?.rounds?.done ?? null;
  const total = output?.rounds?.total ?? null;
  const artifact = output?.artifact || null;

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadFlOutput(submissionId, artifact?.file, token);
    } catch (err) {
      setDownloadError(err.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const stats = [
    { label: "Accuracy", value: formatAccuracy(output?.final?.accuracy, scale), success: true },
    { label: "Loss", value: formatLoss(output?.final?.loss) },
    { label: "Rounds", value: `${done ?? DASH} / ${total ?? DASH}` },
    { label: "Model size", value: formatMB(artifact?.size_bytes) },
  ];

  return (
    <div className="fl-output__content">
      <div className="fl-output__stats">
        {stats.map((s) => (
          <div key={s.label} className="fl-output__stat">
            <div className="fl-output__stat-label">{s.label}</div>
            <div className={`fl-output__stat-value${s.success && s.value !== DASH ? " fl-output__stat-value--success" : ""}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <RoundChart output={output} scale={scale} />

      <section className="fl-output__card">
        <div className="fl-output__card-head">
          <span className="fl-output__card-title">Artifact</span>
          <span className="fl-output__chip">
            <span className="fl-output__chip-dot" aria-hidden="true" />
            Fetched from server VM &middot; {formatDateTime(output?.fetched_at)}
          </span>
        </div>
        {artifact ? (
          <div className="fl-output__artifact">
            <span className="fl-output__file-icon" aria-hidden="true">
              <File size={18} />
            </span>
            <span className="fl-output__file-meta">
              <span className="fl-output__file-name">{artifact.file}</span>
              <span className="fl-output__file-sub">
                {formatMB(artifact.size_bytes)} &middot; modified {formatDateTime(artifact.modified_at)}
              </span>
            </span>
            <span className="fl-output__file-actions">
              {onOpenSummary && (
                <button type="button" className="fl-output__link-btn" onClick={onOpenSummary}>
                  Layer summary
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary fl-output__download"
                onClick={handleDownload}
                disabled={downloading}
                aria-busy={downloading}
              >
                {downloading ? "Downloading…" : "Download"}
              </button>
            </span>
          </div>
        ) : (
          <div className="fl-output__empty">No model file was collected for this session.</div>
        )}
        {downloadError && (
          <div className="fl-result-banner fl-result-banner--error fl-output__error" role="alert">
            {downloadError}
          </div>
        )}
      </section>
    </div>
  );
}
