import { CONTROLPLANE_URL } from "../config";
import { apdRequest } from "./apd";
import { authFetch } from "./session";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Role requests live in dx-controlplane (/iudx/v2/auth/roles/requests),
// approved directly by cos_admin. Its records are reshaped to the fields the
// pages render: request_id, role_name, requested_by, status
// (PENDING / APPROVED / REJECTED), created_at.
const ROLE_REQUESTS_URL = `${CONTROLPLANE_URL}/iudx/v2/auth/roles/requests`;
const ADMIN_ROLE_REQUESTS_URL = `${CONTROLPLANE_URL}/iudx/v2/auth/admin/roles/requests`;

const STATUS_TO_UI = { pending: "PENDING", granted: "APPROVED", rejected: "REJECTED" };
const UI_TO_STATUS = { pending: "pending", approved: "granted", rejected: "rejected" };
const DECISION_TO_STATUS = { APPROVE: "granted", REJECT: "rejected" };
// Large enough to show every request on the admin page in one go.
const ADMIN_PAGE_SIZE = 500;

function toUiRequest(r) {
  return {
    request_id: r.id,
    user_id: r.user_id,
    requested_by: r.user_name,
    role_name: r.role,
    status: STATUS_TO_UI[String(r.status).toLowerCase()] || String(r.status).toUpperCase(),
    created_at: r.created_at,
    decided_at: r.status === "pending" ? null : r.updated_at,
  };
}

// Controlplane answers { type, title, detail?, result? }; failures carry
// detail/title instead of result.
async function controlplaneCall(url, options) {
  const res = await authFetch(url, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { status: "FAILED", error: data?.detail || data?.title || `HTTP ${res.status}` };
  }
  return { status: "SUCCESS", result: data?.result };
}

export async function createRoleRequest(token, role) {
  const res = await controlplaneCall(ROLE_REQUESTS_URL, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  return res.status === "SUCCESS" ? { status: "SUCCESS", request: toUiRequest(res.result) } : res;
}

export async function listMyRoleRequests(token) {
  const res = await controlplaneCall(`${ROLE_REQUESTS_URL}/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== "SUCCESS") return res;
  return { status: "SUCCESS", requests: (res.result || []).map(toUiRequest) };
}

// status: "pending" | "approved" | "rejected" (as the admin page asks for them).
export async function listRoleRequests(token, status) {
  const params = new URLSearchParams({ size: String(ADMIN_PAGE_SIZE) });
  if (status) params.set("status", UI_TO_STATUS[status] || status);
  const res = await controlplaneCall(`${ADMIN_ROLE_REQUESTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== "SUCCESS") return res;
  return { status: "SUCCESS", requests: (res.result || []).map(toUiRequest) };
}

// Dataset catalogue from p3dx-apd: [{ id, name }], returned as { status, datasets }.
export async function listAvailableDatasets(token) {
  const res = await apdRequest("/api/v1/catalogue/datasets", token);
  // Surface failures (e.g. 401 on an expired session) instead of letting the
  // catalogue render as "No datasets registered yet".
  if (res.status !== "SUCCESS") {
    const reason = res.error;
    throw new Error(res.httpStatus === 401 ? `Session expired (${reason}) — log out and log in again` : reason);
  }
  return { status: "SUCCESS", datasets: Array.isArray(res.data) ? res.data : [] };
}

// Infrastructure Catalogue (InfraCat) — used by the SMPC workload catalogue's
// infrastructure picker (WorkloadForm.jsx). Returns { status, infrastructure }.
export async function listAvailableInfrastructure(token) {
  const res = await apdRequest("/api/v1/catalogue/infrastructure", token);
  if (res.status !== "SUCCESS") return res;
  return { status: "SUCCESS", infrastructure: Array.isArray(res.data) ? res.data : [] };
}

// Full detail (cloud provider, capacity, attestation) for one infra item —
// used to populate the InfraCat row's expand-for-details panel. Returns
// { status, infrastructure }.
export async function getInfrastructureDetails(token, itemId) {
  const res = await apdRequest(`/api/v1/catalogue/infrastructure/${encodeURIComponent(itemId)}`, token);
  if (res.status !== "SUCCESS") return res;
  return { status: "SUCCESS", infrastructure: res.data || null };
}

// decision: "APPROVE" | "REJECT". Approving adds the role in Keycloak; the
// user sees it after their next token refresh.
export async function decideRoleRequest(token, requestId, decision) {
  const res = await controlplaneCall(`${ADMIN_ROLE_REQUESTS_URL}/${encodeURIComponent(requestId)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ status: DECISION_TO_STATUS[decision] || String(decision).toLowerCase() }),
  });
  return res.status === "SUCCESS" ? { status: "SUCCESS", request: toUiRequest(res.result) } : res;
}
