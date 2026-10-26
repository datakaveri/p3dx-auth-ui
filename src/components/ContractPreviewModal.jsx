import { useState } from "react";
import {
  X, FileText, Users, Server, Database, Cpu, ShieldCheck,
  Clock, Hash, CheckCircle2,
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
  ) : null;
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
        {/* {accessibility_level && <span className="pill">{accessibility_level}</span>} */}
        {/* Never shown as PUBLIC — displayed as PRIVATE instead (display only;
            the contract's own accessibility_level is untouched). */}
        {accessibility_level && (
          <span className="pill">{accessibility_level.toUpperCase() === "PUBLIC" ? "PRIVATE" : accessibility_level}</span>
        )}
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

// onEdit (optional): async (changes) => void, where changes is the
// PUT /contracts/{id} body. When given, an Edit button lets the consumer
// switch the workload (the only editable field); a rejected promise's
// message is shown above Save.
// workloads (optional): the workload catalogue [{ id, name, image, cpu,
// memory }] for the edit-mode Workload dropdown.
export default function ContractPreviewModal({ open, contract, onClose, onEdit, workloads = [] }) {
  const [showRaw, setShowRaw] = useState(false);
  const [draft, setDraft] = useState(null); // null when not editing
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  if (!open || !contract) return null;

  const editing = Boolean(draft);

  const startEdit = () => {
    setEditError(null);
    setDraft({
      workload_id: contract.parties?.application_providers?.[0]?.id || "",
      image: contract.workload?.image || "",
      cpu: contract.workload?.resources?.cpu || "",
      memory: contract.workload?.resources?.memory || "",
    });
  };

  const saveEdit = async () => {
    // Only the workload choice is editable; gov_layer fills its image and
    // resources from its own catalogue.
    const changes = { workload: { id: draft.workload_id || undefined } };
    setEditError(null);
    setIsSaving(true);
    try {
      await onEdit(changes);
      setDraft(null);
    } catch (err) {
      setEditError(err?.message || "Saving failed");
    } finally {
      setIsSaving(false);
    }
  };

  const { parties = {}, lifecycle = {}, session_info: sessionInfo = {} } = contract;
  const dataProviders = parties.data_providers || [];
  // The TEE flow has no application or infrastructure provider, so their
  // cards are hidden for TEE (still present in the raw JSON).
  const isTEE = contract.technique === "TEE";
  const appProviders = isTEE ? [] : parties.application_providers || [];
  const infraProviders = isTEE ? [] : parties.infra_providers || [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header cpm-header">
          <div className="modal-title">
            <FileText size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
            Consent Request Preview
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {onEdit && !editing && (
              <button type="button" className="btn btn-secondary" style={{ width: "auto" }} onClick={startEdit}>
                Edit
              </button>
            )}
            <button type="button" className="cat-icon-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="cpm-body">
          {/* Overview */}
          <section className="cpm-section">
            <div className="cpm-section__title">Overview</div>
            <div className="grid">
              <Field label="Technique" value={<span className="pill">{contract.technique}</span>} />
              <Field label="Contract ID" value={contract.contract_id} mono />
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

          {/* FL training parameters, signed as part of the contract */}
          {contract.fl_config && (
            <section className="cpm-section">
              <div className="cpm-section__title"><Cpu size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Training</div>
              <div className="grid">
                <Field label="Rounds" value={contract.fl_config.num_rounds} />
                <Field label="Local Epochs" value={contract.fl_config.local_epochs} />
                <Field label="Learning Rate" value={contract.fl_config.learning_rate} mono />
                <Field label="Batch Size" value={contract.fl_config.batch_size} />
              </div>
            </section>
          )}

          {/* Parties */}
          <section className="cpm-section">
            <div className="cpm-section__title"><Users size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Parties</div>

            {parties.user && (
              <PartyCard icon={<Users size={14} />} title="Consumer">
                <Field label="ID" value={parties.user.id} mono />
                <Field label="Name" value={parties.user.name} />
                <Field label="Technique" value={contract.technique} />
                <SignedBadge signature={parties.user.signature} />
              </PartyCard>
            )}

            {dataProviders.map((dp, i) => (
              <PartyCard key={dp.id || i} icon={<Database size={14} />} title={dataProviders.length > 1 ? `Data Provider ${i + 1}` : "Data Provider"}>
                <Field label="Name" value={dp.name || "Unknown Data Provider"} />
                <Field label="Dataset" value={dp.dataset_name} />
                <Field label="Dataset Version" value={dp.dataset_version} />
                <Field label="Data URL" value={dp.data_url} mono />
                <Field label="Key Resource Path" value={dp.trustee?.key_resource_path} mono />
                <Constraints constraints={dp.constraints} />
                <Field
                  label="Consent Expires"
                  value={dp.constraints?.consent_valid_until ? formatDate(dp.constraints.consent_valid_until) : "Not set (lasts until Valid Until)"}
                />
                <SignedBadge signature={dp.signature} />
              </PartyCard>
            ))}

            {/* Workload — the container the TEE runs, shown as a card like
                the data provider's. env is left out: it only carries
                system-filled URLs (dataset / result SAS). */}
            {contract.workload && (
              <PartyCard icon={<Cpu size={14} />} title="Workload">
                {editing ? (
                  <div className="cpm-field">
                    <div className="cpm-field__label">Workload</div>
                    <select
                      className="input"
                      value={draft.workload_id}
                      onChange={e => {
                        const w = workloads.find(x => x.id === e.target.value);
                        setDraft(d => ({
                          ...d,
                          workload_id: e.target.value,
                          ...(w ? { image: w.image || "", cpu: w.cpu || "", memory: w.memory || "" } : {}),
                        }));
                      }}
                    >
                      {!workloads.some(w => w.id === draft.workload_id) && (
                        <option value={draft.workload_id}>{draft.workload_id || "—"}</option>
                      )}
                      {workloads.map(w => (
                        <option key={w.id} value={w.id}>{w.name || w.id}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Field
                    label="Workload"
                    value={(() => {
                      const id = parties.application_providers?.[0]?.id;
                      return workloads.find(w => w.id === id)?.name || id;
                    })()}
                  />
                )}
                {/* Read-only: they follow the selected workload. */}
                <Field label="Image" mono value={editing ? draft.image : contract.workload.image} />
                <Field label="CPU" mono value={editing ? draft.cpu : contract.workload.resources?.cpu} />
                <Field label="Memory" mono value={editing ? draft.memory : contract.workload.resources?.memory} />
              </PartyCard>
            )}

            {appProviders.map((ap, i) => (
              <PartyCard key={ap.id || i} icon={<Server size={14} />} title={appProviders.length > 1 ? `Application Provider ${i + 1}` : "Application Provider"}>
                <Field label="Name" value={ap.name || "Unknown Application Provider"} />
                <Field label="App Name" value={ap.app_name} />
                <Field label="Container Image" value={ap.container_image} mono />
                <Field label="Workload Image" value={contract.workload?.image} mono />
                <Field label="Workload CPU" value={contract.workload?.resources?.cpu} mono />
                <Field label="Workload Memory" value={contract.workload?.resources?.memory} mono />
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

          {editing && (
            <section className="cpm-section">
              {editError && <div className="error-message" style={{ fontSize: 13, marginBottom: 8 }}>{editError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={isSaving} onClick={saveEdit}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={isSaving} onClick={() => setDraft(null)}>
                  Cancel
                </button>
              </div>
            </section>
          )}

          {/* Raw JSON */}
          <section className="cpm-section">
            <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setShowRaw(v => !v)}>
              {showRaw ? "Hide raw consent request JSON" : "View raw consent request JSON"}
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
