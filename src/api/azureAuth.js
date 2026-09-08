import { PublicClientApplication } from "@azure/msal-browser";

const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID;
const AZURE_TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID;

const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    // Must land on a route that's actually mounted (and protected, so the
    // app's own session survives the round trip) so completeProviderAzureSignIn()
    // below gets a chance to run — the bare origin resolves to the public
    // Login page, where nothing ever resumes the sign-in.
    redirectUri: `${window.location.origin}/app/services/fl`,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

// Scope that lets the returned token authorize ARM/Terraform calls against
// the user's Azure subscription (VM create, etc).
const AZURE_MGMT_SCOPE = "https://management.azure.com/user_impersonation";

let msalInstance;
let initPromise;

export function getMsalInstance() {
  if (!msalInstance) {
    if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID) {
      throw new Error("Azure login is not configured (missing VITE_AZURE_CLIENT_ID / VITE_AZURE_TENANT_ID).");
    }
    msalInstance = new PublicClientApplication(msalConfig);
    initPromise = msalInstance.initialize();
  }
  return msalInstance;
}

// A stale "interaction in progress" flag can be left in sessionStorage by an
// earlier login attempt that never completed (closed popup, failed redirect,
// etc), which makes MSAL refuse every subsequent attempt with
// interaction_in_progress. Only clear it reactively, when MSAL actually
// reports that error - NOT preemptively on every getMsalInstance() call,
// since that also runs on the page load that's consuming a legitimate,
// just-finished redirect (see completeProviderAzureSignIn). Clearing the
// flag before handleRedirectPromise() gets to look at it makes MSAL treat a
// real, successful redirect response as if no interaction were in progress,
// so it silently drops it instead of resolving the sign-in.
async function withStaleInteractionRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.errorCode !== "interaction_in_progress") throw err;
    sessionStorage.removeItem("msal.interaction.status");
    return await fn();
  }
}

// Signs the user into Microsoft in a popup window (MFA handled by Microsoft's
// own page) and returns a fresh Azure access token scoped for ARM/Terraform.
// Always interactive - see the prompt: select_account note below.
export async function getAzureAccessToken() {
  const instance = getMsalInstance();
  await initPromise;

  // Always interactive, with the account picker forced open (prompt:
  // select_account): the owner may want to sign in as a different Azure
  // account on a later session, so this deliberately skips
  // acquireTokenSilent/cached-account reuse and always shows the popup.
  const result = await withStaleInteractionRetry(() =>
    instance.loginPopup({ scopes: [AZURE_MGMT_SCOPE], prompt: "select_account" })
  );
  return result.accessToken;
}

// Data-provider-side sign-in: just proves identity to join an FL session, so
// no ARM scope is requested (that scope is owner-only, for Terraform
// provisioning). Reuses the same MSAL singleton/app registration as the
// owner flow above - there's only one Azure AD app registration for the SPA.
//
// Uses loginRedirect (full-page navigation) rather than loginPopup: Microsoft's
// login page sends its own Cross-Origin-Opener-Policy: same-origin header,
// which permanently severs window.opener the moment the popup navigates
// through it. That leaves MSAL with no way to detect completion or close the
// popup - it just sits there on localhost after a successful sign-in. This
// is a well-known msal-browser/COOP limitation, not something fixable from
// this app's side, so redirect is the reliable option.
//
// Because loginRedirect reloads the page, `context` (whatever the caller
// needs to resume after coming back - e.g. which notification/session this
// was for) is stashed in sessionStorage and handed back by
// completeProviderAzureSignIn() below once the redirect completes.
const PROVIDER_SIGNIN_CONTEXT_KEY = "p3dx_provider_azure_signin_context";

export async function signInProviderWithAzure(context) {
  const instance = getMsalInstance();
  await initPromise;

  // Always interactive with the account picker forced open - same reasoning
  // as getAzureAccessToken above: a data provider may sign in as a
  // different Azure account each time, so this skips
  // acquireTokenSilent/cached-account reuse.
  sessionStorage.setItem(PROVIDER_SIGNIN_CONTEXT_KEY, JSON.stringify(context || {}));
  await withStaleInteractionRetry(() => instance.loginRedirect({ scopes: [], prompt: "select_account" }));
  return { redirected: true }; // unreachable — loginRedirect navigates away
}

// Call once on app load (e.g. in the FL dashboard's mount effect). If the
// page just came back from a signInProviderWithAzure() redirect, returns
// { account, context } (the context object passed to signInProviderWithAzure
// before it navigated away) so the caller can finish what it was doing.
// Returns null on a normal page load with nothing to resume.
export async function completeProviderAzureSignIn() {
  const instance = getMsalInstance();
  await initPromise;

  const raw = sessionStorage.getItem(PROVIDER_SIGNIN_CONTEXT_KEY);
  if (!raw) return null;

  const result = await instance.handleRedirectPromise();
  sessionStorage.removeItem(PROVIDER_SIGNIN_CONTEXT_KEY);
  if (!result) return null;

  return { account: result.account, context: JSON.parse(raw) };
}
