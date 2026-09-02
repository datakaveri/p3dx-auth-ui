import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { deleteInfraPolicy, listMyInfraPolicies } from "../api/policies";
import Modal from "../components/Modal";

const PLATFORM_LABELS = { azure: "Azure", gcp: "GCP", aws: "AWS" };

// Minimal "My Infrastructure" dashboard (Infra_Form_Changes.md item #8,
// the non-deferred slice): list the infra-provider's own registrations,
// Edit (→ InfraPolicyForm in edit mode) and Delete (soft delete, confirmed).
// No search/filter/sort/pagination — deliberately out of scope.
export default function MyInfraDashboard() {
  const { user, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasInfraProvider = roles.includes("infra-provider");

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/app/services/smpc";

  const [infra, setInfra] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, item: null });

  useEffect(() => {
    if (!hasInfraProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [hasInfraProvider, returnTo]);

  const formatDate = value => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  };

  const refresh = async () => {
    if (!token || !hasInfraProvider) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listMyInfraPolicies(token);
      setInfra(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || "Failed to load your infrastructure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token, hasInfraProvider]);

  const openDelete = item => setModal({ open: true, item });
  const closeDelete = () => setModal({ open: false, item: null });

  const confirmDelete = async () => {
    const item = modal.item;
    // Modal's own confirm button has no built-in disabled state, so guard
    // here too — prevents a double-click firing two delete requests.
    if (!item || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      await deleteInfraPolicy(token, item.item_id);
      closeDelete();
      await refresh();
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>My Infrastructure</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Infrastructure you've registered for SMPC workloads.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => navigate(returnTo)}
          >
            Back
          </button>
          <button
            className="btn btn-primary"
            style={{ width: "auto" }}
            type="button"
            onClick={() =>
              navigate("/app/services/infra-policy", {
                state: { returnTo: location.pathname },
              })
            }
          >
            Register New
          </button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Infrastructure ID</th>
                <th>Name</th>
                <th>Region</th>
                <th>Cloud Provider</th>
                <th>Issued</th>
                <th style={{ width: "180px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted">Loading...</td>
                </tr>
              ) : infra.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">No infrastructure registered yet</td>
                </tr>
              ) : (
                infra.map(item => (
                  <tr key={item.item_id}>
                    <td>{item.item_id}</td>
                    <td>{item.name}</td>
                    <td>{item.region}</td>
                    <td>{PLATFORM_LABELS[item.provider] || item.provider}</td>
                    <td>{formatDate(item.issued_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ width: "auto" }}
                          disabled={actionLoading}
                          onClick={() =>
                            navigate(`/app/services/infra-policy/edit/${encodeURIComponent(item.item_id)}`, {
                              state: { returnTo: location.pathname },
                            })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-reject"
                          disabled={actionLoading}
                          onClick={() => openDelete(item)}
                        >
                          Delete
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

      <Modal
        open={modal.open}
        title="Delete Infrastructure"
        description={modal.item ? `Delete "${modal.item.name || modal.item.item_id}"? This can't be undone from here.` : ""}
        confirmText={actionLoading ? "Deleting..." : "Delete"}
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onClose={closeDelete}
      />
    </div>
  );
}
