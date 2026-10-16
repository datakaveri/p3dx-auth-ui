import { useState } from "react";
import { FileText, Database, Target, Users, Clock, ShieldCheck } from "lucide-react";

// Consent notice shown to a data provider before they sign a contract,
// laid out per Rule 3 of the DPDP Rules, 2025:
//   (a) understandable on its own, without other documents
//   (b) plain language: (i) itemised data, (ii) specified purpose and the
//       goods/services/uses it enables
//   (c) link to the website/app, and how to (i) withdraw consent as easily as
//       it is given, (ii) exercise rights, (iii) complain to the Board.
// Contact details come from VITE_DPDP_* env vars; unset ones show a
// "not configured" placeholder so the gap is visible rather than hidden.
const GRIEVANCE_EMAIL = import.meta.env.VITE_DPDP_GRIEVANCE_EMAIL || "";

// Plain-language account of what each technique does with the data. A
// contract-supplied purpose (contract.purpose) takes precedence.
const TECHNIQUE_USES = {
  FL: "Federated learning: a machine-learning model is trained on your dataset where it is hosted. Only model updates are shared with the aggregator; your raw records are not copied to the requester.",
  TEE: "Confidential computing: the workload below runs on your dataset inside a hardware-attested Trusted Execution Environment, which keeps the data encrypted and isolated from the infrastructure operator.",
  SMPC: "Secure multi-party computation: your data is split into secret shares and computed on jointly with other providers, so no single party sees your raw records.",
};

