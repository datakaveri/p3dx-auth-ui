import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import {
  createRoleRequest,
  decideRoleRequest,
  listMyRoleRequests,
  listRoleRequests,
} from "../api/roleRequests";

export default function App() {
  const [user, setUser] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [roleToRequest, setRoleToRequest] = useState("application-provider");
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [adminFilter, setAdminFilter] = useState("pending");
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const roles = user?.roles || [];
  const isAdmin = roles.includes("admin");

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

  const refreshPending = async () => {
    if (!token || !isAdmin) return;
    setPendingLoading(true);
    try {
      const res = await listRoleRequests(token, adminFilter === "all" ? undefined : "pending");
      if (res?.status === "SUCCESS") {
        setPendingRequests(Array.isArray(res.requests) ? res.requests : []);
      }
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return navigate("/login");

    getMe(token)
      .then(res => {
        if (res.status === "SUCCESS") {
          setUser(res.user);
        } else {
          throw new Error();
        }
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        navigate("/login");
      });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    refreshMy();
    refreshPending();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshPending();
  }, [adminFilter]);

  if (!user) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h2>Dashboard</h2>
        <button
          className="btn btn-logout"
          onClick={() => {
            localStorage.removeItem("access_token");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          marginBottom: "12px",
          color: "var(--text-dark)"
        }}>
          Your Profile
        </h3>
        <p style={{ 
          color: "var(--text-light)",
          marginBottom: "16px"
        }}>
          Welcome back! Here's your account information:
        </p>
      </div>

      <div className="card">
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

      <div style={{ marginTop: "28px" }}>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "var(--text-dark)",
          }}
        >
          Request a Role
        </h3>

        {actionError && <div className="error-message">{actionError}</div>}

        <div className="form-group">
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

        <button
          className="btn btn-primary"
          onClick={async () => {
            setActionError(null);
            setActionLoading(true);
            try {
              const res = await createRoleRequest(token, roleToRequest);
              if (res?.status !== "SUCCESS") {
                setActionError(res?.error || "Request failed");
              } else {
                await refreshMy();
                if (isAdmin) await refreshPending();
              }
            } catch (err) {
              setActionError(err?.message || "Request failed");
            } finally {
              setActionLoading(false);
            }
          }}
          disabled={actionLoading}
        >
          {actionLoading ? "Submitting..." : "Submit Request"}
        </button>
      </div>

      <div style={{ marginTop: "28px" }}>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "var(--text-dark)",
          }}
        >
          My Role Requests
        </h3>
        <div className="card" style={{ padding: "0" }}>
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

      {isAdmin && (
        <div style={{ marginTop: "28px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "12px",
              color: "var(--text-dark)",
            }}
          >
            Admin: Pending Role Requests
          </h3>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
            <div className="label" style={{ marginBottom: 0 }}>Filter</div>
            <select
              value={adminFilter}
              onChange={e => setAdminFilter(e.target.value)}
              disabled={pendingLoading || actionLoading}
              style={{
                padding: "10px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "var(--text-dark)",
                backgroundColor: "var(--bg-white)",
              }}
            >
              <option value="pending">Pending only</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="card" style={{ padding: "0" }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Requested By</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Requested At</th>
                    <th style={{ width: "220px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLoading ? (
                    <tr>
                      <td colSpan={5} className="muted">Loading...</td>
                    </tr>
                  ) : pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">No requests</td>
                    </tr>
                  ) : (
                    pendingRequests.map(req => (
                      <tr key={req.request_id}>
                        <td>{req.requested_by || req.user_id}</td>
                        <td>{req.role_name}</td>
                        <td>
                          <span className={statusBadgeClass(req.status)}>{req.status}</span>
                        </td>
                        <td>{formatDateTime(req.created_at || req.created_at_iso)}</td>
                        <td>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button
                              className="btn btn-secondary"
                              style={{ width: "auto", padding: "10px 14px" }}
                              onClick={async () => {
                                if (!window.confirm(`Approve ${req.role_name} for ${req.requested_by || req.user_id}?`)) return;
                                setActionError(null);
                                setActionLoading(true);
                                try {
                                  const res = await decideRoleRequest(token, req.request_id, "APPROVE");
                                  if (res?.status !== "SUCCESS") {
                                    setActionError(res?.error || "Approve failed");
                                  }
                                  await refreshPending();
                                } catch (err) {
                                  setActionError(err?.message || "Approve failed");
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                              disabled={actionLoading || req.status !== "PENDING"}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ width: "auto", padding: "10px 14px" }}
                              onClick={async () => {
                                if (!window.confirm(`Reject ${req.role_name} for ${req.requested_by || req.user_id}?`)) return;
                                setActionError(null);
                                setActionLoading(true);
                                try {
                                  const res = await decideRoleRequest(token, req.request_id, "REJECT");
                                  if (res?.status !== "SUCCESS") {
                                    setActionError(res?.error || "Reject failed");
                                  }
                                  await refreshPending();
                                } catch (err) {
                                  setActionError(err?.message || "Reject failed");
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                              disabled={actionLoading || req.status !== "PENDING"}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
