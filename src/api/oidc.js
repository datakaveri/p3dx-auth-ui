import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from "../config";

// Sign-in straight against Keycloak on a public client (no client secret).
// The app's own login form posts the user's credentials to Keycloak's token
// endpoint (direct access grant, passwordLogin), so the user never leaves the
// app; sign-up goes through dx-controlplane (api/auth.js registerUser).
// Tokens land in sessionStorage under the keys the rest of the app reads
// (access_token / refresh_token / expires_in), plus id_token.

const OIDC_BASE = `${KEYCLOAK_URL}/realms/${encodeURIComponent(KEYCLOAK_REALM)}/protocol/openid-connect`;

async function tokenRequest(body) {
  const res = await fetch(`${OIDC_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID, ...body }),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || `Token request failed (${res.status})`);
  }
  return data;
}

// In-app login: the username (or email) and password go straight to
// Keycloak. Needs "Direct access grants" on the client.
export async function passwordLogin(username, password) {
  let tokens;
  try {
    tokens = await tokenRequest({ grant_type: "password", username, password, scope: "openid" });
  } catch (err) {
    if (/invalid user credentials|invalid_grant/i.test(err.message)) {
      throw new Error("Invalid username/email or password.");
    }
    throw err;
  }
  // A fresh login may be a different user than whatever was cached — drop
  // the prior session's FL submission id so its data doesn't leak into this one.
  sessionStorage.removeItem("last_report_submission_id");
  storeTokens(tokens);
  return tokens;
}

export function storeTokens(tokens) {
  sessionStorage.setItem("access_token", tokens.access_token);
  if (tokens.refresh_token) sessionStorage.setItem("refresh_token", tokens.refresh_token);
  if (tokens.expires_in) sessionStorage.setItem("expires_in", String(tokens.expires_in));
  if (tokens.id_token) sessionStorage.setItem("id_token", tokens.id_token);
}

export function refreshTokens(refreshToken) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

function clearSession() {
  ["access_token", "refresh_token", "expires_in", "id_token", "last_report_submission_id"].forEach((k) =>
    sessionStorage.removeItem(k)
  );
}

// Ends the Keycloak session in the background (revoking the refresh token),
// then returns to the app's login page.
export async function logout() {
  const refreshToken = sessionStorage.getItem("refresh_token");
  clearSession();
  if (refreshToken) {
    try {
      await fetch(`${OIDC_BASE}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID, refresh_token: refreshToken }),
      });
    } catch {
      // The local session is already cleared; Keycloak's expires on its own.
    }
  }
  window.location.assign("/login");
}
