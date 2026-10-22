import { ORCHESTRATOR_URL } from "../config";
import { authFetch } from "./session";

// FL session output (final global model + per-round metrics), pulled from the
// server VM into gov_layer once training finishes. Read access is owner-only
// (gov_layer checks the contract), so every call carries the user's token.

// Dev-only: VITE_FL_OUTPUT_MOCK=1 makes getFlOutput return a 10-round fixture
// so the output view can be seen without the backends running.
const MOCK = import.meta.env.DEV && import.meta.env.VITE_FL_OUTPUT_MOCK === "1";

// Same pattern as the pages: the freshest stored token, else the one the
// caller holds. authFetch swaps in a refreshed token anyway when needed.
function authHeaders(token) {
  return { Authorization: `Bearer ${sessionStorage.getItem("access_token") || token || ""}` };
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function httpError(res, data, fallback) {
  let message = data?.message || data?.error;
  if (!message) {
    if (res.status === 403) message = "Only the output owner of this session can view its output.";
    else if (res.status === 404) message = "No contract found for this session.";
    else message = `${fallback} (${res.status})`;
  }
  const err = new Error(message);
  err.statusCode = res.status;
  return err;
}

// gov_layer's session id: the submission id with anything outside
// [a-zA-Z0-9_-] replaced by "_" (matches the orchestrator's startSession).
export function flSessionId(submissionId) {
  return String(submissionId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mockOutput(submissionId) {
  const acc = [0.6123, 0.7034, 0.7712, 0.8205, 0.8541, 0.8783, 0.8952, 0.9046, 0.9102, 0.9134];
  const loss = [1.0412, 0.8237, 0.6619, 0.5486, 0.4672, 0.4011, 0.3502, 0.3189, 0.2994, 0.2871];
  const sid = flSessionId(submissionId);
  return {
    status: "ready",
    session_id: sid,
    rounds: { done: 10, total: 10 },
    final: { accuracy: acc[9], loss: loss[9] },
    per_round: acc.map((a, i) => ({ round: i + 1, accuracy: a, loss: loss[i] })),
    artifact: {
      file: `model_${sid}_round_10.pt`,
      size_bytes: 24117248,
      modified_at: "2026-08-02T17:01:00+05:30",
    },
    fetched_at: "2026-08-02T17:03:12+05:30",
  };
}

// GET /api/v1/fl-output/{submissionId}. Resolves to the output object
// (status "ready" | "not_found"); throws with err.statusCode on 403/404/etc.
export async function getFlOutput(submissionId, token) {
  if (MOCK) return mockOutput(submissionId);
  const res = await authFetch(`/api/v1/fl-output/${encodeURIComponent(submissionId)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data) throw httpError(res, data, "Failed to load FL output");
  return data;
}

// GET /api/v1/fl-output/{submissionId}/download - the final model (.pt).
export async function downloadFlOutput(submissionId, filename, token) {
  let blob;
  if (MOCK) {
    blob = new Blob(["mock model bytes"], { type: "application/octet-stream" });
  } else {
    const res = await authFetch(`/api/v1/fl-output/${encodeURIComponent(submissionId)}/download`, {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      throw httpError(res, data, "Failed to download model");
    }
    blob = await res.blob();
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `fl-model-${flSessionId(submissionId)}.pt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// POST {ORCHESTRATOR_URL}/p3dx/fl-output/{submissionId}/collect - asks the
// orchestrator to pull the output from the server VM (async, 202).
// Resolves to { status: "collecting" | "already_collecting" }.
export async function collectFlOutput(submissionId, token) {
  if (MOCK) return { status: "collecting" };
  const res = await authFetch(`${ORCHESTRATOR_URL}/p3dx/fl-output/${encodeURIComponent(submissionId)}/collect`, {
    method: "POST",
    headers: authHeaders(token),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") throw httpError(res, data, "Failed to start output collection");
  return data || { status: "collecting" };
}

// Saves the whole output object as fl-output-<sid>.json.
export function exportFlOutput(output, sid) {
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fl-output-${sid}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
