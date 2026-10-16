import { BACKEND_URL } from "../config";
import { authFetch } from "./session";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createRoleRequest(token, role, autoApprove = false) {
  const res = await authFetch(`${BACKEND_URL}/p3dx/role-requests`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role, auto_approve: autoApprove }),
  });
  return res.json();
}

export async function listMyRoleRequests(token) {
  const res = await authFetch(`${BACKEND_URL}/p3dx/role-requests/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function listRoleRequests(token, status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await authFetch(`${BACKEND_URL}/p3dx/admin/role-requests${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function listAvailableDatasets(token) {
  const res = await authFetch(`${BACKEND_URL}/p3dx/available-datasets`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // return res.json();
  // Surface failures (e.g. 401 on an expired session) instead of letting the
  // catalogue render as "No datasets registered yet".
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.status === "FAILED") {
    const reason = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(res.status === 401 ? `Session expired (${reason}) — log out and log in again` : reason);
  }
  return data;
}

// Infrastructure Catalogue (InfraCat) — used by the SMPC workload catalogue's
// infrastructure picker (WorkloadForm.jsx).
export async function listAvailableInfrastructure(token) {
  const res = await authFetch(`${BACKEND_URL}/p3dx/available-infrastructure`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

// Full detail (cloud provider, capacity, attestation) for one infra item —
// used to populate the InfraCat row's expand-for-details panel.
export async function getInfrastructureDetails(token, itemId) {
  const res = await authFetch(`${BACKEND_URL}/p3dx/available-infrastructure/${encodeURIComponent(itemId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function decideRoleRequest(token, requestId, decision) {
  const res = await authFetch(`${BACKEND_URL}/p3dx/admin/role-requests/${encodeURIComponent(requestId)}/decision`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ decision }),
  });
  return res.json();
}
