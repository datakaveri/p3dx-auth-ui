import { GOV_URL, TEE_URL } from "../config";
import { authFetch } from "./session";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Run TEE: gov_layer builds the CreateJob sub-contract from the generated
// contract and runs grpcurl against the Kata coordinator (via p3dx-aaa).
// Resolves to { status, subContract, job }.
export async function runTeeJob(token, contractId) {
  const res = await authFetch(`${TEE_URL}/v1/tee/run`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ contract_id: contractId }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Run TEE failed (${res.status})`;
    throw new Error(data?.code ? `${data.code}: ${msg}` : msg);
  }

  return data;
}

// Every workload a TEE contract can run: [{ id, name, image, cpu, memory }].
export async function listWorkloads(token) {
  const res = await authFetch(`${GOV_URL}/workloads`, { headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || `Loading workloads failed (${res.status})`);
  }
  return Array.isArray(data?.workloads) ? data.workloads : [];
}

// Edits a generated TEE contract in place (lifecycle dates, consumer name,
// dataset fields, workload — the PUT /contracts/{id} body). gov_layer accepts
// it as an amendment: no re-signing, and the run uses the edited contract.
// Resolves to { contract, changes, signed_hash, content_hash, ... }.
export async function editContract(token, contractId, changes) {
  const res = await authFetch(`${GOV_URL}/contracts/${encodeURIComponent(contractId)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(changes),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || `Editing the consent request failed (${res.status})`);
  }

  return data;
}

// Run TEE progress: the coordinator job's current state (gov_layer runs
// grpcurl GetJob, via p3dx-aaa). Resolves to { status, job }.
export async function getTeeJob(token, jobId) {
  const res = await authFetch(`${TEE_URL}/v1/tee/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Getting TEE job failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// View Result: the TEE job's result blob, fetched server-side by gov_layer.
// Resolves to { status, result } (JSON) or { status, output } (text).
export async function getTeeJobResult(token, jobId) {
  const res = await authFetch(`${TEE_URL}/v1/tee/jobs/${encodeURIComponent(jobId)}/result`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Getting TEE result failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Whether a generated TEE/SMPC contract's data-provider signatures match
// (re-verified by gov_layer): {signatures: "matching"|"not matching", tee: "can run"|"cannot run"}.
// The consumer's stored contract from gov_layer (owner-checked), so the
// consent request preview shows later changes such as a data provider's
// consent expiry. Resolves to the contract.
export async function getLiveContract(token, contractId) {
  const res = await authFetch(`${GOV_URL}/contracts/${encodeURIComponent(contractId)}`, {
    headers: authHeaders(token),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || `Loading contract failed (${res.status})`);
  }
  return data?.contract || null;
}

export async function getContractSignatures(token, contractId) {
  const res = await authFetch(`${GOV_URL}/contracts/${encodeURIComponent(contractId)}/signatures`, {
    headers: authHeaders(token),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || `Signature status failed (${res.status})`);
  }

  return data;
}

// Builds and returns a contract for display only — does not submit/deploy it.
// datasets is one or more { datasetId, datasetName } pairs — datasetId is
// each dataset's real item_id (see WorkloadForm.jsx's dataset picker);
// datasetName is its display name, sent separately so gov_layer can look
// the policy up by the real id while still labeling the contract with the
// name a human recognizes. infraIds is the InfraCat selection (SMPC only,
// exactly 2); omitted for TEE/FL. workloadId is the selected workload
// (TEE only) — becomes the contract's workload.id.
// Returns { status, contract }.
export async function previewContract(token, { datasets, technique, infraIds, workloadId, purpose }) {
  const ds = (datasets || []).map(d => ({
    dataset_id: d.datasetId || d.dataset,
    dataset_name: d.datasetName || d.datasetId || d.dataset,
  }));
  if (ds.length === 0 || ds.some(d => !d.dataset_id)) throw new Error("MISSING_DATASET_IDS");
  if (!["FL", "TEE", "SMPC"].includes(technique)) throw new Error("INVALID_TECHNIQUE");
  if (technique === "SMPC" && infraIds?.length !== 2) throw new Error("INFRA_COUNT_MUST_BE_2");

  const res = await authFetch(`${GOV_URL}/generate-contract`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      datasets: ds,
      technique,
      ...(workloadId ? { workload_id: workloadId } : {}),
      ...(infraIds?.length ? { infra_ids: infraIds } : {}),
      // Stated purpose of processing (DPDP Rule 3 notice) — optional.
      ...(purpose?.trim() ? { purpose: purpose.trim() } : {}),
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    // 409 CONTRACT_PENDING: a contract for these datasets is still awaiting
    // approval; its message says so.
    const msg = data?.message || data?.error || `Contract preview failed (${res.status})`;
    const err = new Error(msg);
    err.code = data?.error;
    err.contract = data?.contract;
    throw err;
  }

  return { status: "SUCCESS", contract: data?.contract };
}

// The TEE session request gov_layer's /v1/tee/sessions expects; gov_layer
// sets consumerId from the token itself.
function buildTeeContract({ datasetUrl, datasetId, datasetName, contractId }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30-minute run window
  return {
    contractId: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
    governanceContractId: contractId,
    providerId: "demo-provider",
    appDetails: { imageId: "skald-anonymizer", imageHash: "unpinned-demo-measurement", version: "1.0" },
    datasetDetails: {
      itemId: datasetId || "demo-dataset",
      assetName: datasetName || datasetId || "demo-dataset",
      assetType: "dataset",
      resourceUrl: datasetUrl,
    },
    accessConfig: { type: "read" },
    consumerPublicKey: "",
    apdCallbackUrl: "",
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

// Starts a real TEE session against the confidential VM (gov_layer
// sequences provision -> attest -> run -> poll -> output in the background —
// see POST /v1/tee/sessions). Returns immediately with a sessionId; poll
// getTeeSessionStatus for progress, then call downloadTeeSessionOutput once
// complete. datasetUrl must be an https URL the CVM's managed identity can
// read.
// contractId is the generated contract's contract_id — gov_layer refuses to
// start a TEE unless every data provider on it has signed.
export async function startTeeSession(token, { datasetUrl, datasetId, datasetName, contractId }) {
  if (!contractId) throw new Error("MISSING_CONTRACT_ID");
  let parsed;
  try {
    parsed = new URL(datasetUrl);
  } catch {
    throw new Error("INVALID_DATASET_URL");
  }
  if (parsed.protocol !== "https:") throw new Error("DATASET_URL_MUST_BE_HTTPS");

  const res = await authFetch(`${TEE_URL}/v1/tee/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(buildTeeContract({ datasetUrl, datasetId, datasetName, contractId })),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Starting TEE session failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export async function getTeeSessionStatus(token, sessionId) {
  const res = await authFetch(`${TEE_URL}/v1/tee/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Getting TEE session status failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Fetches the anonymized output of a completed TEE session and triggers a
// browser file-save, same blob + temporary-anchor pattern as
// api/keyPair.js's private-key save fallback.
export async function downloadTeeSessionOutput(token, sessionId) {
  const res = await authFetch(`${TEE_URL}/v1/tee/sessions/${encodeURIComponent(sessionId)}/output`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.error || data?.message || `Download failed (${res.status})`);
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `anonymized-${sessionId}.bin`;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Terminates a TEE session's confidential VM so it stops billing compute.
export async function terminateTeeSession(token, sessionId) {
  const res = await authFetch(`${TEE_URL}/v1/tee/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Terminating TEE session failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
