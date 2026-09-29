import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { getKeyPairStatus, generateAndRegisterKeyPair } from "../api/keyPair";

export default function UserDashboard() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasApplicationProvider = roles.includes("application-provider");
  const hasDataProvider = roles.includes("data-provider");
  const hasInfraProvider = roles.includes("infra-provider");

  // data-provider and infra-provider generate their key pair here in the
  // browser (see api/keyPair.js; KEY_PAIR_ROLES in keyPair.service.js) — the
  // private key is saved to their disk and only the public key is sent to the
  // platform. A user only ever holds one of the two roles in practice, so pick
  // whichever applies for the status/generate calls below.
  const keyRoleName = hasDataProvider ? "data-provider" : hasInfraProvider ? "infra-provider" : null;

  const [keyStatus, setKeyStatus] = useState(null);
  const [keyGenerating, setKeyGenerating] = useState(false);
  const [keyError, setKeyError] = useState(null);

  useEffect(() => {
    if (!keyRoleName || !token) return;
    let cancelled = false;
    getKeyPairStatus(token, keyRoleName).then(res => {
      if (!cancelled && res?.status === "SUCCESS") {
        setKeyStatus(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [keyRoleName, token]);

  const handleGenerateKey = async () => {
    if (!keyRoleName) return;
    if (
      keyStatus?.exists &&
      !window.confirm(
        "Regenerating replaces your registered public key. Your current private key file will no longer work for new signatures. Continue?"
      )
    ) {
      return;
    }
    setKeyError(null);
    setKeyGenerating(true);
    try {
      await generateAndRegisterKeyPair(token, keyRoleName);
      setKeyStatus(s => ({ ...(s || {}), exists: true }));
    } catch (err) {
      setKeyError(err?.message || "Key generation failed");
    } finally {
      setKeyGenerating(false);
    }
  };
  const isSMPC = location.pathname.includes("/services/smpc");
  const isTEE = location.pathname.includes("/services/anon");
  // Technique threaded into the workload picker — only FL/SMPC/TEE are wired
  // to contract generation today; /dp has no technique value to pass yet.
  const technique = isSMPC ? "SMPC" : isTEE ? "TEE" : undefined;

  const DISPLAY_ROLES = ["user", "application-provider", "data-provider", "infra-provider"];
  const displayRoles = roles.filter(r => DISPLAY_ROLES.includes(r));

  const serviceLabel = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/services/fl")) return "Federated Learning";
    if (path.includes("/services/smpc")) return "SMPC";
    if (path.includes("/services/anon")) return "TEE";
    if (path.includes("/services/dp")) return "Differential Privacy";
    return "Service";
  }, [location.pathname]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>{serviceLabel}</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Manage your access and actions for this service.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => navigate("/app/services")}
          >
            Back to Services
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card__label">Roles</div>
          <div className="stat-card__value stat-card__value--blue">{displayRoles.length}</div>
        </div>
      </div>

      {/* User info card */}
      <div className="card" style={{ marginBottom: "18px" }}>
        <div className="grid">
          <div>
            <div className="label">Username</div>
            <div className="value">{user.username}</div>
          </div>
          <div>
            <div className="label">Email</div>
            <div className="value">{user.email}</div>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div className="label" style={{ marginBottom: "8px" }}>
            Roles
          </div>
          <div className="pill-row">
            {displayRoles.length > 0 ? (
              displayRoles.map(r => (
                <span key={r} className="pill">
                  {r}
                </span>
              ))
            ) : (
              <span className="value">No roles</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <h3 className="section-title">Actions</h3>
        <div className="action-grid">
          {hasDataProvider ? (
            <button
              className="action-card"
              type="button"
              onClick={() =>
                navigate("/app/services/policies", {
                  state: { returnTo: location.pathname },
                })
              }
            >
              <div className="action-title">Set Policies</div>
              <div className="action-description">
                Set access policies for datasets and applications.
              </div>
            </button>
          ) : null}

          {isSMPC && hasInfraProvider ? (
            <button
              className="action-card"
              type="button"
              onClick={() =>
                navigate("/app/services/infra-policy", {
                  state: { returnTo: location.pathname },
                })
              }
            >
              <div className="action-title">Set Infrastructure Policy</div>
              <div className="action-description">
                Register your infrastructure's capacity, attestation, and access rules for SMPC.
              </div>
            </button>
          ) : null}

          {keyRoleName && keyStatus ? (
            <button
              className="action-card"
              type="button"
              onClick={handleGenerateKey}
              disabled={keyGenerating}
            >
              <div className="action-title">
                {keyGenerating ? "Generating..." : keyStatus.exists ? "Regenerate Key Pair" : "Generate Key Pair"}
              </div>
              <div className="action-description">
                {keyStatus.exists
                  ? `Replace your ${keyRoleName} key pair. The new private key is saved to your device only.`
                  : `Create your ${keyRoleName} key pair. The private key is saved to your device only — keep it safe, the platform cannot recover it.`}
              </div>
            </button>
          ) : null}
        </div>
        {keyError ? <div className="error-message">{keyError}</div> : null}
      </div>

      {(isSMPC || isTEE) && !hasApplicationProvider && !hasDataProvider && !(isSMPC && hasInfraProvider) ? (
        <div style={{ marginBottom: "18px" }}>
          <button
            className="btn btn-primary"
            type="button"
            style={{ width: "auto" }}
            onClick={() =>
              navigate("/app/services/run", {
                state: { returnTo: location.pathname, technique },
              })
            }
          >
            Catalogue
          </button>
        </div>
      ) : null}

      {!hasApplicationProvider && !hasDataProvider && !(isSMPC && hasInfraProvider) && (
        <div className="card" style={{ marginBottom: "18px" }}>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            You need the <strong>application-provider</strong> or <strong>data-provider</strong> role for full access to this service.
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            style={{ width: "auto", marginTop: "10px" }}
            onClick={() => navigate("/app/role-request")}
          >
            Request Access
          </button>
        </div>
      )}
    </div>
  );
}
