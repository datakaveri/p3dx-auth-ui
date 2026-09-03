import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { getKeyPairStatus, downloadPrivateKey } from "../api/keyPair";

export default function UserDashboard() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasApplicationProvider = roles.includes("application-provider");
  const hasDataProvider = roles.includes("data-provider");
  const hasInfraProvider = roles.includes("infra-provider");

  // data-provider and infra-provider each get their own key pair provisioned
  // on approval (see keyPair.service.js KEY_PAIR_ROLES) but a user only ever
  // holds one of the two in practice — pick whichever applies for the
  // status/download calls below.
  const keyRoleName = hasDataProvider ? "data-provider" : hasInfraProvider ? "infra-provider" : null;

  const [keyStatus, setKeyStatus] = useState(null);
  const [keyDownloading, setKeyDownloading] = useState(false);
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

  const handleDownloadKey = async () => {
    if (!keyRoleName) return;
    setKeyError(null);
    setKeyDownloading(true);
    try {
      await downloadPrivateKey(token, keyRoleName);
    } catch (err) {
      setKeyError(err?.message || "Download failed");
    } finally {
      setKeyDownloading(false);
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

          {keyRoleName && keyStatus?.exists ? (
            <button
              className="action-card"
              type="button"
              onClick={handleDownloadKey}
              disabled={keyDownloading}
            >
              <div className="action-title">
                {keyDownloading ? "Downloading..." : "Download Private Key"}
              </div>
              <div className="action-description">
                Download your {keyRoleName} private key
                {keyStatus.download_count > 0 ? ` (downloaded ${keyStatus.download_count} time${keyStatus.download_count === 1 ? "" : "s"} so far)` : ""}.
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
