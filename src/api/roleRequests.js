import { BACKEND_URL } from "../config";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createRoleRequest(token, role) {
  const res = await fetch(`${BACKEND_URL}/p3dx/role-requests`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
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

export async function decideRoleRequest(token, requestId, decision) {
  const res = await fetch(`${BACKEND_URL}/p3dx/admin/role-requests/${encodeURIComponent(requestId)}/decision`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ decision }),
  });
  return res.json();
}
