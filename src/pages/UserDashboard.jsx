import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { createRoleRequest, listMyRoleRequests } from "../api/roleRequests";

export default function UserDashboard() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const roleRequestRef = useRef(null);
  const myRequestsRef = useRef(null);

  const [myRequests, setMyRequests] = useState([]);
  const [roleToRequest, setRoleToRequest] = useState("application-provider");
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);

  const roles = useMemo(() => user?.roles || [], [user]);
  const hasApplicationProvider = roles.includes("application-provider");
  const hasDataProvider = roles.includes("data-provider");

  const serviceLabel = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/services/fl")) return "Federated Learning";
    if (path.includes("/services/smpc")) return "SMPC";
    if (path.includes("/services/dp")) return "Differential Privacy";
    return "Service";
  }, [location.pathname]);

  const formatDateTime = value => {
    if (!value) return "";
    const date = typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const statusBadgeClass = status => {
    const s = String(status || "").toUpperCase();
    if (s === "APPROVED") return "badge badge-success";
    if (s === "REJECTED") return "badge badge-error";
    if (s === "PENDING") return "badge badge-warning";
    return "badge";
  };

  const refreshMy = async () => {
    if (!token) return;
    setMyLoading(true);
    try {
      const res = await listMyRoleRequests(token);
      if (res?.status === "SUCCESS") {
        setMyRequests(Array.isArray(res.requests) ? res.requests : []);
      }
    } finally {
      setMyLoading(false);
    }
  };

  useEffect(() => {
    refreshMy();
  }, []);

  const shouldDisableRequest =
    (roleToRequest === "application-provider" && hasApplicationProvider) ||
    (roleToRequest === "data-provider" && hasDataProvider);

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div>
            <h3 className="section-title" style={{ marginBottom: "6px" }}>{serviceLabel}</h3>
            <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
              Manage your access and actions for this service.
            </div>
          </div>
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
            {Array.isArray(user.roles) && user.roles.length > 0 ? (
              user.roles.map(r => (
                <span key={r} className={r === "admin" ? "pill pill-admin" : "pill"}>
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
          <button
            className="action-card"
            type="button"
            onClick={() =>
              navigate("/app/services/run", {
                state: { returnTo: location.pathname },
              })
            }
          >
            <div className="action-title">Run Workload</div>
            <div className="action-description">
              Select a dataset + model and start a workload (dummy flow).
            </div>
          </button>

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
                Set access policies for datasets and applications (dummy flow).
              </div>
            </button>
          ) : null}

          <button
            className="action-card"
            type="button"
            onClick={() => roleRequestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <div className="action-title">Request Access</div>
            <div className="action-description">Request application-provider or data-provider access.</div>
          </button>

          <button
            className="action-card"
            type="button"
            onClick={() => myRequestsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <div className="action-title">View My Requests</div>
            <div className="action-description">Track pending/approved/rejected status.</div>
          </button>
        </div>
      </div>

      <div ref={roleRequestRef} style={{ marginTop: "20px" }}>
        <h3 className="section-title">Request Access</h3>

        {actionError ? <div className="error-message">{actionError}</div> : null}

        {(hasApplicationProvider || hasDataProvider) ? (
          <div className="info-banner">
            You already have:
            {hasApplicationProvider ? " application-provider" : ""}
            {hasApplicationProvider && hasDataProvider ? "," : ""}
            {hasDataProvider ? " data-provider" : ""}
            . You can still request the other role.
          </div>
        ) : null}

        <div className="card">
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={roleToRequest}
              onChange={e => setRoleToRequest(e.target.value)}
              disabled={actionLoading}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "var(--text-dark)",
                backgroundColor: "var(--bg-white)",
              }}
            >
              <option value="application-provider">application-provider</option>
              <option value="data-provider">data-provider</option>
            </select>
          </div>

          {shouldDisableRequest ? (
            <div className="info-banner" style={{ marginBottom: "14px" }}>
              You already have the selected role.
            </div>
          ) : null}

          <button
            className="btn btn-primary"
            onClick={async () => {
              if (shouldDisableRequest) return;
              setActionError(null);
              setActionLoading(true);
              try {
                const res = await createRoleRequest(token, roleToRequest);
                if (res?.status !== "SUCCESS") {
                  setActionError(res?.error || "Request failed");
                } else {
                  await refreshMy();
                }
              } catch (err) {
                setActionError(err?.message || "Request failed");
              } finally {
                setActionLoading(false);
              }
            }}
            disabled={actionLoading || shouldDisableRequest}
          >
            {actionLoading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>

      <div ref={myRequestsRef} style={{ marginTop: "22px" }}>
        <h3 className="section-title">My Role Requests</h3>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {myLoading ? (
                  <tr>
                    <td colSpan={3} className="muted">Loading...</td>
                  </tr>
                ) : myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">No requests yet</td>
                  </tr>
                ) : (
                  myRequests.map(r => (
                    <tr key={r.request_id}>
                      <td>{r.role_name}</td>
                      <td>
                        <span className={statusBadgeClass(r.status)}>{r.status}</span>
                      </td>
                      <td>{formatDateTime(r.created_at || r.created_at_iso)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
