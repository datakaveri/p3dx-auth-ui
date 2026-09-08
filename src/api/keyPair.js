import { BACKEND_URL } from "../config";

export async function getKeyPairStatus(token, roleName) {
  const res = await fetch(`${BACKEND_URL}/p3dx/keys/${encodeURIComponent(roleName)}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// Triggers a browser file-save for the PEM rather than returning its contents,
// since the private key should never pass through app state or get rendered.
export async function downloadPrivateKey(token, roleName) {
  const res = await fetch(`${BACKEND_URL}/p3dx/keys/${encodeURIComponent(roleName)}/private-key`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Download failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${roleName}-private-key.pem`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
