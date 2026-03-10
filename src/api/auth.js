import { BACKEND_URL } from "../config";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function registerUser(payload) {
  const res = await fetch(`${BACKEND_URL}/p3dx/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || "Register failed";
    throw new Error(msg);
  }
  return data;
}

export async function loginUser(payload) {
  const res = await fetch(`${BACKEND_URL}/p3dx/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || "Login failed";
    throw new Error(msg);
  }
  return data;
}

export async function getMe(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    const msg = data?.error || data?.message || "Unauthorized";
    throw new Error(msg);
  }
  return data;
}
