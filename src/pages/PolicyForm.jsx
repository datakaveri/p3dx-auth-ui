import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { submitPolicy, getMyDatasetDetails } from "../api/policies";
// import { applications as APPLICATIONS } from "../data/catalogueData";
import { listWorkloads } from "../api/workloads";

const ORGS = [
  { id: "datakaveri", label: "@gmail.com" },
  { id: "city-hospital", label: "@datakaveri.org" },
  { id: "research-lab", label: "@yahoo.com" },
  { id: "university", label: "@university.edu" },
];

// Splits a comma-separated string into a trimmed, non-empty string array.
const toList = value => value.split(",").map(s => s.trim()).filter(Boolean);

// Mirrors InfraPolicyForm.jsx's slugify() exactly — used to derive the
// data-provider's Provider ID from their own identity, the same way infra
// does. No shared utils module exists in src, so this is intentionally
// duplicated across InfraPolicyForm.jsx and p3dx-aaa's server-side ownership
// checks; keep all copies in sync if this changes.
function slugify(s) {
  return String(s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Auto-generated Dataset ID: ds-<YYYYMMDD>-<8-char base36>, via crypto.getRandomValues
// with rejection sampling (avoids modulo bias mapping bytes onto the 36-char alphabet).
// Mirrors generateInfraId() in InfraPolicyForm.jsx; duplicated locally since no shared
// utils module exists in src.
function generateDatasetId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const limit = 256 - (256 % alphabet.length);
  let suffix = "";
  const buf = new Uint8Array(1);
  while (suffix.length < 8) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      suffix += alphabet[buf[0] % alphabet.length];
    }
  }
  return `ds-${datePart}-${suffix}`;
}

// Same section-header icon treatment as InfraPolicyForm.jsx (plain inline
// SVG, one shared stroke style, no icon library) — kept consistent across
// both policy forms so "Dataset" and "Infrastructure" registration read as
// the same product. Duplicated locally rather than imported since neither
// file exports these and no shared utils module exists in src (mirrors the
// slugify()/generateDatasetId() duplication above).
const ICON_PROPS = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" };
function IconDatabase() {
  return (
    <svg {...ICON_PROPS}>
      <ellipse cx="10" cy="5" rx="6" ry="2.2" />
      <path d="M4 5v10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" />
      <path d="M4 10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="5" y="4" width="10" height="13" rx="1.5" />
      <rect x="7.5" y="2.5" width="5" height="3" rx="1" />
      <path d="M7.5 9.5h5M7.5 12.5h5" />
    </svg>
  );
}
function IconUser() {
  return <svg {...ICON_PROPS}><circle cx="10" cy="7" r="3" /><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>;
}

