import { BACKEND_URL } from "../config";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function submitPolicy(token, policy) {
  const res = await fetch(`${BACKEND_URL}/p3dx/policy`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(policy),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Policy submit failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Lists the logged-in infra-provider's own infrastructure registrations —
// backs the "My Infrastructure" dashboard.
export async function listMyInfraPolicies(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/policy/mine`, {
    headers: authHeaders(token),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Fetching infrastructure list failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Soft-deletes one infrastructure entry, by Infrastructure ID (item_id) —
// only ever succeeds for the caller's own entries (enforced server-side).
export async function deleteInfraPolicy(token, itemId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/policy/by-item/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Deleting infrastructure failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Lists the logged-in data-provider's own dataset access policies — backs
// the "My Datasets" dashboard. Mirrors listMyInfraPolicies exactly.
export async function listMyDatasetPolicies(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/policy/mine-datasets`, {
    headers: authHeaders(token),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Fetching dataset list failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Soft-deletes one dataset entry, by Dataset ID (item_id) — only ever
// succeeds for the caller's own entries (enforced server-side). Mirrors
// deleteInfraPolicy exactly.
export async function deleteDatasetPolicy(token, itemId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/policy/by-item-dataset/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Deleting dataset failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

// Fetches one dataset policy's full detail for the "My Datasets" Edit flow —
// unlike InfraCat's public getInfrastructureDetails, this is a provider-scoped
// endpoint (ownership-checked server-side), so it can safely return every
// field PolicyForm.jsx needs to pre-fill, not just a stripped-down subset.
export async function getMyDatasetDetails(token, itemId) {
  const res = await fetch(`${BACKEND_URL}/p3dx/policy/mine-datasets/${encodeURIComponent(itemId)}`, {
    headers: authHeaders(token),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || `Fetching dataset details failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
