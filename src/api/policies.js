import { GOV_URL } from "../config";
import { apdRequest } from "./apd";
import { authFetch } from "./session";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Policies live in p3dx-apd's user-facing /api/v1/me/policies routes, which
// take the caller's provider_id from their token. Each function throws on
// failure and otherwise returns { status: "SUCCESS", data }.
async function apdOrThrow(path, token, options, failureMessage) {
  const res = await apdRequest(path, token, options);
  if (res.status !== "SUCCESS") {
    throw new Error(res.error || `${failureMessage} (${res.httpStatus})`);
  }
  return res;
}

export async function submitPolicy(token, policy) {
  return apdOrThrow("/api/v1/me/policies", token, { method: "POST", body: policy }, "Policy submit failed");
}

// Lists the logged-in infra-provider's own infrastructure registrations —
// backs the "My Infrastructure" dashboard.
export async function listMyInfraPolicies(token) {
  return apdOrThrow("/api/v1/me/policies/infrastructure", token, {}, "Fetching infrastructure list failed");
}

// Soft-deletes one infrastructure entry, by Infrastructure ID (item_id) —
// only ever succeeds for the caller's own entries (enforced server-side).
export async function deleteInfraPolicy(token, itemId) {
  return apdOrThrow(
    `/api/v1/me/policies/infrastructure/${encodeURIComponent(itemId)}`,
    token,
    { method: "DELETE" },
    "Deleting infrastructure failed"
  );
}

// Lists the logged-in data-provider's own dataset access policies — backs
// the "My Datasets" dashboard. Mirrors listMyInfraPolicies exactly.
export async function listMyDatasetPolicies(token) {
  return apdOrThrow("/api/v1/me/policies/datasets", token, {}, "Fetching dataset list failed");
}

// The contracts each of the logged-in data-provider's datasets is used in,
// as { data: { "<item_id>": [{ contract_id, job_id, technique, job_state,
// status, created_at }] } } — backs the hover popover on "My Datasets".
// Built from gov_layer's GET /me/jobs: every job the caller takes part in,
// keeping only their data-provider participations.
export async function listMyDatasetContracts(token) {
  const res = await authFetch(`${GOV_URL}/me/jobs`, {
    headers: authHeaders(token),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Fetching dataset contracts failed (${res.status})`;
    throw new Error(msg);
  }

  const byDataset = {};
  for (const job of data?.jobs || []) {
    for (const part of job.participation || []) {
      if (part.role !== "data-provider" || !part.item_id) continue;
      (byDataset[part.item_id] ||= []).push({
        contract_id: job.contract_id,
        job_id: job.job_id,
        technique: job.technique,
        job_state: job.job_state,
        status: part.status,
        created_at: job.created_at,
        consumer: job.consumer || "",
        last_event: job.last_event || null,
        events: Array.isArray(job.events) ? job.events : [],
        updated_at: job.last_event?.at || part.updated_at || job.created_at,
      });
    }
  }
  return { status: "SUCCESS", data: byDataset };
}

// Soft-deletes one dataset entry, by Dataset ID (item_id) — only ever
// succeeds for the caller's own entries (enforced server-side). Mirrors
// deleteInfraPolicy exactly.
export async function deleteDatasetPolicy(token, itemId) {
  return apdOrThrow(
    `/api/v1/me/policies/datasets/${encodeURIComponent(itemId)}`,
    token,
    { method: "DELETE" },
    "Deleting dataset failed"
  );
}

// Fetches one dataset policy's full detail for the "My Datasets" Edit flow —
// unlike InfraCat's public getInfrastructureDetails, this is a provider-scoped
// endpoint (ownership-checked server-side), so it can safely return every
// field PolicyForm.jsx needs to pre-fill, not just a stripped-down subset.
export async function getMyDatasetDetails(token, itemId) {
  return apdOrThrow(
    `/api/v1/me/policies/datasets/${encodeURIComponent(itemId)}`,
    token,
    {},
    "Fetching dataset details failed"
  );
}
