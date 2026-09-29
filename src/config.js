export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
export const APP_URL = import.meta.env.VITE_APP_URL || "https://login.p3dx.iudx.org.in";
// p3dx-fl-orchestrator — owns Azure/Terraform VM provisioning + the FL
// auto-start post-flow (see src/api/vmProvisioning.js).
export const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || "http://localhost:3002";
