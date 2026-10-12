import { useEffect, useState } from "react";

// Shows whether a contract's data-provider signatures match (re-verified by
// the governance layer against each provider's registered public key) and
// polls until they do. fetchStatus() returns gov_layer's signatures response,
// {signatures: "matching"|"not matching", tee: "can run"|"cannot run"};
// pollKey restarts polling when it changes (e.g. a new session/contract);
// onStatus(status) lets the parent enable its run/start button on tee "can run".
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
        if (s?.tee === "can run") return;
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
          <div style={{ color: status.tee === "can run" ? "var(--success, #2e7d32)" : "var(--text-light)" }}>
            {status.tee === "can run" ? "Signatures matching ✓ — can run" : "Signatures not matching yet"}
          </div>
          {status.tee !== "can run" && (
            <div style={{ marginTop: 6, color: "var(--text-light)" }}>
              {blockedText || "This can't start until every data provider has signed this contract."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
