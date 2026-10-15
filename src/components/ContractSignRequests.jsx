import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import {
  listContractSignRequests, signContractHash, submitContractSignature, verifyGovernanceSignature, withdrawConsent,
} from "../api/contractSigning";
import DpdpConsentNotice from "./DpdpConsentNotice";

// Data-provider panel: contracts (FL final roster, TEE, SMPC) that use one of
// the provider's datasets. gov_layer hashes each contract, signs the hash with
// its own private key, and sends hash + governance signature + governance
// public key + contract here. The governance signature is checked in the
// browser first; only then can the provider pick their private key file, the
// hash is signed in the browser, and only the signature goes back.
export default function ContractSignRequests({ token }) {
  const [requests, setRequests] = useState([]);
  // notification id -> true/false once the governance signature is checked
  const [govVerified, setGovVerified] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [keyFiles, setKeyFiles] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [rowMessage, setRowMessage] = useState({});
  // notification id -> true once the DPDP consent notice has been acknowledged
  const [noticeAck, setNoticeAck] = useState({});

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listContractSignRequests(token);
      setRequests(list);
      const checks = await Promise.all(list.map(async n => {
        const p = n.payload || {};
        return [n.id, await verifyGovernanceSignature(p.governance_public_key, p.contract_hash, p.governance_signature)];
      }));
      setGovVerified(Object.fromEntries(checks));
    } catch (e) {
      setError(e?.message || "Failed to load contracts to sign");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token]);

  // TEE only: withdraw consent given by signing (DPDP Act s.6(4)). gov_layer
  // clears the signature, so no further run starts; the provider can sign
  // again later to re-consent.
  const withdraw = async n => {
    const p = n.payload || {};
    if (!window.confirm(`Withdraw your consent for contract ${p.contract_id}? No further TEE run will start on it. A run already in progress is not stopped.`)) return;
    setBusyId(n.id);
    setRowMessage(m => ({ ...m, [n.id]: null }));
    try {
      await withdrawConsent(token, p.contract_id, { notificationId: n.id });
      setNoticeAck(a => ({ ...a, [n.id]: false }));
      setRowMessage(m => ({ ...m, [n.id]: { error: false, text: "Consent withdrawn." } }));
      await refresh();
    } catch (e) {
      setRowMessage(m => ({ ...m, [n.id]: { error: true, text: e?.message || "Withdrawal failed" } }));
    } finally {
      setBusyId(null);
    }
  };

  const sign = async n => {
    const p = n.payload || {};
    const file = keyFiles[n.id];
    if (!noticeAck[n.id]) {
      setExpanded(n.id);
      setRowMessage(m => ({ ...m, [n.id]: { error: true, text: "Read the consent notice and tick the box first" } }));
      return;
    }
    if (!file) {
      setRowMessage(m => ({ ...m, [n.id]: { error: true, text: "Choose your private key (.pem) file first" } }));
      return;
    }
    setBusyId(n.id);
    setRowMessage(m => ({ ...m, [n.id]: null }));
    try {
      // Step 1: the hash must carry a valid governance signature.
      const govOk = await verifyGovernanceSignature(p.governance_public_key, p.contract_hash, p.governance_signature);
      if (!govOk) {
        throw new Error("Governance signature on this contract hash did not verify — not signing.");
      }
      // Step 2: sign the same hash with the provider's own private key.
      const pem = await file.text();
      const signature = await signContractHash(pem, p.contract_hash);
      const res = await submitContractSignature(token, p.contract_id, {
        notificationId: n.id,
        contractHash: p.contract_hash,
        signature,
      });
      setRowMessage(m => ({
        ...m,
        [n.id]: { error: false, text: `Signed and ${res?.message || "sent to governance layer"}.` },
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
      <h3 className="section-title" style={{ marginBottom: "4px" }}>Contracts to Sign</h3>
      <div style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "12px" }}>
        Contracts that use your datasets. The governance layer's signature is checked first; then sign the contract hash with your private key.
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Service</th>
                <th>Requested by</th>
                <th>Contract hash</th>
                <th>Governance signature</th>
                <th>Status</th>
                <th style={{ width: "320px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="muted">Loading...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">No contracts waiting for your signature</td>
                </tr>
              ) : (
                requests.map(n => {
                  const p = n.payload || {};
                  const signed = n.response === "accepted";
                  const withdrawn = n.response === "withdrawn";
                  const msg = rowMessage[n.id];
                  const gov = govVerified[n.id];
                  return (
                    <tr key={n.id}>
                      <td>{p.contract_id}</td>
                      <td>{p.technique || "—"}</td>
                      <td>{n.sender_username}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>{p.contract_hash}</td>
                      <td>
                        <span className="table-badge table-badge--neutral">
                          {gov === undefined ? "Checking…" : gov ? "Verified ✓" : "Invalid ✗"}
                        </span>
                      </td>
                      <td>
                        <span className="table-badge table-badge--neutral">{signed ? "Signed" : withdrawn ? "Consent withdrawn" : "Awaiting signature"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ width: "auto" }}
                            type="button"
                            onClick={() => setExpanded(n.id)}
                          >
                            View consent request
                          </button>
                          {signed && p.technique === "TEE" ? (
                            <button
                              className="btn btn-danger"
                              style={{ width: "auto" }}
                              type="button"
                              disabled={busyId === n.id}
                              onClick={() => withdraw(n)}
                            >
                              {busyId === n.id ? "Withdrawing..." : "Withdraw consent"}
                            </button>
                          ) : null}
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
                                disabled={busyId === n.id || gov !== true || !noticeAck[n.id]}
                                title={noticeAck[n.id] ? undefined : "Read the consent notice first"}
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(() => {
        const n = requests.find(r => r.id === expanded);
        if (!n) return null;
        const p = n.payload || {};
        const signed = n.response === "accepted";
        return (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setExpanded(null)}>
            <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header cpm-header">
                <div className="modal-title">
                  <FileText size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
                  Consent Request — {p.contract_id}
                </div>
                <button type="button" className="cat-icon-btn" onClick={() => setExpanded(null)} title="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="cpm-body">
                <DpdpConsentNotice
                  contract={p.contract}
                  requestedBy={n.sender_username}
                  acknowledged={signed || noticeAck[n.id]}
                  onAcknowledge={signed ? undefined : v => setNoticeAck(a => ({ ...a, [n.id]: v }))}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
