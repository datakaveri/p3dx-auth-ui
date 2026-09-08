import { useState } from "react";
import {
  X, FileText, Users, Server, Database, Cpu, ShieldCheck,
  Clock, Hash, CheckCircle2, Circle,
} from "lucide-react";

// Renders a Go zero-value time.Time ("0001-01-01T00:00:00Z") as "—" instead
// of a misleading epoch date.
function formatDate(iso) {
  if (!iso || iso.startsWith("0001-01-01")) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SignedBadge({ signature }) {
  const signedAt = signature?.signed_at;
  return signedAt ? (
    <span className="cpm-badge cpm-badge--signed">
      <CheckCircle2 size={12} /> Signed {formatDate(signedAt)}
    </span>
  ) : (
    <span className="cpm-badge cpm-badge--pending">
      <Circle size={12} /> Pending signature
    </span>
  );
}

function Field({ label, value, mono }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="cpm-field">
      <div className="cpm-field__label">{label}</div>
      <div className={`cpm-field__value${mono ? " cpm-field__value--mono" : ""}`}>{value}</div>
    </div>
  );
}

function Constraints({ constraints }) {
  if (!constraints) return null;
  const { accessibility_level, restricted_to } = constraints;
  if (!accessibility_level && !(restricted_to || []).length) return null;
  return (
    <div className="cpm-field">
      <div className="cpm-field__label">Constraints</div>
      <div className="cpm-field__value">
        {accessibility_level && <span className="pill">{accessibility_level}</span>}
        {(restricted_to || []).map(r => <span key={r} className="pill" style={{ marginLeft: 6 }}>{r}</span>)}
      </div>
    </div>
  );
}

function PartyCard({ icon, title, children }) {
  return (
    <div className="cpm-party">
      <div className="cpm-party__header">
        {icon}
        <span>{title}</span>
      </div>
      <div className="cpm-party__body">{children}</div>
    </div>
  );
}

export default function ContractPreviewModal({ open, contract, onClose }) {
  const [showRaw, setShowRaw] = useState(false);
  if (!open || !contract) return null;

  const { parties = {}, lifecycle = {}, session_info: sessionInfo = {} } = contract;
  const dataProviders = parties.data_providers || [];
  const appProviders = parties.application_providers || [];
  const infraProviders = parties.infra_providers || [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header cpm-header">
          <div className="modal-title">
            <FileText size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
            Contract Preview
          </div>
          <button type="button" className="cat-icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="cpm-body">
          {/* Overview */}
          <section className="cpm-section">
            <div className="cpm-section__title">Overview</div>
            <div className="grid">
              <Field label="Technique" value={<span className="pill">{contract.technique}</span>} />
              <Field label="Compute Choice" value={contract.compute_choice} />
              <Field label="Project ID" value={contract.project_id} mono />
              <Field label="Contract ID" value={contract.contract_id} mono />
              <Field label="Version" value={contract.version} />
            </div>
            {contract.contract_hash && (
              <div className="cpm-field" style={{ marginTop: 10 }}>
                <div className="cpm-field__label"><Hash size={11} style={{ marginRight: 4, verticalAlign: -1 }} />Contract Hash</div>
                <div className="cpm-field__value cpm-field__value--mono">{contract.contract_hash}</div>
              </div>
            )}
          </section>

          {/* Lifecycle */}
          <section className="cpm-section">
            <div className="cpm-section__title"><Clock size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Lifecycle</div>
            <div className="grid">
              <Field label="Created" value={formatDate(lifecycle.created_at)} />
              <Field label="Valid From" value={formatDate(lifecycle.valid_from)} />
              <Field label="Valid Until" value={formatDate(lifecycle.valid_until)} />
            </div>
          </section>

          {/* Parties */}
          <section className="cpm-section">
            <div className="cpm-section__title"><Users size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Parties</div>

            {parties.user && (
              <PartyCard icon={<Users size={14} />} title="Consumer">
                <Field label="ID" value={parties.user.id} mono />
                <Field label="Name" value={parties.user.name} />
                <Field label="Data Blob URL" value={parties.user.datablob_url} mono />
                <SignedBadge signature={parties.user.signature} />
              </PartyCard>
            )}

            {dataProviders.map((dp, i) => (
              <PartyCard key={dp.id || i} icon={<Database size={14} />} title={dataProviders.length > 1 ? `Data Provider ${i + 1}` : "Data Provider"}>
                <Field label="Name" value={dp.name || "Unknown Data Provider"} />
                <Field label="Dataset" value={dp.dataset_name} />
                <Field label="Dataset Version" value={dp.dataset_version} />
                <Field label="Data URL" value={dp.data_url} mono />
                <Constraints constraints={dp.constraints} />
                <SignedBadge signature={dp.signature} />
              </PartyCard>
            ))}

            {appProviders.map((ap, i) => (
              <PartyCard key={ap.id || i} icon={<Server size={14} />} title={appProviders.length > 1 ? `Application Provider ${i + 1}` : "Application Provider"}>
                <Field label="Name" value={ap.name || "Unknown Application Provider"} />
                <Field label="App Name" value={ap.app_name} />
                <Field label="Container Image" value={ap.container_image} mono />
                <Field label="Container Digest" value={ap.container_digest} mono />
                <Constraints constraints={ap.constraints} />
                <SignedBadge signature={ap.signature} />
              </PartyCard>
            ))}

            {infraProviders.map((ip, i) => (
              <PartyCard key={ip.id || i} icon={<Cpu size={14} />} title={infraProviders.length > 1 ? `Infrastructure Provider ${i + 1}` : "Infrastructure"}>
                <Field label="Name" value={ip.name} />
                <Field label="Region" value={ip.region} />
                {ip.attestation?.required && (
                  <Field
                    label="Attestation"
                    value={
                      <span className="cpm-badge cpm-badge--signed">
                        <ShieldCheck size={12} /> {ip.attestation.service || "Required"}
                        {ip.attestation.policy_id ? ` · ${ip.attestation.policy_id}` : ""}
                      </span>
                    }
                  />
                )}
                {(ip.resource_allocation?.cpu_cores || ip.resource_allocation?.ram_mb || ip.resource_allocation?.gpu) && (
                  <Field
                    label="Resources"
                    value={[
                      ip.resource_allocation.cpu_cores ? `${ip.resource_allocation.cpu_cores} vCPU` : null,
                      ip.resource_allocation.ram_mb ? `${ip.resource_allocation.ram_mb} MB RAM` : null,
                      ip.resource_allocation.gpu || null,
                    ].filter(Boolean).join(" · ")}
                  />
                )}
                <Constraints constraints={ip.constraints} />
                <SignedBadge signature={ip.signature} />
              </PartyCard>
            ))}
          </section>

          {/* Session info */}
          {(sessionInfo.id || sessionInfo.session_id || sessionInfo.requested_by) && (
            <section className="cpm-section">
              <div className="cpm-section__title">Session</div>
              <div className="grid">
                <Field label="Session ID" value={sessionInfo.session_id} mono />
                <Field label="Requested By" value={sessionInfo.requested_by} mono />
              </div>
            </section>
          )}

          {/* Raw JSON */}
          <section className="cpm-section">
            <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setShowRaw(v => !v)}>
              {showRaw ? "Hide raw contract JSON" : "View raw contract JSON"}
            </button>
            {showRaw && (
              <pre className="cpm-raw">{JSON.stringify(contract, null, 2)}</pre>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
