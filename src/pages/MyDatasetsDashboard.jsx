import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { deleteDatasetPolicy, listMyDatasetContracts, listMyDatasetPolicies } from "../api/policies";
import ManageTabs from "../components/ManageTabs";
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

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, item: null });
  // Contracts per dataset item_id, for the row hover popover. Loaded
  // separately so a failure here never blocks the dataset table itself.
  const [contractsByDataset, setContractsByDataset] = useState({});
  const [contractsError, setContractsError] = useState(null);
  // { item, top, left } of the hovered row; the popover is position: fixed
  // since .table-wrap's overflow-x would clip an absolutely placed one.
  const [hover, setHover] = useState(null);
  // Edit / Delete column — hidden until the header's "Actions" button
  // reveals it for every dataset at once.
  const [showActions, setShowActions] = useState(false);

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
    try {
      const res = await listMyDatasetContracts(token);
      setContractsByDataset(res?.data && typeof res.data === "object" ? res.data : {});
      setContractsError(null);
    } catch (e) {
      setContractsError(e?.message || "Failed to load contracts");
    }
  };

  const showContracts = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({ item, top: rect.bottom + 6, left: rect.left + 16 });
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
      <ManageTabs returnTo={returnTo} />
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
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            onClick={() => setShowActions(v => !v)}
          >
            {showActions ? "Hide Actions" : "Actions"}
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
                <th>Contracts</th>
                <th>Issued</th>
                {showActions ? <th style={{ width: "180px" }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="muted">Loading...</td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="muted">No datasets registered yet</td>
                </tr>
              ) : (
                datasets.map(item => (
                  <tr
                    key={item.item_id}
                    onMouseEnter={e => showContracts(e, item)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <td>{item.item_id}</td>
                    <td>{item.name}</td>
                    <td>
                      {(contractsByDataset[item.item_id] || []).length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {contractsByDataset[item.item_id].map(c => (
                            <code key={c.job_id} style={{ fontSize: "12px" }}>
                              {c.contract_id}
                            </code>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(item.issued_at)}</td>
                    {showActions ? (
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
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hover ? (
        <div className="dataset-contracts-popover" style={{ top: hover.top, left: hover.left }}>
          <div className="dataset-contracts-popover-title">
            Contracts using {hover.item.name || hover.item.item_id}
          </div>
          {contractsError ? (
            <div className="muted">Couldn't load contracts: {contractsError}</div>
          ) : (contractsByDataset[hover.item.item_id] || []).length === 0 ? (
            <div className="muted">Not used in any contracts</div>
          ) : (
            <ul>
              {contractsByDataset[hover.item.item_id].map(c => (
                <li key={c.job_id}>
                  <code>{c.contract_id}</code>
                  <span>
                    {(c.technique || "—").toUpperCase()} · {c.job_state} · you: {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

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
