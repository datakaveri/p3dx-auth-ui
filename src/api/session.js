import { BACKEND_URL } from "../config";

// Calls /refresh-token directly (rather than importing auth.js's
// refreshAccessToken) so this module and auth.js don't import each other.
async function requestRefresh(refreshToken) {
  const res = await fetch(`${BACKEND_URL}/p3dx/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.error || `Refresh failed (${res.status})`);
  }
  return data;
}

// Keeps the Keycloak session alive for every API call. Pages capture the
// access token once (via AppShell's outlet context) and keep using it, so a
// token that expired while the user sat on a form (or the laptop slept) used
// to surface as INVALID_OR_EXPIRED_TOKEN on the next click — e.g. "Generate
// Contract". authFetch refreshes just before expiry and, if the backend still
// says 401, refreshes once more and retries with the new token.

export const TOKEN_REFRESHED_EVENT = "p3dx:token-refreshed";
export const SESSION_EXPIRED_EVENT = "p3dx:session-expired";

const EXPIRY_SKEW_MS = 30_000; // treat a token as expired 30s early

// Decode a JWT's exp claim (no signature check needed - the browser can't
// forge a token the backend will accept). Works for Keycloak refresh tokens
// too, which are JWTs carrying the session-idle expiry.
export function getTokenExpiryMs(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(token) {
  const exp = getTokenExpiryMs(token);
  return exp != null && exp - Date.now() < EXPIRY_SKEW_MS;
}

let inflight = null;

// Single-flight refresh: concurrent callers share one /refresh-token request
// (Keycloak rotates refresh tokens, so parallel refreshes would race).
// Resolves to the new access token, or null when the session is really over.
export function refreshSession() {
  if (inflight) return inflight;

  inflight = (async () => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    if (!refreshToken) return null;
    try {
      const res = await requestRefresh(refreshToken);
      if (!res?.access_token) return null;
      sessionStorage.setItem("access_token", res.access_token);
      if (res.refresh_token) sessionStorage.setItem("refresh_token", res.refresh_token);
      if (res.expires_in) sessionStorage.setItem("expires_in", String(res.expires_in));
      window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: res.access_token }));
      return res.access_token;
    } catch (err) {
      console.warn("Session refresh failed:", err);
      return null;
    }
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

// Returns a usable access token, refreshing first if the stored one is about
// to expire. Falls back to the stored token if refresh isn't possible.
export async function getFreshAccessToken() {
  const current = sessionStorage.getItem("access_token");
  if (current && !isExpiringSoon(current)) return current;
  return (await refreshSession()) || current;
}

function withBearer(options, token) {
  return { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } };
}

// Drop-in replacement for fetch() on authenticated API calls. Ignores the
// (possibly stale) token the caller baked into the Authorization header and
// uses the freshest one instead; non-authenticated calls pass straight through.
export async function authFetch(url, options = {}) {
  if (!options.headers?.Authorization) return fetch(url, options);

  const token = await getFreshAccessToken();
  const res = await fetch(url, token ? withBearer(options, token) : options);
  if (res.status !== 401) return res;

  const retryToken = await refreshSession();
  if (!retryToken) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    return res;
  }
  return fetch(url, withBearer(options, retryToken));
}
