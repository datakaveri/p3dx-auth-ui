import { BACKEND_URL } from "../config";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createRoleRequest(token, role, autoApprove = false) {
  const res = await fetch(`${BACKEND_URL}/p3dx/role-requests`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role, auto_approve: autoApprove }),
  });
  return res.json();
}

export async function listMyRoleRequests(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/role-requests/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function listRoleRequests(token, status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${BACKEND_URL}/p3dx/admin/role-requests${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function listAvailableDatasets(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/available-datasets`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

// Infrastructure Catalogue (InfraCat) — used by the SMPC workload catalogue's
// infrastructure picker (WorkloadForm.jsx).
export async function listAvailableInfrastructure(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/available-infrastructure`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

// Full detail (cloud provider, capacity, attestation) for one infra item —
// used to populate the InfraCat row's expand-for-details panel.
export async function getInfrastructureDetails(token, itemId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/available-infrastructure/${encodeURIComponent(itemId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function decideRoleRequest(token, requestId, decision) {
  const res = await fetch(`${BACKEND_URL}/p3dx/admin/role-requests/${encodeURIComponent(requestId)}/decision`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ decision }),
  });
  return res.json();
}
