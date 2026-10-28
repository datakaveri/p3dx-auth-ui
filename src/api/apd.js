import { APD_URL } from "../config";
import { authFetch } from "./session";

// Calls p3dx-apd's user-facing routes (/api/v1/me/*, /api/v1/catalogue/*,
// /api/v1/forms/*) with the user's token. APD answers
// { status: "success" | "error", message, data }; this normalises it to
// { status: "SUCCESS", data, message } or { status: "FAILED", error,
// httpStatus } so callers keep the shapes they had with p3dx-aaa.
export async function apdRequest(path, token, { method = "GET", body } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await authFetch(`${APD_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status === "error") {
    return { status: "FAILED", httpStatus: res.status, error: json?.message || `HTTP ${res.status}` };
  }
  return { status: "SUCCESS", data: json?.data, message: json?.message };
}

// FL output-owner form. Returns { status, submission_id } like p3dx-aaa did.
export async function submitOutputOwnerForm(payload, token) {
  const res = await apdRequest("/api/v1/forms/submissions", token, { method: "POST", body: payload });
  return res.status === "SUCCESS" ? { status: "SUCCESS", submission_id: res.data?.id } : res;
}

// FL data-provider form (needs the provider role). Returns { status, submission_id }.
export async function submitDataProviderForm(payload, token) {
  const res = await apdRequest("/api/v1/forms/provider-forms", token, { method: "POST", body: payload });
  return res.status === "SUCCESS" ? { status: "SUCCESS", submission_id: res.data?.id } : res;
}
