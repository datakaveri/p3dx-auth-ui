import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { submitPolicy, getMyDatasetDetails } from "../api/policies";
import { applications as APPLICATIONS } from "../data/catalogueData";

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
function IconLock() {
  return <svg {...ICON_PROPS}><rect x="5" y="9" width="10" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>;
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
    application: APPLICATIONS[0].id,
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
          application: rules.application?.id || f.application,
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
    setSubmitted(true);

    const application = APPLICATIONS.find(a => a.id === form.application);
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
        application: {
          id: form.application,
          name: application?.name,
        },
        allowedOrg: {
          id: form.allowedOrg,
          emailDomain: org?.label,
        },
        accessLevel: form.accessLevel,
        purpose: form.purpose,
        notes: form.notes,
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
            {isEditMode ? "Edit Policy" : "Set Policy"}
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
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconClipboard /></div>
              <div className="form-section-titles">
                <h4>Access Policy</h4>
                <span>Application, audience &amp; permitted use</span>
              </div>
            </div>

            <div className="form-group">
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
            </div>

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
              </div>

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
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                disabled={submitted}
              >
                <option value="research">Research</option>
                <option value="clinical">Clinical</option>
                <option value="benchmarking">Benchmarking</option>
                <option value="internal">Internal testing</option>
              </select>
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

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconLock /></div>
              <div className="form-section-titles">
                <h4>Access Rules</h4>
                <span>Fine-grained constraints &amp; notes</span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))}
                  disabled={submitted}
                />
                Private dataset
              </label>
            </div>

            <div className="form-group">
              <label>Allowed Users (comma-separated)</label>
              <input
                className="input"
                type="text"
                value={form.allowedUsers}
                onChange={e => setForm(f => ({ ...f, allowedUsers: e.target.value }))}
                placeholder="e.g. alice, bob"
                disabled={submitted}
              />
            </div>

            <div className="grid">
              <div className="form-group">
                <label>Allowed Roles (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.allowedRoles}
                  onChange={e => setForm(f => ({ ...f, allowedRoles: e.target.value }))}
                  placeholder="e.g. data-provider, admin"
                  disabled={submitted}
                />
              </div>

              <div className="form-group">
                <label>Required Roles (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.requiredRoles}
                  onChange={e => setForm(f => ({ ...f, requiredRoles: e.target.value }))}
                  placeholder="e.g. output-owner"
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="grid">
              <div className="form-group">
                <label>Allowed Scopes (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.allowedScopes}
                  onChange={e => setForm(f => ({ ...f, allowedScopes: e.target.value }))}
                  placeholder="e.g. read, compute"
                  disabled={submitted}
                />
              </div>

              <div className="form-group">
                <label>Required Scopes (comma-separated)</label>
                <input
                  className="input"
                  type="text"
                  value={form.requiredScopes}
                  onChange={e => setForm(f => ({ ...f, requiredScopes: e.target.value }))}
                  placeholder="e.g. openid"
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Allowed Actions (comma-separated)</label>
              <input
                className="input"
                type="text"
                value={form.allowedActions}
                onChange={e => setForm(f => ({ ...f, allowedActions: e.target.value }))}
                placeholder="e.g. compute, aggregate"
                disabled={submitted}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Notes</label>
              <textarea
                className="input"
                style={{ minHeight: "96px" }}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional constraints..."
                disabled={submitted}
              />
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
                ? (isEditMode ? "Updating..." : "Setting...")
                : (isEditMode ? "Update Policy" : "Set Policy")}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
