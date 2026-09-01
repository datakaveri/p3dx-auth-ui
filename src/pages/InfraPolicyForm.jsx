import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { submitPolicy } from "../api/policies";

const PLATFORM_PROVIDERS = [
  { id: "azure", label: "Azure" },
  { id: "gcp", label: "GCP" },
  { id: "aws", label: "AWS" },
];

// Infrastructure Policy — the SMPC-only counterpart to the dataset access
// policy in PolicyForm.jsx. It rides the exact same generic POST /p3dx/policy
// -> APD /api/v1/policy pipeline (no backend schema change): everything
// technique-specific lives inside rules, keyed by rules.policy_type so the
// backend can tell an infra policy apart from a dataset-access policy and
// gate each on the right role (see p3dx.routes.js POST /policy).
export default function InfraPolicyForm() {
  const { user, isAdmin, token } = useOutletContext();
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasInfraProvider = roles.includes("infra-provider");

  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/app/services/smpc";

  const [form, setForm] = useState({
    infraId: "",
    name: "",
    region: "",
    providerId: "",
    providerEmail: "",

    platformProvider: PLATFORM_PROVIDERS[0].id,
    executionEnvironment: "sgx",

    cpuCores: 64,
    ramMb: 262144,
    storageGb: 2048,
    nodeCount: 8,
    sgxNodeCount: 8,
    maxConcurrentJobs: 4,

    attestationRequired: true,
    attestationService: "",
    attestationPolicyId: "",

    loadBalancerEndpoint: "",
    clusterEndpoint: "",
    sshHost: "",
    sshPort: 22,

    allowRemoteProvisioning: true,
    allowEphemeralExecution: true,

    validUntil: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      navigate("/app/admin", { replace: true });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!hasInfraProvider) {
      navigate(returnTo, { replace: true });
    }
  }, [hasInfraProvider, returnTo]);

  const onSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);

    const payload = {
      policyId: `policy-infra-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      itemId: form.infraId,
      issuedBy: user?.username || user?.email || "unknown",
      provider_id: form.providerId,
      provider_email: form.providerEmail,
      rules: {
        // Marks this as an Infrastructure Policy — required by the backend's
        // POST /policy role gate (infra-provider role, never data-provider).
        policy_type: "infra-provider",
        infrastructure: {
          id: form.infraId,
          name: form.name,
          region: form.region,
          platform: {
            provider: form.platformProvider,
            // Fixed for now — Phase 1 assumes a cloud-native k8s deployment
            // (see the workflow doc); bare-metal (Phase 3) isn't modeled yet.
            deployment_model: "kubernetes",
            execution_environment: form.executionEnvironment,
          },
          capacity: {
            cpu_cores: Number(form.cpuCores) || 0,
            ram_mb: Number(form.ramMb) || 0,
            storage_gb: Number(form.storageGb) || 0,
            node_count: Number(form.nodeCount) || 0,
            sgx_node_count: Number(form.sgxNodeCount) || 0,
            max_concurrent_jobs: Number(form.maxConcurrentJobs) || 0,
          },
          attestation: {
            required: form.attestationRequired,
            service: form.attestationService,
            policy_id: form.attestationPolicyId,
          },
          connectivity: {
            load_balancer_endpoint: form.loadBalancerEndpoint,
            cluster_endpoint: form.clusterEndpoint,
            ssh_host: form.sshHost,
            ssh_port: Number(form.sshPort) || 22,
          },
          // tls (self-signed vs CA) is intentionally left out — still an open
          // decision, not modeled here yet. Safe to add later: rules is
          // freeform JSON, so this is a non-breaking addition when ready.
        },
        // This policy type only ever covers SMPC — not user-editable.
        allowed_techniques: ["SMPC"],
        // Real Keycloak role names (not the workflow doc's "consumer" —
        // that's just the plain "user" role on this platform). Not enforced
        // anywhere yet; becomes meaningful once the infra catalogue (InfraCat)
        // exists to actually read it.
        allowed_roles: ["user", "application-provider"],
        allowed_actions: ["provision", "execute", "terminate"],
        allow_remote_provisioning: form.allowRemoteProvisioning,
        allow_ephemeral_execution: form.allowEphemeralExecution,
        restricted_to: [],
      },
      ...(form.validUntil
        ? { expiresAt: new Date(`${form.validUntil}T00:00:00.000Z`).toISOString() }
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
          <h3 className="section-title" style={{ marginBottom: 0 }}>Set Infrastructure Policy</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Register your infrastructure's capacity, attestation, and access rules for SMPC workloads.
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-secondary"
            style={{ width: "auto" }}
            type="button"
            disabled={submitted}
            onClick={() => navigate(returnTo)}
          >
            Back
          </button>
        </div>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {submitted ? <div className="info-banner">Infrastructure policy stored in APD successfully. Redirecting...</div> : null}

      <div className="card">
        <form onSubmit={onSubmit}>
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>Infrastructure</div>
          <div className="grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Infrastructure ID</label>
              <input
                className="input"
                placeholder="e.g. infra-001"
                value={form.infraId}
                onChange={e => setForm(f => ({ ...f, infraId: e.target.value }))}
                disabled={submitted}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Name</label>
              <input
                className="input"
                placeholder="e.g. Azure SGX Cluster"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={submitted}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Region</label>
              <input
                className="input"
                placeholder="e.g. centralindia"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                disabled={submitted}
                required
              />
            </div>
          </div>

          <div className="grid" style={{ marginTop: "12px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Provider ID</label>
              <input
                className="input"
                placeholder="e.g. infra-provider-001"
                value={form.providerId}
                onChange={e => setForm(f => ({ ...f, providerId: e.target.value }))}
                disabled={submitted}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Provider Email</label>
              <input
                className="input"
                type="email"
                placeholder="provider@example.com"
                value={form.providerEmail}
                onChange={e => setForm(f => ({ ...f, providerEmail: e.target.value }))}
                disabled={submitted}
              />
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Platform</div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cloud Provider</label>
                <select
                  className="select"
                  value={form.platformProvider}
                  onChange={e => setForm(f => ({ ...f, platformProvider: e.target.value }))}
                  disabled={submitted}
                >
                  {PLATFORM_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Execution Environment</label>
                <select
                  className="select"
                  value={form.executionEnvironment}
                  onChange={e => setForm(f => ({ ...f, executionEnvironment: e.target.value }))}
                  disabled={submitted}
                >
                  <option value="sgx">SGX (all nodes)</option>
                  <option value="mixed">Mixed (some SGX, affinity/tolerations)</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "8px" }}>
              Deployment model is fixed to Kubernetes for now (cloud-native Phase 1).
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Capacity</div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>CPU Cores</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.cpuCores}
                  onChange={e => setForm(f => ({ ...f, cpuCores: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>RAM (MB)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.ramMb}
                  onChange={e => setForm(f => ({ ...f, ramMb: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Storage (GB)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.storageGb}
                  onChange={e => setForm(f => ({ ...f, storageGb: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="grid" style={{ marginTop: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Node Count</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.nodeCount}
                  onChange={e => setForm(f => ({ ...f, nodeCount: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>SGX Node Count</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.sgxNodeCount}
                  onChange={e => setForm(f => ({ ...f, sgxNodeCount: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Max Concurrent Jobs</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.maxConcurrentJobs}
                  onChange={e => setForm(f => ({ ...f, maxConcurrentJobs: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Attestation</div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={form.attestationRequired}
                  onChange={e => setForm(f => ({ ...f, attestationRequired: e.target.checked }))}
                  disabled={submitted}
                />
                Attestation required
              </label>
            </div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Attestation Service</label>
                <input
                  className="input"
                  placeholder="e.g. azure-attestation"
                  value={form.attestationService}
                  onChange={e => setForm(f => ({ ...f, attestationService: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Attestation Policy ID</label>
                <input
                  className="input"
                  placeholder="e.g. smpc-prod-001"
                  value={form.attestationPolicyId}
                  onChange={e => setForm(f => ({ ...f, attestationPolicyId: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Connectivity</div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Load Balancer Endpoint</label>
                <input
                  className="input"
                  placeholder="https://lb.example.com"
                  value={form.loadBalancerEndpoint}
                  onChange={e => setForm(f => ({ ...f, loadBalancerEndpoint: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cluster Endpoint</label>
                <input
                  className="input"
                  placeholder="https://cluster.example.com"
                  value={form.clusterEndpoint}
                  onChange={e => setForm(f => ({ ...f, clusterEndpoint: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>

            <div className="grid" style={{ marginTop: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>SSH Host</label>
                <input
                  className="input"
                  placeholder="e.g. 10.0.0.5"
                  value={form.sshHost}
                  onChange={e => setForm(f => ({ ...f, sshHost: e.target.value }))}
                  disabled={submitted}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>SSH Port</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="65535"
                  value={form.sshPort}
                  onChange={e => setForm(f => ({ ...f, sshPort: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Access Rules</div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={form.allowRemoteProvisioning}
                  onChange={e => setForm(f => ({ ...f, allowRemoteProvisioning: e.target.checked }))}
                  disabled={submitted}
                />
                Allow remote provisioning
              </label>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={form.allowEphemeralExecution}
                  onChange={e => setForm(f => ({ ...f, allowEphemeralExecution: e.target.checked }))}
                  disabled={submitted}
                />
                Allow ephemeral execution
              </label>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "8px" }}>
              Allowed techniques (SMPC), allowed actions (provision / execute / terminate), and
              allowed roles are fixed for this policy type.
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>Expires on (optional)</label>
            <input
              className="input"
              type="date"
              value={form.validUntil}
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
              disabled={submitted}
            />
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
              {submitted ? "Setting..." : "Set Infrastructure Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
