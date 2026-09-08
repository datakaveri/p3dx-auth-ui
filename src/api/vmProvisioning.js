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
// login + Terraform). Returns immediately; progress arrives over
// subscribeToVmProvisioning below.
export async function triggerAutoProvision(role, token, vmName) {
  const res = await fetch(`${BACKEND_URL}/p3dx/vm-provisioning/auto-create`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ role, vmName }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.error || `Failed to start VM provisioning (${res.status})`);
  }
  return data;
}

// Downloads the SSH private key generated for the caller's most recent
// auto-created VM (one-time — the backend clears it after this succeeds).
export async function downloadVmPrivateKey(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/vm-provisioning/private-key`, {
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

// Live VM-provisioning updates for this username+role (a participant can have
// a session in flight for both roles at once, so role scopes which one's
// progress this subscribes to). Returns an unsubscribe function. onUpdate
// receives { status, events } each time deploy.sh reports a new step.
export function subscribeToVmProvisioning(username, role, onUpdate) {
  const es = new EventSource(
    `${BACKEND_URL}/p3dx/vm-provisioning/stream?username=${encodeURIComponent(username)}&role=${encodeURIComponent(role)}`
  );
  es.onmessage = (evt) => {
    try {
      onUpdate(JSON.parse(evt.data));
    } catch {
      // ignore malformed frames
    }
  };
  return () => es.close();
}
