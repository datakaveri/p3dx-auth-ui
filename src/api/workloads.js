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
