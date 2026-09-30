import { useEffect, useState } from "react";

// Shows which data providers have signed a contract's hash (re-verified by the
// governance layer against each provider's Keycloak public key) and polls
// until all have. fetchStatus() returns gov_layer's signatures response;
// pollKey restarts polling when it changes (e.g. a new session/contract);
// onStatus(status) lets the parent enable its run/start button on all_signed.
export default function ContractSignatureStatus({ fetchStatus, pollKey, onStatus, blockedText }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pollKey) return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const s = await fetchStatus();
        if (cancelled) return;
        setStatus(s);
        setError(null);
        onStatus?.(s);
        if (s?.all_signed) return;
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to check signatures");
        onStatus?.(null);
      }
      timer = setTimeout(poll, 5000);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // fetchStatus/onStatus are recreated each render; pollKey drives polling
    // (parents also pass it as `key`, so a new contract starts from blank).
  }, [pollKey]);

  return (
    <div style={{ margin: "10px 0", fontSize: 13 }}>
      <div className="label" style={{ marginBottom: 4 }}>Data-provider signatures</div>
      {error ? (
        <div className="error-message" style={{ fontSize: 13 }}>{error}</div>
      ) : !status ? (
        <div style={{ color: "var(--text-light)" }}>Checking signatures…</div>
      ) : (
        <>
          {(status.parties || []).map(p => (
            <div key={`${p.provider_id}-${p.dataset_name}`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{p.provider_id}{p.dataset_name ? ` · ${p.dataset_name}` : ""}</span>
              <span style={{ color: p.valid ? "var(--success, #2e7d32)" : "var(--text-light)" }}>
                {p.valid ? "Signed ✓" : p.signed ? `Invalid: ${p.error}` : "Waiting…"}
              </span>
            </div>
          ))}
          {!status.all_signed && (
            <div style={{ marginTop: 6, color: "var(--text-light)" }}>
              {blockedText || "This can't start until every data provider has signed this contract."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
