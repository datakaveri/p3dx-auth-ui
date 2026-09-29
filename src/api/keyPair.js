import { BACKEND_URL } from "../config";

export async function getKeyPairStatus(token, roleName) {
  const res = await fetch(`${BACKEND_URL}/p3dx/keys/${encodeURIComponent(roleName)}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// Generates the provider's RSA key pair entirely in the browser (WebCrypto),
// saves the PKCS#8 private key straight to the user's disk, and only then
// uploads the SPKI public key — the platform never sees the private key and
// stores only the public half (in Keycloak). RSASSA-PKCS1-v1_5 / SHA-256 is
// what signContractHash signs with and gov_layer verifies against.
//
// The private key is saved BEFORE the public key is registered, so a
// cancelled/failed save never leaves a registered public key with no
// matching private key on the user's side.
export async function generateAndRegisterKeyPair(token, roleName) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const privateKeyPem = toPem(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey), "PRIVATE KEY");
  const publicKeyPem = toPem(await crypto.subtle.exportKey("spki", keyPair.publicKey), "PUBLIC KEY");

  const saved = await savePrivateKeyFile(privateKeyPem, `${roleName}-private-key.pem`);
  if (!saved) {
    throw new Error("Private key was not saved — key pair not registered");
  }

  const res = await fetch(`${BACKEND_URL}/p3dx/keys/${encodeURIComponent(roleName)}/public-key`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicKeyPem }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.status !== "SUCCESS") {
    throw new Error(data?.error || `Registering public key failed (${res.status})`);
  }
  return data;
}

function toPem(buffer, label) {
  let bin = "";
  new Uint8Array(buffer).forEach(b => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin).match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}

// Uses the File System Access save dialog where available so a cancel can be
// detected (returns false); otherwise falls back to a plain download link.
async function savePrivateKeyFile(pem, filename) {
  if (typeof window.showSaveFilePicker === "function") {
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "PEM private key", accept: { "application/x-pem-file": [".pem"] } }],
      });
    } catch (err) {
      if (err?.name === "AbortError") return false;
      throw err;
    }
    const writable = await handle.createWritable();
    await writable.write(pem);
    await writable.close();
    return true;
  }

  const blob = new Blob([pem], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
