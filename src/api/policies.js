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
