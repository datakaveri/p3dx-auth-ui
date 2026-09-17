import { BACKEND_URL } from "../config";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Mints a token identifying this logged-in user so their local
// terraform/participant-vm/deploy.sh run can report progress back here.
export async function getVmProvisioningToken(role, token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/vm-provisioning/token`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.error || `Failed to get provisioning token (${res.status})`);
  }
  return data.token;
}

// Kicks off fully automated VM creation on the backend (device-code Azure
// login + Terraform). Returns immediately (the response includes a per-run
// `token` identifying this run - see subscribeToVmProvisioning/
// downloadVmPrivateKey); progress arrives over subscribeToVmProvisioning
// below. runKey identifies the caller's own instance (e.g. one
// VmProvisioningPanel mount) so a duplicate call for it doesn't spawn a
// second `az login` - distinct runKeys run fully concurrently.
export async function triggerAutoProvision(role, token, vmName, runKey, submissionId = null) {
  const res = await fetch(`${BACKEND_URL}/p3dx/vm-provisioning/auto-create`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role, vmName, runKey, submissionId }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.error || `Failed to start VM provisioning (${res.status})`);
  }
  return data;
}

// Downloads the SSH private key generated for one specific auto-created VM
// run, identified by runToken (the `token` returned from triggerAutoProvision
// above) — one-time, the backend clears it after this succeeds.
export async function downloadVmPrivateKey(token, runToken) {
  const res = await fetch(`${BACKEND_URL}/p3dx/vm-provisioning/private-key?token=${encodeURIComponent(runToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.error || `Failed to download SSH key (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "p3dx_flo_vm_key.pem";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Live VM-provisioning updates. Pass { runToken } to track one specific run
// unambiguously (what triggerAutoProvision's response gives you - use this
// whenever multiple runs might be in flight at once); pass { username, role }
// for the older "most recent run for this username+role" behavior, kept for
// the manual deploy.sh flow which never has a run token. Returns an
// unsubscribe function. onUpdate receives { status, events } each time a new
// step is reported.
export function subscribeToVmProvisioning({ runToken, username, role }, onUpdate) {
  const query = runToken
    ? `token=${encodeURIComponent(runToken)}`
    : `username=${encodeURIComponent(username)}&role=${encodeURIComponent(role)}`;
  const es = new EventSource(`${BACKEND_URL}/p3dx/vm-provisioning/stream?${query}`);
  es.onmessage = (evt) => {
    try {
      onUpdate(JSON.parse(evt.data));
    } catch {
      // ignore malformed frames
    }
  };
  return () => es.close();
}
