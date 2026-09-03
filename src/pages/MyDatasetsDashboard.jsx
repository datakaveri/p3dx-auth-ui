import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { deleteDatasetPolicy, listMyDatasetPolicies } from "../api/policies";
import Modal from "../components/Modal";

// "My Datasets" dashboard — the data-provider counterpart to
// MyInfraDashboard.jsx, same shape: list the data-provider's own dataset
// access policies, Edit (-> PolicyForm in edit mode) and Delete (soft
// delete, confirmed). No search/filter/sort/pagination — deliberately out
// of scope, mirroring the infra dashboard.
export default function MyDatasetsDashboard() {
  const { user, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");
  // A user holding both provider roles gets a tab switcher to "My
  // Infrastructure" below (see the Manage nav edge case) — single-role
  // users see none of it.
  const hasInfraProvider = roles.includes("infra-provider");

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, item: null });

  useEffect(() => {
    if (!hasDataProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [hasDataProvider, returnTo]);

  const formatDate = value => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  };

  const refresh = async () => {
    if (!token || !hasDataProvider) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listMyDatasetPolicies(token);
      setDatasets(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e?.message || "Failed to load your datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token, hasDataProvider]);

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
      await deleteDatasetPolicy(token, item.item_id);
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
      {hasInfraProvider && hasDataProvider ? (
        <div className="cat-tabs" style={{ marginBottom: "16px" }}>
          <button type="button" className="cat-tab cat-tab--active">
            Datasets
          </button>
          <button
            type="button"
            className="cat-tab"
            onClick={() => navigate("/app/services/infra-policy/my", { state: { returnTo } })}
          >
            Infrastructure
          </button>
        </div>
      ) : null}
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>My Datasets</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Dataset access policies you've registered.
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
              navigate("/app/services/policies", {
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
                <th>Dataset ID</th>
                <th>Name</th>
                <th>Application</th>
                <th>Access Level</th>
                <th>Issued</th>
                <th style={{ width: "180px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="muted">Loading...</td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">No datasets registered yet</td>
                </tr>
              ) : (
                datasets.map(item => (
                  <tr key={item.item_id}>
                    <td>{item.item_id}</td>
                    <td>{item.name}</td>
                    <td>{item.application}</td>
                    <td>{item.access_level}</td>
                    <td>{formatDate(item.issued_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ width: "auto" }}
                          disabled={actionLoading}
                          onClick={() =>
                            navigate(`/app/services/policies/edit/${encodeURIComponent(item.item_id)}`, {
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
        title="Delete Dataset"
        description={modal.item ? `Delete "${modal.item.name || modal.item.item_id}"? This can't be undone from here.` : ""}
        confirmText={actionLoading ? "Deleting..." : "Delete"}
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onClose={closeDelete}
      />
    </div>
  );
}