export default function PolicyForm() {
  const { user, isAdmin, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("data-provider");

  const navigate = useNavigate();
  const location = useLocation();
  // Edit mode: present when reached via the "My Datasets" dashboard's Edit
  // button (route services/policies/edit/:itemId). Absent, this is the
  // plain "register new dataset policy" flow, unchanged.
  const { itemId } = useParams();
  const isEditMode = Boolean(itemId);

  const returnTo = location.state?.returnTo || "/app/services/fl";

  const [form, setForm] = useState(() => ({
    // System-generated, read-only. Evaluated once on mount via this lazy
    // initializer. In edit mode, preserve the existing id (from the route)
    // instead of minting a new one — reusing it is what makes resubmission
    // supersede the old entry.
    datasetId: itemId || generateDatasetId(),
    datasetName: "",
    dataUrl: "",
    keyResourcePath: "",
    // application: APPLICATIONS[0].id,
    // Workload ids (gov_layer's KnownWorkloads) the provider picks for this
    // dataset, from the workloads offered for its Purpose. Optional and
    // informational — gov_layer doesn't restrict datasets to them.
    allowedWorkloads: [],
    allowedOrg: ORGS[0].id,
    accessLevel: "read",
    expiresAt: "",
    purpose: "research",
    notes: "",
    // Stable across every registration the same provider ever submits —
    // derived from the logged-in user's identity, not free text, so a
    // provider's multiple dataset entries stay linkable back to them and
    // "My Datasets" can be scoped by ownership (mirrors InfraPolicyForm.jsx).
    providerId: `provider-${slugify(user?.username || user?.email)}`,
    // Prefilled from the logged-in user's own account — still editable, in
    // case the submitting person differs from the provider contact.
    providerEmail: user?.email || "",
    isPrivate: false,
    allowedUsers: "",
    allowedRoles: "",
    requiredRoles: "",
    allowedScopes: "",
    requiredScopes: "",
    allowedActions: "",
  }));

  const [submitted, setSubmitted] = useState(false);

  // The platform's workloads, from gov_layer's catalogue — the same list
  // WorkloadForm.jsx's TEE "Workload" tab picks from.
  const [workloads, setWorkloads] = useState([]);
  const [workloadsError, setWorkloadsError] = useState(null);
  const loadWorkloads = () => {
    if (!token) return;
    listWorkloads(token)
      .then(list => {
        setWorkloads(list);
        setWorkloadsError(null);
      })
      .catch(err => setWorkloadsError(err.message || "Failed to load workloads"));
  };
  useEffect(loadWorkloads, [token]);
  // Workloads offered for the selected purpose (catalogue's `purposes`).
  const purposeWorkloads = workloads.filter(w => (w.purposes || []).includes(form.purpose));
  const [error, setError] = useState(null);

  // Edit mode: fetch the existing entry and seed the form from it. Unlike
  // InfraCat's public detail endpoint, getMyDatasetDetails is provider-scoped
  // (ownership-checked server-side), so it returns every field this form
  // writes — providerId/providerEmail still stay derived from the logged-in
  // user above, never from fetched data, same as InfraPolicyForm.jsx.
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      navigate("/app/admin", { replace: true });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!hasDataProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [hasDataProvider, returnTo]);

  useEffect(() => {
    if (!isEditMode || !token) return;
    let cancelled = false;

    getMyDatasetDetails(token, itemId)
      .then(res => {
        if (cancelled) return;
        const rules = res?.data?.rules;
        if (res?.status !== "SUCCESS" || !rules) {
          throw new Error(res?.error || "Dataset entry not found");
        }
        setForm(f => ({
          ...f,
          datasetName: rules.dataset?.name || "",
          dataUrl: res.data.data_url || "",
          keyResourcePath: rules.key_resource_path || "",
          // application: rules.application?.id || f.application,
          allowedWorkloads: (rules.allowed_workloads || []).map(w => (typeof w === "string" ? w : w?.id)).filter(Boolean),
          allowedOrg: rules.allowedOrg?.id || f.allowedOrg,
          accessLevel: rules.accessLevel || f.accessLevel,
          purpose: rules.purpose || f.purpose,
          notes: rules.notes || "",
          isPrivate: Boolean(res.data.is_private),
          allowedUsers: (rules.allowed_users || []).join(", "),
          allowedRoles: (rules.allowed_roles || []).join(", "),
          requiredRoles: (rules.required_roles || []).join(", "),
          allowedScopes: (rules.allowed_scopes || []).join(", "),
          requiredScopes: (rules.required_scopes || []).join(", "),
          allowedActions: (rules.allowed_actions || []).join(", "),
          expiresAt: res.data.expiresAt ? String(res.data.expiresAt).slice(0, 10) : "",
        }));
      })
      .catch(err => {
        if (!cancelled) setLoadError(err?.message || String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEditMode, itemId, token]);

  const onSubmit = async e => {
    e.preventDefault();
    setError(null);
    // (Workload field removed — datasets aren't restricted to a workload.)
    // if (form.allowedWorkloads.length === 0) {
    //   setError("Select the workload this dataset may be used for.");
    //   return;
    // }
    setSubmitted(true);

    // const application = APPLICATIONS.find(a => a.id === form.application);
    const org = ORGS.find(o => o.id === form.allowedOrg);

    const payload = {
      policyId: `policy-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      itemId: form.datasetId,
      issuedBy: user?.username || user?.email || "unknown",
      dataset_id: form.datasetId,
      provider_id: form.providerId,
      provider_email: form.providerEmail,
      is_private: form.isPrivate,
      data_url: form.dataUrl,
      rules: {
        // Marks this as a dataset access policy — required by the backend's
        // POST /policy role gate (data-provider role) and by the "My
        // Datasets" provider-scoped list/ownership check, mirroring
        // InfraPolicyForm.jsx's rules.policy_type: "infra-provider".
        policy_type: "data-provider",
        dataset: {
          id: form.datasetId,
          name: form.datasetName,
        },
        // application: {
        //   id: form.application,
        //   name: application?.name,
        // },
        // allowed_workloads: form.allowedWorkloads.map(id => ({
        //   id,
        //   name: workloads.find(w => w.id === id)?.name || id,
        // })),
        // Only the picked workloads that belong to the chosen purpose.
        allowed_workloads: form.allowedWorkloads
          .filter(id => purposeWorkloads.some(w => w.id === id))
          .map(id => ({
            id,
            name: workloads.find(w => w.id === id)?.name || id,
          })),
        allowedOrg: {
          id: form.allowedOrg,
          emailDomain: org?.label,
        },
        // accessLevel: form.accessLevel, // Access level removed from the form
        purpose: form.purpose,
        notes: form.notes,
        // KBS key path for this dataset's decryption key — copied into the
        // contract's data_providers[].trustee.key_resource_path (the KBS URL
        // itself is gov_layer-wide). Blank lets gov_layer derive one.
        key_resource_path: form.keyResourcePath.trim(),
        allowed_users: toList(form.allowedUsers),
        allowed_roles: toList(form.allowedRoles),
        required_roles: toList(form.requiredRoles),
        allowed_scopes: toList(form.allowedScopes),
        required_scopes: toList(form.requiredScopes),
        allowed_actions: toList(form.allowedActions),
      },
      ...(form.expiresAt
        ? { expiresAt: new Date(`${form.expiresAt}T00:00:00.000Z`).toISOString() }
        : {}),
    };

    try {
      await submitPolicy(token, payload);
      window.setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, 1800);
    } catch (err) {
      setSubmitted(false);
      setError(err?.message || String(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            {isEditMode ? "Edit Policy" : "Upload Dataset"}
          </h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            {isEditMode
              ? "Update your dataset access policy in APD."
              : "Submit a dataset access policy to APD so TOP can validate workload contracts."}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" style={{ width: "auto" }} type="button" disabled={submitted} onClick={() => navigate(returnTo)}>
            Back
          </button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {loadError ? <div className="error-message">{loadError}</div> : null}
      {submitted ? (
        <div className="info-banner">
          {isEditMode
            ? "Policy updated successfully. Redirecting..."
            : "Policy stored in APD successfully. Redirecting..."}
        </div>
      ) : null}

      {loadingRecord ? (
        <div className="card">Loading dataset details...</div>
      ) : loadError ? null : (
      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconDatabase /></div>
              <div className="form-section-titles">
                <h4>Dataset</h4>
                <span>Identity for this registration</span>
              </div>
            </div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Dataset ID</label>
                <input
                  className="input"
                  readOnly
                  disabled
                  value={form.datasetId}
                />
                <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                  Auto-generated
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Dataset name</label>
                <input
                  className="input"
                  placeholder="e.g. My Research Dataset"
                  value={form.datasetName}
                  onChange={e => setForm(f => ({ ...f, datasetName: e.target.value }))}
                  disabled={submitted}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Data URL</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. https://storage.example.com/dataset.csv"
                  value={form.dataUrl}
                  onChange={e => setForm(f => ({ ...f, dataUrl: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Key Resource Path</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. default/mnist-key/dataset1"
                  value={form.keyResourcePath}
                  onChange={e => setForm(f => ({ ...f, keyResourcePath: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconClipboard /></div>
              <div className="form-section-titles">
                <h4>Access Policy</h4>
                {/* <span>Workloads, audience &amp; permitted use</span> */}
                <span>Audience &amp; permitted use</span>
              </div>
            </div>

            {/* <div className="form-group">
              <label>Application (Model)</label>
              <select
                className="select"
                value={form.application}
                onChange={e => setForm(f => ({ ...f, application: e.target.value }))}
                disabled={submitted}
              >
                {APPLICATIONS.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div> */}

            {/* Workload field removed: a dataset may be used with any workload.
            <div className="form-group">
              <label>Workload *</label>
              {workloadsError ? (
                <div className="error-message" style={{ fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>{workloadsError}</span>
                  <button type="button" className="btn btn-secondary" style={{ width: "auto" }} onClick={loadWorkloads}>
                    Retry
                  </button>
                </div>
              ) : (
                <select
                  className="select"
                  value={form.allowedWorkloads[0] || ""}
                  onChange={e => setForm(f => ({ ...f, allowedWorkloads: e.target.value ? [e.target.value] : [] }))}
                  disabled={submitted}
                  required
                >
                  <option value="" disabled>{workloads.length === 0 ? "Loading workloads..." : "Select a workload"}</option>
                  {workloads.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.cpu} CPU, {w.memory})
                    </option>
                  ))}
                </select>
              )}
            </div> */}

            <div className="form-group">
              <label>Allowed organisation (by email domain)</label>
              <select
                className="select"
                value={form.allowedOrg}
                onChange={e => setForm(f => ({ ...f, allowedOrg: e.target.value }))}
                disabled={submitted}
              >
                {ORGS.map(o => (
                  <option key={o.id} value={o.id}>
                    Users with emails ending {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid" style={{ marginTop: "12px" }}>
              {/* Access level removed.
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Access level</label>
                <select
                  className="select"
                  value={form.accessLevel}
                  onChange={e => setForm(f => ({ ...f, accessLevel: e.target.value }))}
                  disabled={submitted}
                >
                  <option value="read">Read</option>
                  <option value="read-write">Read + Write</option>
                  <option value="aggregate">Aggregate only</option>
                </select>
              </div> */}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Expires on (optional)</label>
                <input
                  className="input"
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "12px", marginBottom: 0 }}>
              <label>Purpose</label>
              <select
                className="select"
                value={form.purpose}
                // onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                onChange={e => {
                  const purpose = e.target.value;
                  // Drop picked workloads the new purpose doesn't offer.
                  const offered = workloads.filter(w => (w.purposes || []).includes(purpose)).map(w => w.id);
                  setForm(f => ({ ...f, purpose, allowedWorkloads: f.allowedWorkloads.filter(id => offered.includes(id)) }));
                }}
                disabled={submitted}
              >
                <option value="research">Research</option>
                <option value="clinical">Clinical</option>
                <option value="benchmarking">Benchmarking</option>
                <option value="internal">Internal testing</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: "12px", marginBottom: 0 }}>
              <label>Workloads for this purpose</label>
              {workloadsError ? (
                <div className="error-message" style={{ fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>{workloadsError}</span>
                  <button type="button" className="btn btn-secondary" style={{ width: "auto" }} onClick={loadWorkloads}>
                    Retry
                  </button>
                </div>
              ) : workloads.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-light)" }}>Loading workloads...</div>
              ) : purposeWorkloads.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-light)" }}>No workloads are offered for this purpose.</div>
              ) : (
                purposeWorkloads.map(w => (
                  <label key={w.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "normal" }}>
                    <input
                      type="checkbox"
                      checked={form.allowedWorkloads.includes(w.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        allowedWorkloads: e.target.checked
                          ? [...f.allowedWorkloads, w.id]
                          : f.allowedWorkloads.filter(id => id !== w.id),
                      }))}
                      disabled={submitted}
                    />
                    {w.name} ({w.cpu} CPU, {w.memory})
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconUser /></div>
              <div className="form-section-titles">
                <h4>Provider</h4>
                <span>Contact for this dataset</span>
              </div>
            </div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Provider ID</label>
                <input
                  className="input"
                  readOnly
                  disabled
                  value={form.providerId}
                />
                <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                  Auto-generated
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Provider Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.providerEmail}
                  onChange={e => setForm(f => ({ ...f, providerEmail: e.target.value }))}
                  placeholder="provider@example.com"
                  disabled={submitted}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <button
              className="btn btn-secondary"
              style={{ width: "auto" }}
              type="button"
              disabled={submitted}
              onClick={() => navigate(returnTo)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" style={{ width: "auto" }} type="submit" disabled={submitted}>
              {submitted
                ? (isEditMode ? "Updating..." : "Uploading...")
                : (isEditMode ? "Update Policy" : "Upload Dataset")}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
