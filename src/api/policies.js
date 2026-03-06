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
