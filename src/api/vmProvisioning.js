import { ORCHESTRATOR_URL } from "../config";
import { authFetch } from "./session";

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
  const res = await authFetch(`${ORCHESTRATOR_URL}/p3dx/vm-provisioning/token`, {
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
// credentialId (from issueVmCredential) is required by the backend for a
// data-provider run tied to a submission; omitted from the body otherwise.
// vmName is only sent when there is no submissionId (the orchestrator names
// session VMs itself); outputOwnerUsername is optional.
export async function triggerAutoProvision(role, token, vmName, runKey, submissionId = null, credentialId = null, outputOwnerUsername = null) {
  const body = { role, runKey, submissionId };
  if (!submissionId) body.vmName = vmName;
  if (credentialId) body.credentialId = credentialId;
  if (outputOwnerUsername) body.outputOwnerUsername = outputOwnerUsername;
  const res = await authFetch(`${ORCHESTRATOR_URL}/p3dx/vm-provisioning/auto-create`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    const err = new Error(data?.error || `Failed to start VM provisioning (${res.status})`);
    err.code = data?.error || null;
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

// Downloads the SSH private key generated for one specific auto-created VM
// run, identified by runToken (the `token` returned from triggerAutoProvision
// above) — one-time, the backend clears it after this succeeds.
export async function downloadVmPrivateKey(token, runToken) {
  const res = await authFetch(`${ORCHESTRATOR_URL}/p3dx/vm-provisioning/private-key?token=${encodeURIComponent(runToken)}`, {
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

// Lists the caller's provisioning runs, newest first (for role "user", runs
// whose output owner is the caller). Optionally filtered by submissionId.
export async function getMyRuns(token, { submissionId } = {}) {
  const q = submissionId ? `?submissionId=${encodeURIComponent(submissionId)}` : "";
  const res = await authFetch(`${ORCHESTRATOR_URL}/p3dx/vm-provisioning/runs${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.error || `Failed to load runs (${res.status})`);
  return Array.isArray(data?.runs) ? data.runs : [];
}

// Live VM-provisioning updates for one specific run, identified by runToken
// (from triggerAutoProvision's response or getMyRuns). Returns an unsubscribe
// function. onUpdate receives { status, events, vmReady } on each new step.
export function subscribeToVmProvisioning({ runToken }, onUpdate) {
  const es = new EventSource(`${ORCHESTRATOR_URL}/p3dx/vm-provisioning/stream?token=${encodeURIComponent(runToken)}`);
  es.onmessage = (evt) => {
    try {
      onUpdate(JSON.parse(evt.data));
    } catch {
      // ignore malformed frames
    }
  };
  return () => es.close();
}
