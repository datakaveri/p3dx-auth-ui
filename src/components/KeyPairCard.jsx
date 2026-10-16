import { useEffect, useState } from "react";
import { downloadPublicKeyFile, generateAndRegisterKeyPair, getKeyPairStatus } from "../api/keyPair";

// "Your signing keys" — shown on Role Access once the user holds
// data-provider and/or infra-provider (KEY_PAIR_ROLES). The key pair is per
// user, shared across those roles, so roleName only picks which role's
// endpoints to call.
//
// Download private key: generates a NEW pair in the browser, saves the
// private key to disk and registers the public key (the platform never
// stores the private key, so it can't be downloaded again later).
// Download public key: the public key currently registered.
export default function KeyPairCard({ token, roleName }) {
  const [status, setStatus] = useState(null); // { exists, publicKey }
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await getKeyPairStatus(token, roleName);
      if (res?.status === "SUCCESS") setStatus(res);
    } catch (e) {
      setError(e?.message || "Couldn't load your key status");
    }
  };

  useEffect(() => {
    if (token && roleName) loadStatus();
  }, [token, roleName]);

  const handlePrivate = async () => {
    if (
      status?.exists &&
      !window.confirm(
        "This creates a NEW key pair and replaces your registered public key. Your current private key file will no longer work for new signatures. Continue?"
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    setGenerating(true);
    try {
      await generateAndRegisterKeyPair(token, roleName);
      setMessage("New private key saved to your device and its public key registered. Keep the private key safe — it can't be downloaded again.");
      await loadStatus();
    } catch (e) {
      setError(e?.message || "Key generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublic = () => {
    if (status?.publicKey) downloadPublicKeyFile(status.publicKey, `${roleName}-public-key.pem`);
  };

  return (
    <div className="card" style={{ marginTop: "22px" }}>
      <h3 className="section-title" style={{ marginBottom: "4px" }}>Your signing keys</h3>
      <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "14px" }}>
        Used to sign consent requests as a {roleName}.{" "}
        {status ? (status.exists ? "A key pair is registered." : "No key pair registered yet.") : "Checking…"}
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {message ? <div className="info-banner" style={{ marginBottom: "14px" }}>{message}</div> : null}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="btn btn-primary" style={{ width: "auto" }} type="button" disabled={!status || generating} onClick={handlePrivate}>
          {generating ? "Generating..." : status?.exists ? "Regenerate & download private key" : "Download private key"}
        </button>
        {/* Public key download removed for now:
        <button className="btn btn-secondary" style={{ width: "auto" }} type="button" disabled={!status?.publicKey} onClick={handlePublic}>
          Download public key
        </button>
        */}
      </div>
      <div style={{ color: "var(--text-light)", fontSize: "12px", marginTop: "10px" }}>
        The private key is created in your browser and saved only to your device — the platform never stores it.
      </div>
    </div>
  );
}
