import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { listMyDatasetContracts, listMyDatasetPolicies } from "../api/policies";

// How often the page re-fetches while open, so the stats stay live.
const REFRESH_MS = 5000;

// What a consent request's row says now: its latest event (gov_layer
// contract_events) wins; otherwise the provider's participant status.
// tone picks the badge colour: ok / wait / bad / live / neutral.
function activityStatus(r) {
  switch (r.last_event?.event) {
    case "run_refused":
      return { label: "Run refused", tone: "bad" };
    case "edited":
      return { label: "Edited after signing", tone: "bad" };
    case "run_failed":
      return { label: "Run failed to start", tone: "wait" };
    case "run_started":
      return { label: "Running (live)", tone: "live" };
    default:
      break;
  }
  switch (r.status) {
    case "requested":
      return { label: "Awaiting your signature", tone: "wait" };
    case "approved":
      return { label: "Approved", tone: "ok" };
    case "signed":
      return { label: "Signed", tone: "ok" };
    case "final":
      return { label: "Final", tone: "ok" };
    case "tee_enabled":
      return { label: "Running (live)", tone: "live" };
    case "rejected":
      return { label: "Rejected", tone: "bad" };
    case "withdrawn":
      return { label: "Consent withdrawn", tone: "bad" };
    default:
      return { label: r.status || "—", tone: "neutral" };
  }
}

function timeAgo(value, now) {
  if (!value) return "—";
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return "—";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return t.toLocaleString();
}

// Participant statuses (gov_layer job_participants), in lifecycle order —
// the order the per-dataset breakdown lists them in.
const STATUSES = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "signed", label: "Signed" },
  { key: "final", label: "Final" },
  { key: "tee_enabled", label: "TEE enabled" },
  { key: "rejected", label: "Rejected" },
];

