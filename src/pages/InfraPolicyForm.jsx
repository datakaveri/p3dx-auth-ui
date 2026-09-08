import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { submitPolicy } from "../api/policies";
import { getInfrastructureDetails } from "../api/roleRequests";
import { getClassesForProvider, getSizesForClass, getSizeByName } from "../data/instanceSizeData";

const PLATFORM_PROVIDERS = [
  { id: "azure", label: "Azure" },
  { id: "gcp", label: "GCP" },
  { id: "aws", label: "AWS" },
];

// Small local helpers for the auto-generated Infrastructure ID / Provider ID
// (see Infra_Form_Changes.md item #8). No shared package exists for these —
// slugify() is intentionally duplicated in p3dx-aaa's server-side ownership
// checks; keep the two in sync if this changes.
function slugify(s) {
  return String(s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// infra-<YYYYMMDD>-<8-char base36>, e.g. infra-20260902-k3j9x2p7. Uses
// crypto.getRandomValues (rejection-sampled into base36 digits) rather than
// Math.random() for cryptographically strong, unbiased randomness — 36^8
// combinations keeps collisions negligible even at POC-unrealistic volumes.
function generateInfraId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  // Largest multiple of 36 that fits in a byte (252 = 7*36) — reject bytes
  // at or above this so every base36 digit stays equally likely.
  const limit = 256 - (256 % alphabet.length);
  let suffix = "";
  const buf = new Uint8Array(1);
  while (suffix.length < 8) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      suffix += alphabet[buf[0] % alphabet.length];
    }
  }
  return `infra-${datePart}-${suffix}`;
}

// Grows/shrinks a node-pool list to `count` entries without disturbing the
// entries that survive — appending blank pools on growth, truncating from
// the end on shrink (see Infra_Form_Changes.md's node-pool capacity item).
function resizeNodePools(pools, count) {
  if (count <= pools.length) return pools.slice(0, count);
  const grown = pools.slice();
  while (grown.length < count) grown.push({ nodeCount: 1, instanceClass: "", instanceSize: "" });
  return grown;
}

// Small line icons for each form-section header — plain inline SVG (no icon
// library anywhere in this app), one consistent stroke style. See
// Infra_Form_Changes.md item #12: deliberately not emoji here (unlike the
// SGX-hint badges below), since emoji-as-section-markers reads generic at
// this density — seven of them in a row.
const ICON_PROPS = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" };
function IconCloud() {
  return <svg {...ICON_PROPS}><path d="M5.5 15.5h9a3 3 0 0 0 .4-5.97A4.5 4.5 0 0 0 6.2 8.1 3 3 0 0 0 5.5 15.5Z" /></svg>;
}
function IconTag() {
  return <svg {...ICON_PROPS}><path d="M4 4h6l7 7-6 6-7-7V4Z" /><circle cx="7.4" cy="7.4" r="1.1" fill="currentColor" stroke="none" /></svg>;
}
function IconUser() {
  return <svg {...ICON_PROPS}><circle cx="10" cy="7" r="3" /><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>;
}
function IconServer() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3.5" width="14" height="3.6" rx="1" /><circle cx="6" cy="5.3" r=".5" fill="currentColor" stroke="none" />
      <rect x="3" y="8.2" width="14" height="3.6" rx="1" /><circle cx="6" cy="10" r=".5" fill="currentColor" stroke="none" />
      <rect x="3" y="12.9" width="14" height="3.6" rx="1" /><circle cx="6" cy="14.7" r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconShield() {
  return <svg {...ICON_PROPS}><path d="M10 3l6 2.2v4.3c0 4-2.6 7-6 8-3.4-1-6-4-6-8V5.2L10 3Z" /><path d="M7.3 10l1.8 1.8L13 8" /></svg>;
}
function IconPlug() {
  return <svg {...ICON_PROPS}><path d="M8 12l4-4" /><path d="M7 9 5.6 7.6a2.5 2.5 0 1 1 3.5-3.5L10.4 5.4" /><path d="M12 11l1.4 1.4a2.5 2.5 0 1 1-3.5 3.5L8.6 14.6" /></svg>;
}
function IconLock() {
  return <svg {...ICON_PROPS}><rect x="5" y="9" width="10" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>;
}

