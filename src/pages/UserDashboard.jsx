import { useMemo } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";

export default function UserDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasApplicationProvider = roles.includes("application-provider");
  const hasDataProvider = roles.includes("data-provider");
  const isSMPC = location.pathname.includes("/services/smpc");
  // Technique threaded into the workload picker — only FL/SMPC are wired to
  // contract generation today; /dp has no technique value to pass yet.
  const technique = isSMPC ? "SMPC" : undefined;

  const DISPLAY_ROLES = ["user", "application-provider", "data-provider"];
  const displayRoles = roles.filter(r => DISPLAY_ROLES.includes(r));

  const serviceLabel = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/services/fl")) return "Federated Learning";
    if (path.includes("/services/smpc")) return "SMPC";
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
        </div>
      </div>

      {isSMPC ? (
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
            Start SMPC
          </button>
        </div>
      ) : null}

      {!hasApplicationProvider && !hasDataProvider && (
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
