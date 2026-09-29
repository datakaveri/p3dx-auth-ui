import { BACKEND_URL } from "../config";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// TEE contracts waiting on (or already given) this data provider's signature.
export async function listTeeSignRequests(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/tee-contracts/sign-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || "Failed to load contracts to sign");
  }
  return Array.isArray(data?.requests) ? data.requests : [];
}

export async function submitTeeContractSignature(token, contractId, { notificationId, contractHash, signature }) {
  const res = await fetch(`${BACKEND_URL}/p3dx/tee-contracts/${encodeURIComponent(contractId)}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ notificationId, contractHash, signature }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw new Error(data?.message || data?.error || "Failed to submit signature");
  }
  return data;
}

// Signs the contract hash string in the browser with the provider's
// PKCS#8 PEM private key (the file saved by "Generate Key Pair"), using
// RSASSA-PKCS1-v1_5 / SHA-256 — what gov_layer's VerifyContractHashSignature
// checks. The key is only read locally; it is never sent anywhere.
export async function signContractHash(privateKeyPem, contractHash) {
  const b64 = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  if (!b64 || privateKeyPem.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("Expected a PKCS#8 PEM private key (-----BEGIN PRIVATE KEY-----)");
  }
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(contractHash));
  let bin = "";
  new Uint8Array(sig).forEach(b => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}