// What confidential-computing technology (if any) a chosen instance size
// carries. sgxEnabled and confidentialComputing never disagree in the
// dataset (an sgxEnabled size always also carries confidentialComputing.
// technology "Intel SGX"), so reading sgxEnabled first is just the more
// direct check. Module-scoped (not a deriveExecutionEnvironment-local
// helper) since confidentialFlags (below, near sgxNodeCount) also needs it.
const techOf = s => (s.sgxEnabled ? "Intel SGX" : s.confidentialComputing?.technology || null);

// Derives "Execution Environment" from whichever sizes are actually chosen,
// instead of a manual dropdown that could disagree with reality (see
// Infra_Form_Changes.md item #12). `entries` is one { label, size } per
// relevant slot — the VM's single size, or every node pool's — where `size`
// is whatever getSizeByName returns (undefined until a class+size is
// chosen).
//
// A plain (non-confidential) pool alongside a confidential one does NOT
// make this "Mixed" — e.g. one SGX pool plus two plain pools still reads as
// "Intel SGX", just without the "(all nodes)" qualifier, plus a breakdown
// caption. "Mixed" is reserved for two or more *disagreeing confidential*
// technologies actually being chosen (SGX pool + AMD SEV-SNP pool, say).
function deriveExecutionEnvironment(entries) {
  const chosen = entries.filter(e => e.size);
  if (!chosen.length) {
    return { state: "empty", label: "Select sizes below" };
  }

  const withTech = chosen.map(e => ({ ...e, tech: techOf(e.size) }));
  const confidential = withTech.filter(e => e.tech);
  const distinctTechs = [...new Set(confidential.map(e => e.tech))];
  const breakdown = () => withTech.map(e => `${e.tech || "not confidential"} (${e.label})`).join(" + ");

  if (!distinctTechs.length) {
    return { state: "none", label: "Not confidential", submitLabel: "Not confidential" };
  }
  if (distinctTechs.length > 1) {
    const detail = breakdown();
    return { state: "mixed", label: "Mixed", detail, submitLabel: `Mixed — ${detail}` };
  }

  // Exactly one confidential technology among the chosen sizes.
  const tech = distinctTechs[0];
  if (confidential.length === withTech.length) {
    const label = `${tech} (all nodes)`;
    return { state: "single", label, submitLabel: label };
  }
  // Some pools are plain — still that one technology, just not everywhere;
  // say so without claiming "(all nodes)".
  const detail = breakdown();
  return { state: "single", label: tech, detail, submitLabel: `${tech} — ${detail}` };
}

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
  // Edit mode: present when reached via the "My Infrastructure" dashboard's
  // Edit button (route services/infra-policy/edit/:itemId). Absent, this is
  // the plain "register new infrastructure" flow, unchanged.
  const { itemId } = useParams();
  const isEditMode = Boolean(itemId);

  const returnTo = location.state?.returnTo || "/app/services/smpc";

  const [form, setForm] = useState(() => ({
    // System-generated, read-only (Infra_Form_Changes.md item #8). Evaluated
    // once on mount via this lazy initializer — never regenerated on
    // re-render or on other field changes. In edit mode, preserve the
    // existing id (from the route) instead of minting a new one — reusing
    // it is what makes resubmission supersede the old entry.
    infraId: itemId || generateInfraId(),
    name: "",
    region: "",
    // Stable across every registration the same provider ever submits —
    // derived from the logged-in user's identity, not random per submission,
    // so a provider's multiple infra entries stay linkable back to them.
    providerId: `provider-${slugify(user?.username || user?.email)}`,
    // Prefilled from the logged-in user's own account — still editable, in
    // case the submitting person differs from the provider contact.
    providerEmail: user?.email || "",

    platformProvider: PLATFORM_PROVIDERS[0].id,
    // Execution Environment is no longer stored on form state — it's derived
    // live from whichever sizes are chosen below (see executionEnv memo and
    // deriveExecutionEnvironment above), not picked here.

    // "cluster" matches the deployment_model this form always submitted
    // before this field existed ("kubernetes") — see onSubmit below.
    computeType: "cluster",
    cpuCores: 64,
    ramMb: 262144,
    storageGb: 2048,
    nodeCount: 8,
    // sgxNodeCount is no longer stored on form state — it's derived from
    // the chosen sizes' sgxEnabled flag, same as executionEnv (see
    // sgxNodeCount memo below). The field that used to let a provider set
    // this by hand is gone; a manual number could disagree with which
    // pools actually got an SGX-enabled size.
    maxConcurrentJobs: 4,

    // Class/Size capacity picker (Cluster/VM Data JSONs, via
    // src/data/instanceSizeData.js). Cluster: one entry per node pool, each
    // contributing to the computed CPU Cores/RAM(MB)/Node Count totals below
    // once it has a class+size (see clusterTotals). VM: a single class/size
    // pair that pre-fills cpuCores/ramMb once on selection, matching the
    // nodeCount:8 default above so the two stay consistent before any
    // interaction.
    nodePoolCount: "1",
    nodePools: [{ nodeCount: 8, instanceClass: "", instanceSize: "" }],
    vmInstanceClass: "",
    vmInstanceSize: "",

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
  }));

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Edit mode: fetch the existing entry and seed the form from it. Uses the
  // same consumer-facing detail endpoint InfraCat's "expand for details" row
  // uses (getInfrastructureDetails) — it only ever returns the
  // rules.infrastructure block (deliberately stripped of provider_id/email
  // server-side), so providerId/providerEmail below stay derived from the
  // logged-in user, never from fetched data. It also doesn't carry
  // allow_remote_provisioning/allow_ephemeral_execution/expiresAt (those live
  // outside rules.infrastructure) — those Access Rules fields keep this
  // form's normal defaults on edit rather than the previously-saved values.
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [loadError, setLoadError] = useState(null);

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

  useEffect(() => {
    if (!isEditMode || !token) return;
    let cancelled = false;

    // loadingRecord/loadError already start correct for the normal case
    // (isEditMode/null via useState above) — itemId/token don't change
    // without remounting this page, so there's no re-run to reset for.

    getInfrastructureDetails(token, itemId)
      .then(res => {
        if (cancelled) return;
        const infra = res?.infrastructure;
        if (res?.status !== "SUCCESS" || !infra) {
          throw new Error(res?.error || "Infrastructure entry not found");
        }
        setForm(f => ({
          ...f,
          name: infra.name || "",
          region: infra.region || "",
          platformProvider: infra.platform?.provider || f.platformProvider,
          // infra.platform.execution_environment (a saved record's old value)
          // is intentionally not read back here — Execution Environment is
          // now derived live from nodePools/vmInstanceClass/vmInstanceSize,
          // which the hydration below this already sets.
          computeType: infra.platform?.deployment_model === "vm" ? "vm" : "cluster",
          cpuCores: infra.capacity?.cpu_cores ?? f.cpuCores,
          ramMb: infra.capacity?.ram_mb ?? f.ramMb,
          storageGb: infra.capacity?.storage_gb ?? f.storageGb,
          nodeCount: infra.capacity?.node_count ?? f.nodeCount,
          // infra.capacity.sgx_node_count similarly not read back — derived
          // live from the hydrated nodePools/vmInstanceSize instead (see
          // sgxNodeCount memo below).
          maxConcurrentJobs: infra.capacity?.max_concurrent_jobs ?? f.maxConcurrentJobs,
          // Class/Size picker: only present on records saved after this
          // feature shipped. Pre-feature records fall back to the
          // initializer's blank defaults (f.nodePools/f.vmInstanceClass/
          // f.vmInstanceSize) — leaving instanceClass/instanceSize empty
          // means clusterTotals.anySizeChosen stays false, so the totals-
          // sync effect never overwrites the flat cpu/ram/node numbers
          // just hydrated above from the legacy record.
          ...(Array.isArray(infra.capacity?.node_pools) && infra.capacity.node_pools.length
            ? {
                nodePoolCount: String(infra.capacity.node_pools.length),
                nodePools: infra.capacity.node_pools.map(p => ({
                  nodeCount: p.node_count ?? 1,
                  instanceClass: p.class || "",
                  instanceSize: p.size || "",
                })),
              }
            : {}),
          vmInstanceClass: infra.capacity?.instance_class || f.vmInstanceClass,
          vmInstanceSize: infra.capacity?.instance_size || f.vmInstanceSize,
          attestationRequired: infra.attestation?.required ?? f.attestationRequired,
          attestationService: infra.attestation?.service || "",
          attestationPolicyId: infra.attestation?.policy_id || "",
          loadBalancerEndpoint: infra.connectivity?.load_balancer_endpoint || "",
          clusterEndpoint: infra.connectivity?.cluster_endpoint || "",
          sshHost: infra.connectivity?.ssh_host || "",
          sshPort: infra.connectivity?.ssh_port ?? f.sshPort,
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

  // Merges a patch into one node pool by index — the per-pool Node
  // Count/Class/Size selects below all go through this.
  const updateNodePool = (idx, patch) =>
    setForm(f => ({ ...f, nodePools: f.nodePools.map((p, i) => (i === idx ? { ...p, ...patch } : p)) }));

  // Cluster capacity totals, summed across node pools. Node count is always
  // summed (it's known regardless of size selection); a pool only
  // contributes to cpuCores/ramMb once it has both a class and size chosen.
  // anySizeChosen gates whether the top-level CPU Cores/RAM(MB)/Node Count
  // fields switch to read-only computed values (see the sync effect below).
  const clusterTotals = useMemo(() => {
    if (form.computeType !== "cluster") return null;
    let cpuCores = 0, ramMb = 0, nodeCount = 0, anySizeChosen = false;
    for (const pool of form.nodePools) {
      const n = Number(pool.nodeCount) || 0;
      nodeCount += n;
      if (pool.instanceClass && pool.instanceSize) {
        const size = getSizeByName(form.platformProvider, pool.instanceClass, pool.instanceSize);
        if (size) {
          anySizeChosen = true;
          cpuCores += n * size.vcpus;
          ramMb += n * size.ramGib * 1024;
        }
      }
    }
    return { cpuCores, ramMb, nodeCount, anySizeChosen };
  }, [form.computeType, form.nodePools, form.platformProvider]);

  // The values actually shown (and submitted) for CPU Cores/RAM(MB)/Node
  // Count: the node-pool sum once any pool has a size chosen, otherwise
  // whatever's manually in form state — derived at render time rather than
  // synced into form state via an effect (which would just cause an extra
  // render and risk drifting out of sync with the pools that produced it).
  // Legacy edit-mode records (no pools chosen yet) simply fall through to
  // their hydrated flat form.cpuCores/ramMb/nodeCount, unaffected.
  const effectiveCapacity = useMemo(() => {
    if (clusterTotals?.anySizeChosen) {
      return { cpuCores: clusterTotals.cpuCores, ramMb: clusterTotals.ramMb, nodeCount: clusterTotals.nodeCount };
    }
    return { cpuCores: form.cpuCores, ramMb: form.ramMb, nodeCount: form.nodeCount };
  }, [clusterTotals, form.cpuCores, form.ramMb, form.nodeCount]);

  // Execution Environment, derived from whichever sizes are chosen: the VM's
  // single size, or every node pool's. See deriveExecutionEnvironment above.
  const executionEnv = useMemo(() => {
    if (form.computeType === "vm") {
      const size = getSizeByName(form.platformProvider, form.vmInstanceClass, form.vmInstanceSize);
      return deriveExecutionEnvironment([{ label: "VM", size }]);
    }
    return deriveExecutionEnvironment(
      form.nodePools.map((p, i) => ({
        label: `Pool ${i + 1}`,
        size: getSizeByName(form.platformProvider, p.instanceClass, p.instanceSize),
      }))
    );
  }, [form.computeType, form.platformProvider, form.vmInstanceClass, form.vmInstanceSize, form.nodePools]);

  // SGX Node Count, derived the same way — a manual field could disagree
  // with which pools actually got an SGX-enabled size. Counts nodes whose
  // chosen size has sgxEnabled true (not confidentialComputing generally —
  // this is specifically the SGX count, matching WorkloadForm.jsx's
  // "SGX Nodes" display downstream).
  const sgxNodeCount = useMemo(() => {
    if (form.computeType === "vm") {
      const size = getSizeByName(form.platformProvider, form.vmInstanceClass, form.vmInstanceSize);
      return size?.sgxEnabled ? Number(form.nodeCount) || 0 : 0;
    }
    return form.nodePools.reduce((sum, p) => {
      const size = getSizeByName(form.platformProvider, p.instanceClass, p.instanceSize);
      return sum + (size?.sgxEnabled ? Number(p.nodeCount) || 0 : 0);
    }, 0);
  }, [form.computeType, form.platformProvider, form.vmInstanceClass, form.vmInstanceSize, form.nodeCount, form.nodePools]);

  // Confidential-compute flags for the contract, derived the same way as
  // sgxNodeCount/executionEnv above — OR'd across every chosen size (all
  // node pools, or the VM's single size). Stored flat on the submitted
  // policy, mirroring sgx_node_count's own precedent: an aggregate derived
  // once from the chosen sizes, never re-derived downstream. The underlying
  // technology strings themselves are never submitted — techOf() is used
  // only here (and elsewhere in this file purely for on-screen display) to
  // compute these 5 booleans.
  const confidentialFlags = useMemo(() => {
    const sizes = form.computeType === "vm"
      ? [getSizeByName(form.platformProvider, form.vmInstanceClass, form.vmInstanceSize)]
      : form.nodePools.map(p => getSizeByName(form.platformProvider, p.instanceClass, p.instanceSize));
    const techs = sizes.filter(Boolean).map(techOf);
    return {
      sgxEnabled: techs.includes("Intel SGX"),
      tdxEnabled: techs.some(t => t === "Intel TDX" || t === "Intel TDX (Preview)"),
      sevSnpEnabled: techs.some(t => t === "AMD SEV-SNP" || t === "AMD SEV / AMD SEV-SNP"),
      sevEnabled: techs.some(t => t === "AMD SEV" || t === "AMD SEV / AMD SEV-SNP"),
      nitroEnclaveEnabled: techs.includes("AWS Nitro Enclaves"),
    };
  }, [form.computeType, form.platformProvider, form.vmInstanceClass, form.vmInstanceSize, form.nodePools]);

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
            // Derived from Compute Type: a single VM is never a k8s cluster.
            // Bare-metal (Phase 3, per the workflow doc) still isn't modeled.
            deployment_model: form.computeType === "vm" ? "vm" : "kubernetes",
            // Derived, not user-picked — see executionEnv above. "empty"
            // (no size chosen anywhere) submits as "" rather than a made-up
            // label; the Class/Size selects aren't marked required, so this
            // is reachable, if unlikely for a real registration.
            execution_environment: executionEnv.state === "empty" ? "" : executionEnv.submitLabel,
          },
          capacity: {
            // Read from effectiveCapacity, not form.cpuCores/ramMb/nodeCount
            // directly — for Cluster with any node pool sized, these are the
            // computed sums (see effectiveCapacity above), matching exactly
            // what's shown (and locked) in the fields above.
            cpu_cores: Number(effectiveCapacity.cpuCores) || 0,
            ram_mb: Number(effectiveCapacity.ramMb) || 0,
            storage_gb: Number(form.storageGb) || 0,
            node_count: Number(effectiveCapacity.nodeCount) || 0,
            // Derived, not user-picked — see sgxNodeCount above.
            sgx_node_count: sgxNodeCount,
            max_concurrent_jobs: Number(form.maxConcurrentJobs) || 0,
            // Confidential-compute flags for the contract (replaces
            // execution_platform downstream) — see confidentialFlags above.
            // Flat booleans, not a raw technology string: OR'd across every
            // node pool/VM instance this infra actually has.
            sgx_enabled: confidentialFlags.sgxEnabled,
            tdx_enabled: confidentialFlags.tdxEnabled,
            sev_snp_enabled: confidentialFlags.sevSnpEnabled,
            sev_enabled: confidentialFlags.sevEnabled,
            nitro_enclave_enabled: confidentialFlags.nitroEnclaveEnabled,
            // Non-breaking addition alongside the flat totals above (which
            // remain what contractgen.go actually reads) — provenance for
            // the class/size picker, e.g. for a future InfraCat breakdown.
            ...(form.computeType === "cluster"
              ? {
                  node_pools: form.nodePools.map(p => {
                    const size = getSizeByName(form.platformProvider, p.instanceClass, p.instanceSize);
                    return {
                      node_count: Number(p.nodeCount) || 0,
                      class: p.instanceClass,
                      size: p.instanceSize,
                      cpu_cores_per_node: size?.vcpus ?? 0,
                      ram_mb_per_node: size ? size.ramGib * 1024 : 0,
                    };
                  }),
                }
              : { instance_class: form.vmInstanceClass, instance_size: form.vmInstanceSize }),
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
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            {isEditMode ? "Edit Infrastructure Policy" : "Set Infrastructure Policy"}
          </h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            {isEditMode
              ? "Update your infrastructure's capacity, attestation, and access rules for SMPC workloads."
              : "Register your infrastructure's capacity, attestation, and access rules for SMPC workloads."}
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
      {loadError ? <div className="error-message">{loadError}</div> : null}
      {submitted ? (
        <div className="info-banner">
          {isEditMode
            ? "Infrastructure policy updated successfully. Redirecting..."
            : "Infrastructure policy stored in APD successfully. Redirecting..."}
        </div>
      ) : null}

      {loadingRecord ? (
        <div className="card">Loading infrastructure details...</div>
      ) : loadError ? null : (
      <div className="card">
        <form onSubmit={onSubmit}>
          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconCloud /></div>
              <div className="form-section-titles">
                <h4>Platform</h4>
                <span>Cloud provider</span>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0, maxWidth: "320px" }}>
              <label>Cloud Provider</label>
              <select
                className="select"
                value={form.platformProvider}
                onChange={e => {
                  const platformProvider = e.target.value;
                  setForm(f => ({
                    ...f,
                    platformProvider,
                    // Classes/sizes are provider-specific — any already-chosen
                    // class/size (VM's single pick, or a node pool's) is
                    // invalid under the new provider, so clear it. Node
                    // counts aren't provider-specific, so those are kept.
                    vmInstanceClass: "",
                    vmInstanceSize: "",
                    nodePools: f.nodePools.map(p => ({ ...p, instanceClass: "", instanceSize: "" })),
                  }));
                }}
                disabled={submitted}
              >
                {PLATFORM_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "10px" }}>
              Choose your compute type and instance size — VM or Cluster — in Capacity below.
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconTag /></div>
              <div className="form-section-titles">
                <h4>Infrastructure</h4>
                <span>Identity for this registration</span>
              </div>
            </div>
            <div className="grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Infrastructure ID</label>
                <input
                  className="input"
                  readOnly
                  disabled
                  value={form.infraId}
                />
                <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                  Auto-generated
                </div>
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
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconUser /></div>
              <div className="form-section-titles">
                <h4>Provider</h4>
                <span>Who's registering this infrastructure</span>
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
                  placeholder="provider@example.com"
                  value={form.providerEmail}
                  onChange={e => setForm(f => ({ ...f, providerEmail: e.target.value }))}
                  disabled={submitted}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconServer /></div>
              <div className="form-section-titles">
                <h4>Capacity</h4>
                <span>Compute type, sizing, node pools, execution environment</span>
              </div>
            </div>
            <div className="form-group">
              <label>Compute Type</label>
              <select
                className="select"
                value={form.computeType}
                onChange={e => {
                  const computeType = e.target.value;
                  setForm(f => ({
                    ...f,
                    computeType,
                    // A VM is inherently a single node — keep the numbers
                    // honest instead of leaving stale cluster defaults behind.
                    ...(computeType === "vm"
                      ? {
                          nodeCount: 1,
                          maxConcurrentJobs: 1,
                        }
                      : // Switching into Cluster: seed one blank node pool if
                        // there isn't one already (e.g. first-ever switch —
                        // the initializer already seeds one by default, so
                        // this is mostly a safety net).
                        { nodePools: f.nodePools?.length ? f.nodePools : [{ nodeCount: 1, instanceClass: "", instanceSize: "" }] }),
                  }));
                }}
                disabled={submitted}
              >
                <option value="vm">Virtual Machine (VM)</option>
                <option value="cluster">Cluster</option>
              </select>
            </div>

            {form.computeType === "vm" ? (
              <div className="grid" style={{ marginTop: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Class</label>
                  <select
                    className="select"
                    value={form.vmInstanceClass}
                    onChange={e => setForm(f => ({ ...f, vmInstanceClass: e.target.value, vmInstanceSize: "" }))}
                    disabled={submitted}
                  >
                    <option value="">Select a class...</option>
                    {getClassesForProvider(form.platformProvider).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Size</label>
                  <select
                    className="select"
                    value={form.vmInstanceSize}
                    onChange={e => {
                      const instanceSize = e.target.value;
                      const size = getSizeByName(form.platformProvider, form.vmInstanceClass, instanceSize);
                      setForm(f => ({
                        ...f,
                        vmInstanceSize: instanceSize,
                        // Pre-fills once, on selection — CPU Cores/RAM (MB)
                        // stay freely editable afterward (unlike the Cluster
                        // node-pool totals below, which stay computed).
                        ...(size ? { cpuCores: size.vcpus, ramMb: size.ramGib * 1024 } : {}),
                      }));
                    }}
                    disabled={submitted || !form.vmInstanceClass}
                  >
                    <option value="">Select a size...</option>
                    {getSizesForClass(form.platformProvider, form.vmInstanceClass).map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  {(() => {
                    const size = getSizeByName(form.platformProvider, form.vmInstanceClass, form.vmInstanceSize);
                    if (!size) return null;
                    const isSgx = size.sgxEnabled || size.confidentialComputing;
                    return (
                      <div style={{ marginTop: "4px" }}>
                        {isSgx ? (
                          <span className="badge badge-success">
                            {size.sgxEnabled
                              ? `🔒 SGX-enabled`
                              : `🛡️ Confidential computing: ${size.confidentialComputing?.technology || "supported"}`}
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-light)" }}>– Not SGX-enabled</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {form.computeType === "vm" && form.vmInstanceSize ? (() => {
              const size = getSizeByName(form.platformProvider, form.vmInstanceClass, form.vmInstanceSize);
              if (!size) return null;
              return (
                <div className="grid" style={{ marginTop: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>CPU Cores</label>
                    <input className="input" readOnly disabled value={size.vcpus} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>RAM (MB)</label>
                    <input className="input" readOnly disabled value={size.ramGib * 1024} />
                  </div>
                </div>
              );
            })() : null}

            <div className="grid" style={{ marginTop: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>CPU Cores</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={effectiveCapacity.cpuCores}
                  onChange={e => setForm(f => ({ ...f, cpuCores: e.target.value }))}
                  disabled={submitted || (form.computeType === "cluster" && clusterTotals?.anySizeChosen)}
                />
                {form.computeType === "cluster" && clusterTotals?.anySizeChosen ? (
                  <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                    Computed from node pools
                  </div>
                ) : null}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>RAM (MB)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={effectiveCapacity.ramMb}
                  onChange={e => setForm(f => ({ ...f, ramMb: e.target.value }))}
                  disabled={submitted || (form.computeType === "cluster" && clusterTotals?.anySizeChosen)}
                />
                {form.computeType === "cluster" && clusterTotals?.anySizeChosen ? (
                  <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                    Computed from node pools
                  </div>
                ) : null}
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

            {form.computeType === "cluster" ? (
              <>
                <div className="capacity-sub-label">Node pools</div>
                <div className="form-group" style={{ marginTop: 0 }}>
                  <label>Number of Node Pools</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.nodePoolCount}
                    onChange={e => {
                      const count = Math.max(1, Number(e.target.value) || 1);
                      setForm(f => ({ ...f, nodePoolCount: e.target.value, nodePools: resizeNodePools(f.nodePools, count) }));
                    }}
                    disabled={submitted}
                  />
                  <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                    Each node pool below can use a different class/size — CPU Cores, RAM (MB), and Node Count
                    above are computed as the sum across all pools.
                  </div>
                </div>

                <div className="grid" style={{ marginTop: "12px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Node Count</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={effectiveCapacity.nodeCount}
                      onChange={e => setForm(f => ({ ...f, nodeCount: e.target.value }))}
                      disabled={submitted || clusterTotals?.anySizeChosen}
                    />
                    {clusterTotals?.anySizeChosen ? (
                      <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "4px" }}>
                        Computed from node pools
                      </div>
                    ) : null}
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

                <div className="node-pool-list">
                  {form.nodePools.map((pool, idx) => {
                    const size = getSizeByName(form.platformProvider, pool.instanceClass, pool.instanceSize);
                    return (
                      <div key={idx} className="node-pool-card">
                        <div className="node-pool-head">
                          <div className="node-pool-head-left">
                            <span className="node-pool-num">{idx + 1}</span>
                            <span className="node-pool-title">Node Pool</span>
                          </div>
                          {size ? (
                            <div className="node-pool-stat">
                              <div className="stat-col">
                                <span className="label">vCPU</span>
                                <span className="value">{size.vcpus}</span>
                              </div>
                              <div className="stat-col">
                                <span className="label">RAM</span>
                                <span className="value">{(size.ramGib * 1024).toLocaleString()} MiB</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="grid">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Node Count</label>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              value={pool.nodeCount}
                              onChange={e => updateNodePool(idx, { nodeCount: e.target.value })}
                              disabled={submitted}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Class</label>
                            <select
                              className="select"
                              value={pool.instanceClass}
                              onChange={e => updateNodePool(idx, { instanceClass: e.target.value, instanceSize: "" })}
                              disabled={submitted}
                            >
                              <option value="">Select a class...</option>
                              {getClassesForProvider(form.platformProvider).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Size</label>
                            <select
                              className="select"
                              value={pool.instanceSize}
                              onChange={e => updateNodePool(idx, { instanceSize: e.target.value })}
                              disabled={submitted || !pool.instanceClass}
                            >
                              <option value="">Select a size...</option>
                              {getSizesForClass(form.platformProvider, pool.instanceClass).map(s => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {size ? (
                          <div style={{ marginTop: "10px" }}>
                            {size.sgxEnabled || size.confidentialComputing ? (
                              <span className="badge badge-success">
                                {size.sgxEnabled
                                  ? `🔒 SGX-enabled`
                                  : `🛡️ Confidential computing: ${size.confidentialComputing.technology || "supported"}`}
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", color: "var(--text-light)" }}>– Not SGX-enabled</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="exec-env-row">
              <div className="exec-label-col">
                <span className="exec-env-label">Execution Environment</span>
                <span className="exec-env-hint">
                  {executionEnv.state === "empty"
                    ? "Derived automatically once a Class/Size is chosen above."
                    : form.computeType === "vm"
                      ? "Derived from the VM's chosen size."
                      : "Derived from every node pool's chosen size."}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`exec-env-badge state-${executionEnv.state}`}>{executionEnv.label}</span>
                {executionEnv.detail ? <div className="exec-env-detail">{executionEnv.detail}</div> : null}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconShield /></div>
              <div className="form-section-titles">
                <h4>Attestation</h4>
                <span>Verification for SGX/confidential jobs</span>
              </div>
            </div>
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

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconPlug /></div>
              <div className="form-section-titles">
                <h4>Connectivity</h4>
                <span>How workloads reach this infrastructure</span>
              </div>
            </div>
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

          <div className="form-section">
            <div className="form-section-head">
              <div className="form-section-icon"><IconLock /></div>
              <div className="form-section-titles">
                <h4>Access Rules</h4>
                <span>What consumers of this infrastructure can do</span>
              </div>
            </div>
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
              {submitted
                ? (isEditMode ? "Updating..." : "Setting...")
                : (isEditMode ? "Update Infrastructure Policy" : "Set Infrastructure Policy")}
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
