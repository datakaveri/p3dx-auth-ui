export const APP_URL = import.meta.env.VITE_APP_URL || "https://login.p3dx.iudx.org.in";
// p3dx-fl-orchestrator — owns Azure/Terraform VM provisioning + the FL
// auto-start post-flow (see src/api/vmProvisioning.js).
export const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:3002";

// Users sign in to Keycloak directly (authorization code + PKCE, see
// api/oidc.js). KEYCLOAK_CLIENT_ID must be a public client in that realm with
// <origin>/auth/callback as a valid redirect URI and <origin> as a web origin.
export const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080").replace(/\/+$/, "");
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || "master";
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "p3dx-auth-ui";

// dx-controlplane — user profile and role requests (/iudx/v2/auth/...).
export const CONTROLPLANE_URL = (import.meta.env.VITE_CONTROLPLANE_URL || "http://localhost:8443").replace(/\/+$/, "");

// p3dx-apd — policies, FL forms and the dataset / infrastructure catalogue.
export const APD_URL = (import.meta.env.VITE_APD_URL || "http://localhost:8082").replace(/\/+$/, "");

// p3dx_gov_layer — contracts, notifications, jobs, projects, provider keys.
// GOV_URL includes the /api/v1 prefix; TEE_URL is the server root, where the
// TEE orchestrator routes (/v1/tee/...) are mounted.
export const GOV_URL = (import.meta.env.VITE_GOV_URL || "http://localhost:8083/api/v1").replace(/\/+$/, "");
export const TEE_URL = (import.meta.env.VITE_TEE_URL || "http://localhost:8083").replace(/\/+$/, "");
