import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { createRoleRequest, listMyRoleRequests, listAvailableDatasets } from "../api/roleRequests";

// Single "request access" page for every role-gated service (Federated
// Learning, SMPC, TEE, Differential Privacy). AppShell sends non-admins here
// first after login, before they ever reach the services list — so the
// request always happens before service selection, never inside a service
// page. Every role goes through admin approval; once approved, the relevant
// service page picks up the granted role automatically.
const ROLE_OPTIONS = [
  { value: "application-provider", label: "Application Provider — SMPC / TEE / Differential Privacy" },
  { value: "data-provider", label: "Data Provider — Federated Learning / SMPC / TEE / Differential Privacy" },
  { value: "infra-provider", label: "Infrastructure Provider — SMPC" },
];

export default function RoleRequest() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();

  const [myRequests, setMyRequests] = useState([]);
  const [roleToRequest, setRoleToRequest] = useState(ROLE_OPTIONS[0].value);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);

  // Datasets submitted by data providers — pulled from APD. All of them are
  // sent along to Continue to Services, regardless of whether the user has
  // any role granted yet.
  const [datasets, setDatasets] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);

  const roles = useMemo(() => user?.roles || [], [user]);
  const selectedOption = ROLE_OPTIONS.find(r => r.value === roleToRequest);
  const hasSelectedRole = roles.includes(roleToRequest);

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
    if (s === "PENDING") return "badge badge-warning badge-pulse";
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

  useEffect(() => {
    const loadDatasets = async () => {
      if (!token) return;
      setDatasetsLoading(true);
      try {
        const res = await listAvailableDatasets(token);
        setDatasets(res?.status === "SUCCESS" && Array.isArray(res.datasets) ? res.datasets : []);
      } finally {
        setDatasetsLoading(false);
      }
    };
    loadDatasets();
  }, [token]);

  const handleContinueToServices = () => {
    if (datasets.length === 0) return;
    navigate("/app/services", { state: { datasets } });
  };

  const handleSubmit = async () => {
    if (hasSelectedRole) return;
    setActionError(null);
    setActionSuccess(null);

    setActionLoading(true);
    try {
      const res = await createRoleRequest(token, roleToRequest);
      if (res?.status !== "SUCCESS") {
        setActionError(res?.error || "Request failed");
      } else {
        await refreshMy();
        setActionSuccess(`Your request for "${selectedOption?.label || roleToRequest}" has been submitted and is pending admin approval.`);
      }
    } catch (err) {
      setActionError(err?.message || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Request Access</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Request a role before using any service. An admin needs to approve it before your access is granted.
          </div>
        </div>
      </div>

      {actionError ? <div className="error-message">{actionError}</div> : null}
      {actionSuccess ? (
        <div
          className="info-banner"
          style={{ backgroundColor: "var(--success-color, #27ae60)", color: "white", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}
        >
          {actionSuccess}
        </div>
      ) : null}

      <div className="card">
        <div className="form-group" style={{ marginBottom: "14px" }}>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            value={roleToRequest}
            onChange={e => {
              setRoleToRequest(e.target.value);
              setActionError(null);
              setActionSuccess(null);
            }}
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
            {ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {hasSelectedRole ? (
          <div className="info-banner" style={{ marginBottom: "14px" }}>
            You already have the selected role.
          </div>
        ) : null}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={actionLoading || hasSelectedRole}>
          {actionLoading ? "Submitting..." : "Submit Request"}
        </button>
      </div>

      <div style={{ marginTop: "22px" }}>
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

      <div style={{ marginTop: "22px" }}>
        <div className="card">
          {datasetsLoading ? (
            <div className="muted">Loading datasets...</div>
          ) : datasets.length === 0 ? (
            <div className="muted">No datasets available yet.</div>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: "auto" }}
              onClick={handleContinueToServices}
            >
              Continue to Services
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
