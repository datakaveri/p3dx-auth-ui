// Formatting helpers shared by FlOutputView and the FL output card on the
// Federated Learning page.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DASH = "—";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Accuracy may arrive as a fraction (<=1) or already as a percent (>1). Decide
// once per output: if every known value is <=1, they are all fractions.
export function accuracyScale(output) {
  const values = [output?.final?.accuracy, ...(output?.per_round || []).map((r) => r.accuracy)].filter(isNum);
  return values.length > 0 && values.every((v) => v <= 1) ? 100 : 1;
}

export function formatAccuracy(value, scale) {
  return isNum(value) ? `${(value * scale).toFixed(2)}%` : DASH;
}

export function formatLoss(value) {
  return isNum(value) ? value.toFixed(4) : DASH;
}

export function formatMB(bytes) {
  return isNum(bytes) ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : DASH;
}

// "2 Aug 2026, 17:01" in the viewer's local time.
export function formatDateTime(iso) {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The round the final model came from: last reported round, else rounds.done.
export function finalRound(output) {
  const rounds = (output?.per_round || []).map((r) => r.round).filter(isNum);
  if (rounds.length) return Math.max(...rounds);
  return output?.rounds?.done ?? null;
}

// One-line teaser for the page card: "91.34% accuracy · 10 rounds · 23.0 MB".
export function outputTeaser(output) {
  const parts = [];
  const scale = accuracyScale(output);
  if (isNum(output?.final?.accuracy)) parts.push(`${formatAccuracy(output.final.accuracy, scale)} accuracy`);
  else if (isNum(output?.final?.loss)) parts.push(`loss ${formatLoss(output.final.loss)}`);
  const n = output?.rounds?.total || output?.rounds?.done;
  if (n) parts.push(`${n} round${n === 1 ? "" : "s"}`);
  if (isNum(output?.artifact?.size_bytes)) parts.push(formatMB(output.artifact.size_bytes));
  return parts.join(" · ");
}

export { isNum };
