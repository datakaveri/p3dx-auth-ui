import { BACKEND_URL } from "../config";

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

export async function runWorkload(token, { datasetId, applicationId }) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/run`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ datasetId, applicationId }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Run workload failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Run TEE: gov_layer builds the CreateJob sub-contract from the generated
// contract and runs grpcurl against the Kata coordinator (via p3dx-aaa).
// Resolves to { status, subContract, job }.
export async function runTeeJob(token, contractId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-run`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ contractId }),
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
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/catalog`, { headers: authHeaders(token) });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || `Loading workloads failed (${res.status})`);
  }
  return Array.isArray(data?.workloads) ? data.workloads : [];
}

// Edits a generated TEE contract in place (lifecycle dates, consumer name,
// dataset fields, workload — the PUT /contracts/{id} body). It is not
// re-signed, so the run is refused afterwards (signatures no longer match).
// Resolves to { contract, changes, signed_hash, content_hash, ... }.
export async function editContract(token, contractId, changes) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/contracts/${encodeURIComponent(contractId)}`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-jobs/${encodeURIComponent(jobId)}`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-jobs/${encodeURIComponent(jobId)}/result`, {
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
export async function getContractSignatures(token, contractId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/contracts/${encodeURIComponent(contractId)}/signatures`, {
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
// exactly 2); omitted for TEE/FL. applicationId is the selected workload
// (TEE only) — becomes the contract's application provider party.
export async function previewContract(token, { datasets, technique, infraIds, applicationId, purpose }) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/preview-contract`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      datasets, technique,
      ...(infraIds?.length ? { infraIds } : {}),
      ...(applicationId ? { applicationId } : {}),
      // Stated purpose of processing (DPDP Rule 3 notice) — required for TEE.
      ...(purpose ? { purpose } : {}),
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Contract preview failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
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
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ datasetUrl, datasetId, datasetName, contractId }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Starting TEE session failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export async function getTeeSessionStatus(token, sessionId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-sessions/${encodeURIComponent(sessionId)}`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-sessions/${encodeURIComponent(sessionId)}/output`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/tee-sessions/${encodeURIComponent(sessionId)}`, {
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

export async function getWorkloadResult(token, contractId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/workloads/contracts/${contractId}/result`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Get workload result failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