function formatDate(iso) {
  if (!iso || iso.startsWith("0001-01-01")) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Missing({ children }) {
  return <span className="dpdp-missing">{children}</span>;
}

function Section({ icon, title, children }) {
  return (
    <section className="dpdp-section">
      <div className="cpm-section__title">{icon}{title}</div>
      {children}
    </section>
  );
}

// contract: the full contract JSON. requestedBy: sender username.
// acknowledged / onAcknowledge: controlled "I have read this notice" box;
// omit onAcknowledge to render the notice read-only (e.g. already signed).
// onSave: optional Save button under the box, enabled once it is ticked.
// beforeSave: optional content shown last, just above Save (e.g. the
// provider's consent expiry picker).
export default function DpdpConsentNotice({ contract, requestedBy, acknowledged, onAcknowledge, onSave, beforeSave }) {
  const [showRaw, setShowRaw] = useState(false);
  if (!contract) return null;

  const { parties = {}, lifecycle = {}, workload } = contract;
  const technique = contract.technique || "—";
  const consumer = parties.user?.name || parties.user?.id || requestedBy || "—";
  const datasets = parties.data_providers || [];
  const isTEE = contract.technique === "TEE";
  const appProviders = isTEE ? [] : parties.application_providers || [];
  const infraProviders = isTEE ? [] : parties.infra_providers || [];
  const validFrom = formatDate(lifecycle.valid_from);
  const validUntil = formatDate(lifecycle.valid_until);
  const purpose = contract.purpose || contract.purpose_description;

  return (
    <div className="dpdp-notice">
      <div className="dpdp-notice__header">
        <FileText size={16} />
        <div>
          <div className="dpdp-notice__title">Consent Notice</div>
          <div className="dpdp-notice__sub">
            Under the Digital Personal Data Protection Act, 2023 and Rule 3 of the DPDP Rules, 2025
          </div>
        </div>
      </div>

      <p className="dpdp-lead">
        <strong>{consumer}</strong> is asking for your consent to process the data listed below for the purpose stated
        here. Read this notice before you sign. Signing with your private key is how you give consent.
      </p>

      <Section icon={<Users size={13} />} title="Who is asking">
        <ul className="dpdp-list">
          <li><strong>Requester (Data Fiduciary):</strong> {consumer}</li>
          {appProviders.map((ap, i) => (
            <li key={ap.id || i}><strong>Application provider:</strong> {ap.name || ap.id}{ap.app_name ? ` (${ap.app_name})` : ""}</li>
          ))}
          {infraProviders.map((ip, i) => (
            <li key={ip.id || i}><strong>Infrastructure:</strong> {ip.name || ip.id}{ip.region ? `, region ${ip.region}` : ""}</li>
          ))}
          <li><strong>Contract ID:</strong> <span className="cpm-field__value--mono">{contract.contract_id}</span></li>
        </ul>
      </Section>

      <Section icon={<Database size={13} />} title="Data that will be processed">
        {datasets.length === 0 ? (
          <Missing>No datasets are listed in this contract.</Missing>
        ) : (
          <ul className="dpdp-list">
            {datasets.map((dp, i) => (
              <li key={dp.id || i}>
                <strong>{dp.dataset_name || dp.dataset_id || "Unnamed dataset"}</strong>
                {dp.dataset_version ? ` (version ${dp.dataset_version})` : ""}
                {dp.name ? ` from ${dp.name}` : ""}
                {/* {dp.constraints?.accessibility_level ? `. Access level: ${dp.constraints.accessibility_level}` : ""} */}
                {/* Consent notice never says PUBLIC — shown as PRIVATE instead
                    (display only; the contract's own accessibility_level is untouched). */}
                {dp.constraints?.accessibility_level
                  ? `. Access level: ${dp.constraints.accessibility_level.toUpperCase() === "PUBLIC" ? "PRIVATE" : dp.constraints.accessibility_level}`
                  : ""}
                {(dp.constraints?.restricted_to || []).length ? `. Restricted to: ${dp.constraints.restricted_to.join(", ")}` : ""}
                {dp.constraints?.consent_valid_until ? `. Consent expires: ${formatDate(dp.constraints.consent_valid_until)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Target size={13} />} title="Purpose and use">
        <ul className="dpdp-list">
          <li>
            <strong>Purpose:</strong>{" "}
            {purpose || <Missing>The requester has not stated a specific purpose in this contract.</Missing>}
          </li>
          <li><strong>How your data is used:</strong> {TECHNIQUE_USES[contract.technique] || `Processing by technique ${technique}.`}</li>
          {workload?.image ? (
            <li><strong>Program that will run:</strong> <span className="cpm-field__value--mono">{workload.image}</span></li>
          ) : null}
          <li>Your data will be used only for this purpose and only under this contract.</li>
        </ul>
      </Section>

      <Section icon={<Clock size={13} />} title="How long consent lasts">
        <ul className="dpdp-list">
          <li>
            {validFrom || validUntil
              ? <>Valid from <strong>{validFrom || "signing"}</strong> until <strong>{validUntil || "the session ends"}</strong>.</>
              : <Missing>No validity period is set in this contract.</Missing>}
          </li>
          {datasets.filter(dp => dp.constraints?.consent_valid_until).map((dp, i) => (
            <li key={`exp-${dp.id || i}`}>
              Consent from <strong>{dp.name || dp.id}</strong> for {dp.dataset_name || "their dataset"} expires on{" "}
              <strong>{formatDate(dp.constraints.consent_valid_until)}</strong>; no run starts after it.
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={<ShieldCheck size={13} />} title="Your rights">
        <ul className="dpdp-list">
          <li>
            <strong>Withdraw consent:</strong> you can withdraw at any time, as easily as you gave it. Withdrawal stops any
            further processing but does not affect processing already done.{" "}
            {isTEE
              ? <>To withdraw, use <strong>Withdraw consent</strong> next to this contract on your Contracts to Sign page; no further run will start on it.</>
              : GRIEVANCE_EMAIL
              ? <>To withdraw, email <a href={`mailto:${GRIEVANCE_EMAIL}?subject=Withdraw consent: ${contract.contract_id}`}>{GRIEVANCE_EMAIL}</a> quoting the contract ID.</>
              : <Missing>Withdrawal contact not configured.</Missing>}
          </li>
          {/* Hidden for now:
          <li>
            <strong>Access, correction and erasure:</strong> you can ask what data was processed, and ask for it to be corrected or erased.{" "}
            {GRIEVANCE_EMAIL ? <>Contact <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>.</> : <Missing>Grievance contact not configured.</Missing>}
          </li>
          */}
        </ul>
      </Section>

      {onAcknowledge ? (
        <label className="dpdp-ack">
          <input type="checkbox" checked={Boolean(acknowledged)} onChange={e => onAcknowledge(e.target.checked)} />
          <span>I have read this notice and understand what data will be processed, for what purpose, and how I can withdraw consent.</span>
        </label>
      ) : null}
      {beforeSave || null}
      {onAcknowledge && onSave ? (
        <button type="button" className="btn btn-primary" style={{ width: "auto", marginTop: 12, marginRight: 8 }} disabled={!acknowledged} onClick={onSave}>
          Save
        </button>
      ) : null}

      <button type="button" className="btn btn-secondary" style={{ width: "auto", marginTop: 12 }} onClick={() => setShowRaw(v => !v)}>
        {showRaw ? "Hide technical contract JSON" : "View technical contract JSON"}
      </button>
      {showRaw ? <pre className="cpm-raw">{JSON.stringify(contract, null, 2)}</pre> : null}
    </div>
  );
}