// "Audit" page — sidebar link right under Manage. For a data provider: which
// of their datasets are used in contracts, and usage stats
// derived in the browser from GET /policy/mine-datasets (their datasets) and
// GET /jobs/mine-datasets (contracts per dataset — TEE/SMPC only, FL roster
// contracts aren't recorded per dataset). Re-fetched every REFRESH_MS. A
// dataset is "live" (green) while a contract using it has its TEE run
// switched on (job_state tee_enabled).
export default function MyAuditDashboard() {
  const { user, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");
  const isProvider = hasDataProvider || roles.includes("infra-provider");

  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/app/services";

  const [datasets, setDatasets] = useState([]);
  const [contractsByDataset, setContractsByDataset] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  // "" = all datasets; otherwise the item_id the tiles are narrowed to.
  const [filter, setFilter] = useState("");
  // Activity row whose event timeline is open ("<job_id>:<item_id>").
  const [openRow, setOpenRow] = useState(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [isProvider, returnTo]);

  const refresh = async () => {
    if (!token || !hasDataProvider || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      const [ds, cs] = await Promise.all([listMyDatasetPolicies(token), listMyDatasetContracts(token)]);
      setDatasets(Array.isArray(ds?.data) ? ds.data : []);
      setContractsByDataset(cs?.data && typeof cs.data === "object" ? cs.data : {});
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e?.message || "Failed to load dataset usage");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !hasDataProvider) {
      setLoading(false);
      return;
    }
    refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    // Catch up at once when the tab comes back into view.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [token, hasDataProvider]);

  const nameOf = useMemo(() => {
    const names = {};
    for (const d of datasets) names[d.item_id] = d.name;
    return names;
  }, [datasets]);

  // One row per (contract, dataset), newest first — the source every stat
  // below is counted from.
  const rows = useMemo(() => {
    const out = [];
    for (const [itemId, list] of Object.entries(contractsByDataset)) {
      for (const c of list || []) out.push({ ...c, item_id: itemId });
    }
    return out.sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    );
  }, [contractsByDataset]);

  const filteredRows = useMemo(
    () => (filter ? rows.filter(r => r.item_id === filter) : rows),
    [rows, filter]
  );

  const stats = useMemo(() => {
    const count = status => filteredRows.filter(r => r.status === status).length;
    return {
      inUse: new Set(rows.map(r => r.item_id)).size,
      contracts: filteredRows.length,
      signedOrFinal: filteredRows.filter(r => ["signed", "final", "tee_enabled"].includes(r.status)).length,
      awaiting: count("requested"),
      tee: count("tee_enabled"),
      // Datasets with a contract whose TEE run is switched on (job_state
      // tee_enabled) — "live". Not narrowed by the filter, like inUse.
      live: new Set(rows.filter(r => r.job_state === "tee_enabled").map(r => r.item_id)).size,
    };
  }, [rows, filteredRows]);

  // Per-dataset usage, most-used first.
  const usage = useMemo(() => {
    const byItem = {};
    for (const r of rows) {
      const u = (byItem[r.item_id] ||= { item_id: r.item_id, total: 0, statuses: {}, techniques: new Set(), last: null, live: false });
      u.total += 1;
      u.statuses[r.status] = (u.statuses[r.status] || 0) + 1;
      if (r.technique) u.techniques.add(r.technique.toUpperCase());
      if (r.job_state === "tee_enabled") u.live = true;
      const at = r.created_at ? new Date(r.created_at) : null;
      if (at && (!u.last || at > u.last)) u.last = at;
    }
    return Object.values(byItem).sort((a, b) => b.total - a.total);
  }, [rows]);

  if (!isProvider) return null;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Audit</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Where your datasets are used, by which consent requests, and what is happening to them.
          </div>
          {updatedAt ? (
            <div style={{ marginTop: "6px" }}>
              <span className="live-badge">
                <span className="live-dot" /> Live · updated {updatedAt.toLocaleTimeString()}
              </span>
            </div>
          ) : null}
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
          {hasDataProvider ? (
            <button className="btn btn-primary" style={{ width: "auto" }} type="button" onClick={refresh}>
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {!hasDataProvider ? (
        <div className="card">
          <div className="muted">Dataset usage applies to data providers only.</div>
        </div>
      ) : (
        <>
          {error ? <div className="error-message">{error}</div> : null}

          <div className="form-group" style={{ maxWidth: "320px" }}>
            <label>Dataset</label>
            <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All datasets</option>
              {datasets.map(d => (
                <option key={d.item_id} value={d.item_id}>
                  {d.name || d.item_id}
                </option>
              ))}
            </select>
          </div>

          <div className="stat-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div className="stat-card">
              <div className="stat-card__label">Datasets in use</div>
              <div className="stat-card__value stat-card__value--blue">
                {loading ? "—" : `${stats.inUse} of ${datasets.length}`}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Contracts</div>
              <div className="stat-card__value">{loading ? "—" : stats.contracts}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Signed / final</div>
              <div className="stat-card__value stat-card__value--green">{loading ? "—" : stats.signedOrFinal}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Awaiting you</div>
              <div className="stat-card__value stat-card__value--amber">{loading ? "—" : stats.awaiting}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Live now</div>
              <div className="stat-card__value stat-card__value--green">{loading ? "—" : stats.live}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">TEE runs enabled</div>
              <div className="stat-card__value">{loading ? "—" : stats.tee}</div>
            </div>
          </div>

          <h4 className="section-title" style={{ fontSize: "16px" }}>Activity</h4>
          <div className="card" style={{ padding: 0, marginBottom: "24px" }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Consent request</th>
                    <th>Consumer</th>
                    <th>Status</th>
                    <th>What's happening</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="muted">Loading...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">No consent requests use your datasets yet</td>
                    </tr>
                  ) : (
                    filteredRows.flatMap(r => {
                      const st = activityStatus(r);
                      const key = `${r.job_id}:${r.item_id}`;
                      const isOpen = openRow === key;
                      const rowClass = [
                        "audit-row--clickable",
                        st.tone === "live" ? "audit-row--live" : st.tone === "bad" ? "audit-row--bad" : "",
                      ].join(" ");
                      const out = [
                        <tr key={key} className={rowClass} onClick={() => setOpenRow(isOpen ? null : key)} title="Show timeline">
                          <td>{nameOf[r.item_id] || r.item_id}</td>
                          <td>
                            <code style={{ fontSize: "12px" }}>{(r.contract_id || "").slice(0, 8)}…</code>
                            {r.technique ? <div className="muted" style={{ fontSize: "12px" }}>{r.technique.toUpperCase()}</div> : null}
                          </td>
                          <td>{r.consumer || "—"}</td>
                          <td>
                            {st.tone === "live" ? (
                              <span className="live-badge"><span className="live-dot" /> {st.label}</span>
                            ) : (
                              <span className={`table-badge table-badge--${st.tone}`}>{st.label}</span>
                            )}
                          </td>
                          <td style={{ maxWidth: "420px" }}>{r.last_event?.detail || "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{timeAgo(r.updated_at || r.created_at, updatedAt || new Date())}</td>
                        </tr>,
                      ];
                      if (isOpen) {
                        out.push(
                          <tr key={`${key}:timeline`}>
                            <td colSpan={6}>
                              {r.events?.length ? (
                                <ol className="audit-timeline">
                                  {[...r.events].reverse().map((e, i) => (
                                    <li key={i}>
                                      <time>{new Date(e.at).toLocaleString()}</time>
                                      <span>{e.detail}{e.actor ? ` — ${e.actor}` : ""}</span>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <span className="muted">No recorded events yet (only activity after this update is tracked).</span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                      return out;
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <h4 className="section-title" style={{ fontSize: "16px" }}>Usage by dataset</h4>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Times used</th>
                    <th>By status</th>
                    <th>Techniques</th>
                    <th>Last used</th>
                    <th>Live</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="muted">Loading...</td>
                    </tr>
                  ) : usage.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">None of your datasets are used in a contract yet</td>
                    </tr>
                  ) : (
                    usage.map(u => {
                      return (
                        <tr key={u.item_id} className={u.live ? "audit-row--live" : undefined}>
                          <td>
                            <div>{nameOf[u.item_id] || "—"}</div>
                            <code style={{ fontSize: "12px" }}>{u.item_id}</code>
                          </td>
                          <td>
                            <span className="table-badge table-badge--neutral" style={{ fontSize: "13px" }}>
                              {u.total} {u.total === 1 ? "time" : "times"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {STATUSES.filter(s => u.statuses[s.key]).map(s => (
                                <span key={s.key} className="table-badge table-badge--neutral">
                                  {s.label}: {u.statuses[s.key]}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{[...u.techniques].join(", ") || "—"}</td>
                          <td>{u.last ? u.last.toLocaleString() : "—"}</td>
                          <td>
                            {u.live ? (
                              <span className="live-badge">
                                <span className="live-dot" /> Live
                              </span>
                            ) : (
                              <span className="live-badge live-badge--idle">Idle</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
