import { useEffect, useState } from "react";
import { listTeeSignRequests, signContractHash, submitTeeContractSignature } from "../api/teeContracts";

// Data-provider panel: TEE contracts generated against one of the provider's
// datasets. gov_layer hashes each contract and sends the hash + contract here;
// the provider picks their private key file, the hash is signed in the
// browser, and only the signature goes back to the governance layer.
export default function TeeContractSignRequests({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [keyFiles, setKeyFiles] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [rowMessage, setRowMessage] = useState({});

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRequests(await listTeeSignRequests(token));
    } catch (e) {
      setError(e?.message || "Failed to load contracts to sign");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token]);

  const sign = async n => {
    const p = n.payload || {};
    const file = keyFiles[n.id];
    if (!file) {
      setRowMessage(m => ({ ...m, [n.id]: { error: true, text: "Choose your private key (.pem) file first" } }));
      return;
    }
    setBusyId(n.id);
    setRowMessage(m => ({ ...m, [n.id]: null }));
    try {
      const pem = await file.text();
      const signature = await signContractHash(pem, p.contract_hash);
      const res = await submitTeeContractSignature(token, p.contract_id, {
        notificationId: n.id,
        contractHash: p.contract_hash,
        signature,
      });
      setRowMessage(m => ({
        ...m,
        [n.id]: { error: false, text: res?.all_signed ? "Signed. All providers have now signed." : "Signed and sent to the governance layer." },
      }));
      await refresh();
    } catch (e) {
      setRowMessage(m => ({ ...m, [n.id]: { error: true, text: e?.message || "Signing failed" } }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <h3 className="section-title" style={{ marginBottom: "4px" }}>TEE Contracts to Sign</h3>
      <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
        Contracts generated using your datasets. Sign the contract hash with your private key.
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Requested by</th>
                <th>Contract hash</th>
                <th>Status</th>
                <th style={{ width: "320px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">Loading...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No contracts waiting for your signature</td>
                </tr>
              ) : (
                requests.map(n => {
                  const p = n.payload || {};
                  const signed = n.response === "accepted";
                  const msg = rowMessage[n.id];
                  return [
                    <tr key={n.id}>
                      <td>{p.contract_id}</td>
                      <td>{n.sender_username}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>{p.contract_hash}</td>
                      <td>
                        <span className="table-badge table-badge--neutral">{signed ? "Signed" : "Awaiting signature"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ width: "auto" }}
                            type="button"
                            onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                          >
                            {expanded === n.id ? "Hide contract" : "View contract"}
                          </button>
                          {signed ? null : (
                            <>
                              <input
                                type="file"
                                accept=".pem"
                                disabled={busyId === n.id}
                                onChange={e => setKeyFiles(k => ({ ...k, [n.id]: e.target.files?.[0] || null }))}
                              />
                              <button
                                className="btn btn-primary"
                                style={{ width: "auto" }}
                                type="button"
                                disabled={busyId === n.id}
                                onClick={() => sign(n)}
                              >
                                {busyId === n.id ? "Signing..." : "Sign & send"}
                              </button>
                            </>
                          )}
                          {msg ? (
                            <div style={{ fontSize: "13px", color: msg.error ? "var(--danger, #c0392b)" : "var(--text-light)" }}>{msg.text}</div>
                          ) : null}
                        </div>
                      </td>
                    </tr>,
                    expanded === n.id ? (
                      <tr key={`${n.id}-contract`}>
                        <td colSpan={5}>
                          <pre style={{ maxHeight: "360px", overflow: "auto", fontSize: "12px", margin: 0, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(p.contract, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null,
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
