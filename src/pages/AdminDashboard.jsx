import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { decideRoleRequest, listRoleRequests } from "../api/roleRequests";
import Modal from "../components/Modal";

export default function AdminDashboard() {
  const { token, isAdmin } = useOutletContext();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState({ open: false, request: null, decision: null });

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

  const refresh = async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        listRoleRequests(token, "pending"),
        listRoleRequests(token, "approved"),
        listRoleRequests(token, "rejected"),
      ]);

      const anyFailed =
        pendingRes?.status !== "SUCCESS" ||
        approvedRes?.status !== "SUCCESS" ||
        rejectedRes?.status !== "SUCCESS";

      if (anyFailed) {
        throw new Error(
          pendingRes?.error || approvedRes?.error || rejectedRes?.error || "FETCH_FAILED"
        );
      }

      setPendingRequests(Array.isArray(pendingRes.requests) ? pendingRes.requests : []);
      setApprovedRequests(Array.isArray(approvedRes.requests) ? approvedRes.requests : []);
      setRejectedRequests(Array.isArray(rejectedRes.requests) ? rejectedRes.requests : []);
    } catch (e) {
      setError(e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (!isAdmin) {
    return (
      <div>
        <h3 className="section-title">Admin</h3>
        <div className="info-banner">You do not have access to admin tools.</div>
      </div>
    );
  }

  const openDecision = (req, decision) => {
    setModal({ open: true, request: req, decision });
  };

  const closeDecision = () => {
    setModal({ open: false, request: null, decision: null });
  };

  const confirmDecision = async () => {
    const req = modal.request;
    const decision = modal.decision;
    if (!req || !decision) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await decideRoleRequest(token, req.request_id, decision);
      if (res?.status !== "SUCCESS") {
        throw new Error(res?.error || "DECISION_FAILED");
      }
      await refresh();
      closeDecision();
    } catch (e) {
      setError(e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const renderTable = ({ requests, showActions }) => {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Requested By</th>
                <th>Role</th>
                <th>Status</th>
                <th>Requested At</th>
                <th style={{ width: "220px" }}>{showActions ? "Actions" : ""}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="muted">Loading...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No requests</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.request_id}>
                    <td>{req.requested_by || req.user_id}</td>
                    <td>{req.role_name}</td>
                    <td>
                      <span className={statusBadgeClass(req.status)}>{req.status}</span>
                    </td>
                    <td>{formatDateTime(req.created_at || req.created_at_iso)}</td>
                    <td>
                      {showActions ? (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-approve"
                            onClick={() => openDecision(req, "APPROVE")}
                            disabled={actionLoading || req.status !== "PENDING"}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-reject"
                            onClick={() => openDecision(req, "REJECT")}
                            disabled={actionLoading || req.status !== "PENDING"}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Admin</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Review and decide role requests.
          </div>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div style={{ marginTop: "18px" }}>
        <h3 className="section-title">Pending</h3>
        {renderTable({ requests: pendingRequests, showActions: true })}
      </div>

      <div style={{ marginTop: "18px" }}>
        <h3 className="section-title">Approved</h3>
        {renderTable({ requests: approvedRequests, showActions: false })}
      </div>

      <div style={{ marginTop: "18px" }}>
        <h3 className="section-title">Rejected</h3>
        {renderTable({ requests: rejectedRequests, showActions: false })}
      </div>

      <Modal
        open={modal.open}
        title={modal.decision === "APPROVE" ? "Approve Request" : "Reject Request"}
        description={
          modal.request
            ? `${modal.decision === "APPROVE" ? "Approve" : "Reject"} ${modal.request.role_name} for ${modal.request.requested_by || modal.request.user_id}?`
            : ""
        }
        confirmText={modal.decision === "APPROVE" ? "Approve" : "Reject"}
        confirmVariant={modal.decision === "REJECT" ? "danger" : "primary"}
        onConfirm={confirmDecision}
        onClose={closeDecision}
      />
    </div>
  );
}
