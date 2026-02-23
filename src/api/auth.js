import { BACKEND_URL } from "../config";

export async function registerUser(payload) {
  const res = await fetch(`${BACKEND_URL}/anon/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function loginUser(payload) {
  const res = await fetch(`${BACKEND_URL}/anon/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getMe(token) {
  const res = await fetch(`${BACKEND_URL}/anon/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
