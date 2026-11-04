import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { notifyProviders, checkFlDatasets, getNotificationResponses, notifyRoster, getMyNotifications, queueFlSession, getSessionContractSignatures, getRemovedProviders, getMyProjects } from '../api/auth';
import ContractSignatureStatus from '../components/ContractSignatureStatus';
import { getFlOutput, collectFlOutput } from '../api/flOutput';
import { outputTeaser } from '../components/fl/flOutputFormat';
import { submitOutputOwnerForm } from '../api/apd';

// Send Output Owner details to APD (the store of record for FL forms)
function submitOutputOwnerToGovernance(payload, token) {
  return submitOutputOwnerForm(payload, token);
}

// Fetch the rendered client_config.yaml (output-owner IP in MQTT broker_host +
// gRPC host) from the governance layer over HTTP.
// Returns { ok:true, text } or { ok:false, message }.
async function fetchClientConfig(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const j = await res.json(); message = j.message || j.error || message; } catch { /* not JSON */ }
    return { ok: false, message };
  }
  return { ok: true, text: await res.text() };
}

// Trigger a browser download of the given text as a file.
function triggerBlobDownload(text, filename) {
  const blob = new Blob([text], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Derive the pending/willing/declined status for a notified provider from
// their latest participation response. Shared by the "Selected Data-Providers"
// panel and the provider checklist so both render identical badges.
// A provider removed from the session (declined to participate a second
// time) shows as Removed regardless of their last response.
function providerStatus(providerResponse, removed) {
  if (removed) {
    return { key: 'removed', label: 'Removed' };
  }
  if (providerResponse?.response === 'accepted') {
    return { key: 'willing', label: 'Willing' };
  }
  if (providerResponse?.response === 'declined') {
    return { key: 'declined', label: 'Not willing' };
  }
  return { key: 'pending', label: 'Pending' };
}

// Two-letter avatar initials from a username.
function initials(name) {
  return (name || '').slice(0, 2).toUpperCase();
}

// Same section-header icon treatment as PolicyForm.jsx/InfraPolicyForm.jsx
// (plain inline SVG, one shared stroke style, no icon library) — applied to
// the two forms below so they read as the same product as the dataset/infra
// policy forms, instead of one flat field grid. Duplicated locally since
// neither file exports these and no shared utils module exists in src.
const ICON_PROPS = { viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' };
function IconTag() {
  return <svg {...ICON_PROPS}><path d="M4 4h6l7 7-6 6-7-7V4Z" /><circle cx="7.4" cy="7.4" r="1.1" fill="currentColor" stroke="none" /></svg>;
}
function IconSliders() {
  return (
    <svg {...ICON_PROPS}>
      <line x1="4" y1="17" x2="4" y2="11" /><line x1="4" y1="7" x2="4" y2="3" />
      <line x1="10" y1="17" x2="10" y2="9" /><line x1="10" y1="5" x2="10" y2="3" />
      <line x1="16" y1="17" x2="16" y2="13" /><line x1="16" y1="9" x2="16" y2="3" />
    </svg>
  );
}
function IconCpu() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="6" y="6" width="8" height="8" rx="1" />
      <path d="M8 3v3M12 3v3M8 14v3M12 14v3M3 8h3M3 12h3M14 8h3M14 12h3" />
    </svg>
  );
}

// Auto-generated Form ID: fl-<YYYYMMDD>-<8-char base36>, via crypto.getRandomValues
// with rejection sampling (avoids modulo bias mapping bytes onto the 36-char alphabet).
// Mirrors generateDatasetId() in PolicyForm.jsx; duplicated locally since no shared
// utils module exists in src.
function generateFormId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  const limit = 256 - (256 % alphabet.length);
  let suffix = '';
  const buf = new Uint8Array(1);
  while (suffix.length < 8) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) {
      suffix += alphabet[buf[0] % alphabet.length];
    }
  }
  return `fl-${datePart}-${suffix}`;
}

const FL_OUTPUT_POLL_MS = 15000;
// How often to re-check whether the session has a contract yet (the output
// endpoint answers 404 until it does).
const FL_CONTRACT_CHECK_MS = 60000;

// "FL output" card for the Output Owner. Polls gov_layer for the session's
// output (pulled from the server VM when training finishes) until it's ready,
// pausing while the tab is hidden; "View output" opens pages/FlOutput.jsx.
// Keyed by submissionId at the call site, so a new session starts fresh.
// A brand-new form has no contract yet, so nothing is polled until the
// session shows up in the owner's projects (a project row is recorded with
// every contract); recheckKey (e.g. the Final Roster being sent) re-checks.
function FlOutputSection({ submissionId, token, sessionName, recheckKey }) {
  const navigate = useNavigate();
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState(null);
  // null = checking; false = no contract yet; true = poll the output.
  const [hasContract, setHasContract] = useState(null);
  // Set when the output endpoint said 404: re-check on the slow timer only.
  const sawNotFound = useRef(false);

  useEffect(() => {
    if (hasContract) return undefined;
    let cancelled = false;
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await getMyProjects(sessionStorage.getItem('access_token') || token);
        const found = (res?.projects || []).some((p) => p.session_id === submissionId);
        if (!cancelled) setHasContract(found);
      } catch {
        // Can't tell - fall back to asking the output endpoint directly.
        if (!cancelled) setHasContract(true);
      }
    };
    if (!sawNotFound.current) check();
    sawNotFound.current = false;
    const timer = setInterval(check, FL_CONTRACT_CHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [submissionId, token, recheckKey, hasContract]);

  useEffect(() => {
    if (!hasContract) return undefined;
    let cancelled = false;
    let stopped = false;
    let timer = null;
    const stop = () => { stopped = true; clearInterval(timer); };
    const load = async () => {
      if (stopped || document.hidden) return;
      try {
        const data = await getFlOutput(submissionId, sessionStorage.getItem('access_token') || token);
        if (cancelled) return;
        setOutput(data);
        setError(null);
        if (data?.status === 'ready') {
          setCollecting(false);
          stop();
        }
      } catch (err) {
        if (cancelled) return;
        if (err.statusCode === 404) {
          // No contract (yet): not an error, just nothing to show so far.
          setError(null);
          setOutput(null);
          sawNotFound.current = true;
          setHasContract(false);
          stop();
          return;
        }
        setError(err);
        // Not the owner - polling won't change that.
        if (err.statusCode === 403) stop();
      }
    };
    load();
    timer = setInterval(load, FL_OUTPUT_POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [submissionId, token, hasContract]);

  const handleCollect = async () => {
    setCollectError(null);
    setCollecting(true);
    try {
      await collectFlOutput(submissionId, sessionStorage.getItem('access_token') || token);
    } catch (err) {
      setCollecting(false);
      setCollectError(err.message || 'Failed to start output collection');
    }
  };

  const ready = output?.status === 'ready';

  return (
    <div className="fl-section">
      <div className="fl-section-header">
        <div className="fl-section-header-text">
          <h3 className="section-title"><span className="fl-section-icon">&#9670;</span>FL output</h3>
          <span className="fl-section-sub">The final global model and per-round metrics from this session's server VM</span>
        </div>
      </div>

      {hasContract === false ? (
        <div className="fl-section-sub">
          Not available yet &mdash; the output appears here once the FL session has run.
        </div>
      ) : error ? (
        <div className="fl-result-banner fl-result-banner--error" role="alert" style={{ marginTop: 0 }}>
          &#9888; {error.message}
        </div>
      ) : !output ? (
        <div className="fl-section-sub">Checking for session output&hellip;</div>
      ) : ready ? (
        <>
          <div className="fl-result-banner fl-result-banner--ok" style={{ marginTop: 0 }}>
            Session complete
            {outputTeaser(output) && (
              <div style={{ fontWeight: 400, marginTop: '2px' }}>{outputTeaser(output)}</div>
            )}
          </div>
          <div className="fl-action-row" style={{ marginTop: '12px' }}>
            <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate(`output/${encodeURIComponent(submissionId)}`, { state: { sessionName } })}>
              View output
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="fl-section-sub">
            Output not collected yet &mdash; it&rsquo;s pulled from the server VM automatically when training finishes.
          </div>
          <div className="fl-action-row" style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: 'auto' }}
              onClick={handleCollect}
              disabled={collecting}
              aria-busy={collecting}
            >
              {collecting ? 'Collecting from server VM\u2026' : 'Fetch output'}
            </button>
          </div>
          {collectError && (
            <div className="fl-result-banner fl-result-banner--error" role="alert">&#9888; {collectError}</div>
          )}
        </>
      )}

    </div>
  );
}

export default function FederatedLearning() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Check user roles
  const roles = user?.roles || [];
  const isDataProvider = roles.includes('provider');
  // No separate "output-owner" role to request/approve - any logged-in user
  // who isn't a data-provider gets the full owner workflow (provider
  // selection, final model, report download).
  const isOutputOwner = !isDataProvider;
  const canSeeOutputOwnerForm = isOutputOwner;


  // Output Owner form state
  // form_id is minted once per form mount via this lazy initializer: unique per
  // FL session so submissions/sessions never share an id, yet fixed while the
  // form is open so step 2's re-submit still upserts the same submission.
  const [formData, setFormData] = useState(() => ({
    form_id: generateFormId(),
    requested_by: user?.username || 'admin-uuid-001',
    output_owner_id: user?.username || '',
    num_server_rounds: 10,
    fraction_evaluate: 0.5,
    local_epochs: 1,
    learning_rate: 0.01,
    batch_size: 32,
    model: 'AlexNet',
    framework: 'flwrlabs',
    components: '',
    min_vcpus: '',
  }));
  const [msg, setMsg] = useState(null);
  // Persist the last submission id so the report stays downloadable after a page reload.
  const [reportSubmissionId, setReportSubmissionId] = useState(
    () => sessionStorage.getItem('last_report_submission_id') || null
  );

  // "Send config to data providers" popup state (shown after a successful submit).
  const [showDistribute, setShowDistribute] = useState(false);
  // Independent in-flight flags so the three actions don't disable each other.
  const [downloading, setDownloading] = useState(false);
  const [distributeResult, setDistributeResult] = useState(null);
  // Data-provider "download my client config" status.
  const [dpConfigMsg, setDpConfigMsg] = useState(null);

  // Step tracking for federated learning flow (only for output owners). The owner
  // fills + submits the configuration first ('form'), then selects the data
  // providers to invite ('provider-selection').
  const [currentStep, setCurrentStep] = useState('form'); // 'form', then 'provider-selection'

  // Data providers from Keycloak
  // The owner picks datasets (not providers) in the Catalogue
  // (WorkloadForm.jsx, FL mode), which hands them over as flDatasets; each
  // brings in the data provider who uploaded it, who is asked to take part
  // when the configuration is submitted.
  const [selectedDatasets, setSelectedDatasets] = useState(() => location.state?.flDatasets || []);
  // Each selected provider's participation response so far, keyed by
  // username: { response: 'accepted' | 'declined', message }. Read back from
  // this owner's previously-sent notifications so the selection list shows
  // live willing/not-willing status next to each provider.
  const [providerResponses, setProviderResponses] = useState({});
  // Providers removed from this session for declining to participate a
  // second time, keyed by username -> { reason, removed_at }. They can't be
  // selected, messaged again or put on the Final Roster.
  const [removedProviders, setRemovedProviders] = useState({});
  // Providers who've completed their Azure sign-in for the started FL
  // session, keyed by username -> ISO timestamp first seen. Read back from
  // this owner's own notification inbox (each provider posts one on sign-in).
  const [azureSignIns, setAzureSignIns] = useState({});
  // Picked datasets that failed the configuration check on the last Send
  // Message (gov_layer check-datasets): [{dataset_name, reason, ...}].
  const [mismatchedDatasets, setMismatchedDatasets] = useState([]);
  // ...and the ones that fit, whose providers were invited.
  const [matchingDatasets, setMatchingDatasets] = useState([]);
  // Providers that have actually been notified via "Send Message" so far -
  // this is what the "Selected Data-Providers" panel shows (pending until
  // they respond), decoupled from the live checkbox selection so it survives
  // Clear All / Invite (which resets the checkboxes).
  const [notifiedProviders, setNotifiedProviders] = useState([]);
  // "Final Roster" - announcing the confirmed participants, in flight flag.
  const [sendingRoster, setSendingRoster] = useState(false);
  // Gates "Start FL Session" - only unlocked once the owner has sent the
  // final roster announcement to the confirmed participants.
  const [finalRosterSent, setFinalRosterSent] = useState(false);
  // Also gates "Start FL Session": every data provider on the final roster
  // contract must have signed its hash (polled from the governance layer).
  const [contractAllSigned, setContractAllSigned] = useState(false);
  // The exact roster (id/username/email) sent as the final participant list -
  // kept around so "Start FL Session" can notify the same providers without
  // re-deriving the willing list.
  const [finalRoster, setFinalRoster] = useState([]);

  // The owner's Min vCPUs required (on the configuration form). Send Message
  // checks the picked datasets against it via gov_layer, which tells both
  // sides when a dataset's provider has fewer vCPUs than that.
  const ownerMinVcpus = Number(formData.min_vcpus);
  const ownerMinVcpusValid = formData.min_vcpus !== '' && formData.min_vcpus != null && Number.isFinite(ownerMinVcpus) && ownerMinVcpus >= 1;
  // A picked dataset stays in the selection unless its provider was removed
  // from the session.
  const datasetSelectable = (d) => !removedProviders[d?.provider?.username];

  // Re-read this owner's previously-sent notifications and pull out each
  // recipient's latest willing/not-willing response (with reason), so the
  // provider-selection list can show live status next to each provider.
  const fetchProviderResponses = useCallback(async () => {
    const freshToken = sessionStorage.getItem('access_token') || token;
    if (!freshToken) return;
    try {
      const res = await getNotificationResponses(freshToken);
      const sent = Array.isArray(res.notifications) ? res.notifications : [];
      const map = {};
      sent
        .filter(n => {
          const payload = typeof n.payload === 'string' ? JSON.parse(n.payload || '{}') : (n.payload || {});
          // Only actual consent requests carry a real accept/decline status.
          // "final_roster" is a one-way done-deal announcement (never has a
          // response) - including it here would let it override a genuine
          // accepted answer and flip the badge back to pending.
          // participation_update (the updated list sent after a removal) is
          // answerable too, so it counts as the provider's latest invite.
          if (payload.kind && payload.kind !== 'participation_request' && payload.kind !== 'participation_update') return false;
          return !reportSubmissionId || payload.submission_id === reportSubmissionId;
        })
        .forEach(n => {
          // Newest-first, so the FIRST notification seen per recipient is their
          // most recent invite for this session - whether or not it's been
          // answered yet. A stale "accepted" from an earlier invite must not
          // leak through once a newer, unanswered invite has been sent.
          if (!(n.recipient_username in map)) {
            map[n.recipient_username] = n.response
              ? { response: n.response, message: n.response_message }
              : null;
          }
        });
      setProviderResponses(map);
      if (reportSubmissionId) {
        const removed = await getRemovedProviders(reportSubmissionId, freshToken);
        const byName = {};
        removed.forEach(r => { byName[r.username] = r; });
        setRemovedProviders(byName);
      }
    } catch (err) {
      console.warn('[DEBUG] Failed to load provider responses:', err);
    }
  }, [token, reportSubmissionId]);

  // Pull this owner's own notification inbox for "azure_signin" notices -
  // one posted by each provider as soon as they finish signing in to Azure
  // for this session - so the live status shows up here without a refresh.
  const fetchAzureSignIns = useCallback(async () => {
    const freshToken = sessionStorage.getItem('access_token') || token;
    if (!freshToken) return;
    try {
      const res = await getMyNotifications(freshToken);
      const mine = Array.isArray(res.notifications) ? res.notifications : [];
      setAzureSignIns(prev => {
        const next = { ...prev };
        mine.forEach(n => {
          const payload = typeof n.payload === 'string' ? JSON.parse(n.payload || '{}') : (n.payload || {});
          if (payload.kind !== 'azure_signin') return;
          if (reportSubmissionId && payload.submission_id !== reportSubmissionId) return;
          const who = payload.provider_username || n.sender_username;
          if (who && !next[who]) next[who] = n.created_at || new Date().toISOString();
        });
        return next;
      });
    } catch (err) {
      console.warn('[DEBUG] Failed to load Azure sign-ins:', err);
    }
  }, [token, reportSubmissionId]);

  // Pull responses whenever the owner enters the invite step.
  useEffect(() => {
    if (token && currentStep === 'provider-selection') {
      fetchProviderResponses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentStep]);

  // While the owner is on the invite step, poll so responses stay live
  // without a manual Refresh.
  useEffect(() => {
    if (!token || currentStep !== 'provider-selection') return;
    const h = setInterval(fetchProviderResponses, 6000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentStep]);

  // Once the FL session has been started, poll for providers' "signed in to
  // Azure" notices so the owner sees them live without a manual refresh.
  useEffect(() => {
    if (!token || !distributeResult?.ok) return;
    fetchAzureSignIns();
    const h = setInterval(fetchAzureSignIns, 5000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, distributeResult?.ok]);

  // Drop any selected datasets whose provider was removed from the session.
  useEffect(() => {
    setSelectedDatasets(prev => prev.filter(datasetSelectable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removedProviders]);

  // Build the Output Owner governance payload from the current form, with the
  // given selected providers (empty on the first, config-only submit).
  function buildOwnerPayload(selected) {
    const compRaw = formData.components || '';
    const comps = {};
    compRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
      const kv = pair.split('=');
      if (kv.length === 2) comps[kv[0].trim()] = kv[1].trim();
    });
    return {
      form_id: formData.form_id,
      requested_by: formData.requested_by,
      output_owner_id: formData.output_owner_id,
      num_server_rounds: Number(formData.num_server_rounds),
      fraction_evaluate: Number(formData.fraction_evaluate),
      local_epochs: Number(formData.local_epochs),
      learning_rate: Number(formData.learning_rate),
      batch_size: Number(formData.batch_size),
      model: formData.model || undefined,
      framework: formData.framework || undefined,
      components: Object.keys(comps).length ? comps : undefined,
      selected_providers: selected.map(p => p.username),
      filled: true,
      requested_at: new Date().toISOString(),
      filled_at: new Date().toISOString(),
    };
  }

  // Step 1: submit the Output Owner configuration to the governance layer (no
  // providers yet), then advance to provider selection. Upserts on form_id, so
  // step 2 updates this same submission with the chosen providers.
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const freshToken = sessionStorage.getItem("access_token") || token;

    try {
      const governanceRes = await submitOutputOwnerToGovernance(buildOwnerPayload([]), freshToken);
      console.log('[DEBUG] Governance response (config submit):', governanceRes);

      const govSuccess = governanceRes.status?.toLowerCase() === 'success';
      if (!govSuccess) {
        setMsg({ type: 'error', text: `Governance: ${governanceRes.message || governanceRes.error || 'Failed'}` });
        return;
      }

      setReportSubmissionId(governanceRes.submission_id);
      if (governanceRes.submission_id) {
        sessionStorage.setItem('last_report_submission_id', governanceRes.submission_id);
      }
      // Provider selection (and the rest of the owner workflow) is reserved for
      // the actual output-owner role - a no-role user's submission just confirms
      // here and stays on the plain form.
      if (isOutputOwner) {
        // The participation request goes to the selected datasets' providers
        // straight away (handleSendMessage sets the status message).
        setCurrentStep('provider-selection');
        await handleSendMessage(governanceRes.submission_id);
      } else {
        setMsg({ type: 'success', text: 'Configuration submitted.' });
      }
    } catch (err) {
      console.error('[DEBUG] Config submit error:', err);
      setMsg({ type: 'error', text: err.message });
    }
  };

  // "Send Message": notify only the providers currently checked in "Select
  // Participating Data Providers". The message tells each of them the selected
  // roster plus who among them has already responded "willing" (accepted),
  // read back from this owner's previously-sent notifications so repeat sends
  // show live status.
  const handleSendMessage = async (submissionId = reportSubmissionId) => {
    if (selectedDatasets.length === 0) {
      setMsg({ type: 'error', text: 'Select at least one dataset before sending a message.' });
      return;
    }
    if (!ownerMinVcpusValid) {
      setMsg({ type: 'error', text: 'Set Min vCPUs required in your configuration before sending a message.' });
      return;
    }
    const freshToken = sessionStorage.getItem('access_token') || token;
    try {
      // Check the picks against the configuration first: gov_layer tells each
      // out-of-constraint dataset's provider, and only matching datasets'
      // providers get the participation request.
      const check = await checkFlDatasets(submissionId, ownerMinVcpus, selectedDatasets.map(d => d.dataset_id), freshToken);
      const mismatched = check.mismatched || [];
      setMismatchedDatasets(mismatched);
      setMatchingDatasets(check.matching || []);
      const matchingProviders = [];
      (check.matching || []).forEach(d => {
        if (d.provider?.id && !matchingProviders.find(p => p.id === d.provider.id)) matchingProviders.push(d.provider);
      });
      const mismatchNote = mismatched.length
        ? ` ${mismatched.map(d => d.dataset_name).join(', ')} ${mismatched.length === 1 ? 'is' : 'are'} below the minimum vCPUs - ${mismatched.length === 1 ? 'its provider has' : 'their providers have'} been told.`
        : '';
      if (matchingProviders.length === 0) {
        setMsg({ type: 'error', text: `No selected dataset meets the minimum vCPUs - nothing sent.${mismatchNote}` });
        return;
      }
      const selectedPayload = matchingProviders.map(p => ({
        id: p.id,
        username: p.username,
        email: p.email,
        dataset_name: (check.matching || []).filter(d => d.provider?.id === p.id).map(d => d.dataset_name).join(', ') || undefined,
      }));

      let willingProviders = [];
      try {
        const responsesRes = await getNotificationResponses(freshToken);
        const sent = Array.isArray(responsesRes.notifications) ? responsesRes.notifications : [];
        const willingUsernames = new Set(
          sent
            .filter(n => n.response === 'accepted')
            .filter(n => {
              const payload = typeof n.payload === 'string' ? JSON.parse(n.payload || '{}') : (n.payload || {});
              return !submissionId || payload.submission_id === submissionId;
            })
            .map(n => n.recipient_username)
        );
        willingProviders = selectedPayload.filter(p => willingUsernames.has(p.username));
      } catch (err) {
        console.warn('[DEBUG] Failed to load prior responses, sending without willing list:', err);
      }

      await notifyProviders(selectedPayload, selectedPayload, formData.output_owner_id, submissionId, freshToken, willingProviders, ownerMinVcpus);

      // Add the just-notified providers to the "Selected Data-Providers" panel
      // (dedup by id so re-sending doesn't create duplicates).
      setNotifiedProviders(prev => {
        const next = [...prev];
        matchingProviders.forEach(p => {
          if (!next.find(np => np.id === p.id)) next.push(p);
        });
        return next;
      });

      setMsg({
        type: 'success',
        text: `Message sent to ${selectedPayload.length} selected provider(s) - ${willingProviders.length} willing so far.${mismatchNote}`,
      });
    } catch (err) {
      console.error('[DEBUG] Send message error:', err);
      setMsg({ type: 'error', text: err.message });
    }
  };

  // "Final Roster": once providers have weighed in, announce the confirmed
  // participant list - only those who responded "willing" so far - to those
  // same willing providers. A done-deal notice, not another accept/decline ask.
  const handleSendFinalRoster = async () => {
    const willing = notifiedProviders.filter(p => !removedProviders[p.username] && providerResponses[p.username]?.response === 'accepted');
    if (willing.length === 0) {
      setMsg({ type: 'error', text: 'No data provider has confirmed willing yet - nothing to send.' });
      return;
    }
    const freshToken = sessionStorage.getItem('access_token') || token;
    setSendingRoster(true);
    try {
      const willingPayload = willing.map(p => ({ id: p.id, username: p.username, email: p.email }));
      const selectedPayload = notifiedProviders
        .filter(p => !removedProviders[p.username])
        .map(p => ({ id: p.id, username: p.username, email: p.email }));
      const res = await notifyRoster(selectedPayload, willingPayload, formData.output_owner_id, reportSubmissionId, freshToken);
      setFinalRosterSent(true);
      setFinalRoster(willingPayload);
      const contractNote = res?.contract_id
        ? ` Contract ${res.contract_id} generated from APD provider forms.`
        : res?.contract_error
          ? ` (Contract generation failed: ${res.contract_error})`
          : '';
      setMsg({
        type: 'success',
        text: `Final roster sent - ${willingPayload.length} participating provider(s) notified: ${willing.map(p => p.username).join(', ')}.${contractNote}`,
      });
    } catch (err) {
      console.error('[DEBUG] Final roster error:', err);
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSendingRoster(false);
    }
  };

  // Owner-side: download/preview the rendered config (output-owner IP in MQTT
  // broker_host + gRPC host) that the selected providers will pull.
  const handleDownloadConfig = async () => {
    const id = reportSubmissionId || sessionStorage.getItem('last_report_submission_id');
    if (!id) {
      setDistributeResult({ ok: false, text: 'No submission found. Submit the request first.' });
      return;
    }
    const freshToken = sessionStorage.getItem('access_token') || token;
    setDownloading(true);
    setDistributeResult(null);
    const r = await fetchClientConfig(`/api/v1/client-config/by-submission/${encodeURIComponent(id)}`, freshToken);
    if (r.ok) {
      triggerBlobDownload(r.text, 'client_config.yaml');
      setDistributeResult({ ok: true, text: 'Config downloaded. Selected providers can pull the same file from their Federated Learning page.' });
    } else {
      setDistributeResult({ ok: false, text: r.message });
    }
    setDownloading(false);
  };

  // Owner-side: just queues the request - no Azure sign-in, no popup, no
  // navigation here. The fl-orchestrator operator account picks this up from
  // their own /app/orchestrator queue (pages/fl_orchestrator/FL_Orchestrator.jsx) and does
  // the actual Azure sign-in + start-fl-session + VM provisioning from there.
  const handleStartFlSession = async () => {
    const id = reportSubmissionId || sessionStorage.getItem('last_report_submission_id');
    if (!id) {
      setDistributeResult({ ok: false, text: 'No submission found. Submit the request first.' });
      return;
    }

    const freshToken = sessionStorage.getItem('access_token') || token;
    try {
      await queueFlSession(id, finalRoster, freshToken);
      setDistributeResult({
        ok: true,
        text: 'Start FL Session requested — the platform will start it shortly. This can take some time.',
      });
    } catch (e) {
      setDistributeResult({ ok: false, text: `Failed to request FL session start: ${e.message}` });
    }
  };

  // Data-provider side: pull this provider's own client config from the gov layer.
  const downloadMyConfig = async () => {
    const freshToken = sessionStorage.getItem('access_token') || token;
    setDpConfigMsg(null);
    const r = await fetchClientConfig(`/api/v1/client-config/${encodeURIComponent(user?.username || '')}`, freshToken);
    if (r.ok) {
      triggerBlobDownload(r.text, 'client_config.yaml');
      setDpConfigMsg({ type: 'success', text: 'Client config downloaded - MQTT broker host & gRPC host point to the output owner.' });
    } else {
      setDpConfigMsg({ type: 'error', text: r.message });
    }
  };

  return (
    <div>
      {/* Send-config popup - appears after a successful FL request submission. */}
      {showDistribute && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Send configuration to data providers</div>
            </div>
            <div className="modal-body">
              The client config is ready with your IP in the
              <strong> MQTT broker host</strong> &amp; <strong>gRPC host</strong>.
              <strong> Send to Providers</strong> pushes it over HTTP to each selected provider
              (to the IP &amp; Port from their registration form) and updates their client_config.yaml.
              Or download the exact file to inspect it.
              {distributeResult && (
                <div className={`fl-result-banner ${distributeResult.ok ? 'fl-result-banner--ok' : 'fl-result-banner--error'}`}>
                  {distributeResult.text}
                  {distributeResult.details && distributeResult.details.length > 0 && (
                    <ul>
                      {distributeResult.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowDistribute(false)} disabled={downloading}>
                Close
              </button>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleDownloadConfig} disabled={downloading}>
                {downloading ? 'Working...' : 'Download Config (YAML)'}
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto' }}
                onClick={handleStartFlSession}
                disabled={!contractAllSigned}
                title={contractAllSigned ? undefined : 'Every data provider must sign the final roster contract first'}
              >
                Start FL Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            <span className="fl-section-icon">&#9889;</span>Federated Learning
          </h3>
          <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>
            Configure federated learning parameters and select data providers
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        {msg && (
          <div
            className={msg.type === 'success' ? 'fl-result-banner fl-result-banner--ok' : 'fl-result-banner fl-result-banner--error'}
            style={{ marginTop: 0, marginBottom: '18px' }}
          >
            {msg.text}
          </div>
        )}

        {/* Report download - available any time a session has been submitted.
            The report is persisted in the governance DB, so it survives page reloads. */}
        {isOutputOwner && reportSubmissionId && (
          <div style={{ marginBottom: '4px' }}>
            <a
              href={`/api/v1/form-submissions/${reportSubmissionId}/report`}
              download={`fl_session_${reportSubmissionId}.json`}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}
            >
              Download Selected Providers Report (JSON)
            </a>
          </div>
        )}

        {/* FL output - final global model + per-round metrics, pulled from the
            server VM when training finishes. "View output" opens its own page. */}
        {isOutputOwner && reportSubmissionId && (
          <FlOutputSection
            key={reportSubmissionId}
            submissionId={reportSubmissionId}
            token={token}
            sessionName={formData.model || undefined}
            recheckKey={finalRosterSent}
          />
        )}

        {/* Data Provider View */}
        {isDataProvider && !isOutputOwner && (
          <div className="fl-section">
            <div className="fl-section-header">
              <div className="fl-section-header-text">
                <h3 className="section-title"><span className="fl-section-icon">&#9671;</span>Data Provider Form</h3>
                <span className="fl-section-sub">Register your dataset so output owners can find and invite you</span>
              </div>
            </div>
            {/* The FL-only form is gone: Upload Dataset (PolicyForm.jsx) is now the
                single data-provider form for every service, and also registers
                these FL compute/network details with APD. */}
            <div className="form-section">
              <div className="fl-footnote" style={{ marginBottom: '12px' }}>
                Your dataset, access policy and compute/network details are registered once on the Upload Dataset page, shared by every service.
              </div>
              <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/app/services/policies', { state: { returnTo: '/app/services/fl/federated-learning' } })}>
                Upload Dataset
              </button>
            </div>

            <div className="fl-section">
              <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={downloadMyConfig}>
                Download My Client Config (YAML)
              </button>
              {dpConfigMsg && (
                <div className={dpConfigMsg.type === 'success' ? 'fl-result-banner fl-result-banner--ok' : 'fl-result-banner fl-result-banner--error'}>
                  {dpConfigMsg.text}
                </div>
              )}
              <div className="fl-footnote">
                Available once an output owner has selected you in a session.
              </div>
            </div>
          </div>
        )}

        {/* Output Owner View - Provider Selection */}
        {isOutputOwner && currentStep === 'provider-selection' && (
          <div className="fl-section">
            <div className="fl-section-header">
              <div className="fl-section-header-text">
                <h3 className="section-title"><span className="fl-section-icon">&#9993;</span>Messages</h3>
                <span className="fl-section-sub">Who can and can't take part in this session - updates on its own</span>
              </div>
            </div>
            {notifiedProviders.length === 0 && mismatchedDatasets.length === 0 ? (
              <div className="fl-empty">
                Submitting the configuration asks the providers of your selected datasets to take part.
              </div>
            ) : (
              <>
                {notifiedProviders.length > 0 && (
                  <>
                    <div className="fl-section-sub" style={{ margin: '4px 0 8px', fontWeight: 700 }}>&#10003; Can take part</div>
                    <div className="fl-provider-list">
                      {notifiedProviders.map(provider => {
                        const providerResponse = providerResponses[provider.username];
                        const removal = removedProviders[provider.username];
                        const status = providerStatus(providerResponse, removal);
                        const names = matchingDatasets.filter(d => d.provider?.id === provider.id).map(d => d.dataset_name);
                        return (
                          <div key={provider.id} className={`fl-provider-card fl-provider-card--${status.key}`}>
                            <div className="fl-provider-identity">
                              <div className="fl-provider-avatar">{initials(names[0] || provider.username)}</div>
                              <div>
                                <div className="fl-provider-name">{names.length ? names.join(', ') : provider.username}</div>
                                <div className="fl-provider-email">Provided by {provider.username}{provider.email ? ` (${provider.email})` : ''}</div>
                                {status.key === 'declined' && providerResponse?.message && (
                                  <div className="fl-decline-reason"><strong>Reason:</strong> {providerResponse.message}</div>
                                )}
                                {status.key === 'removed' && (
                                  <div className="fl-decline-reason">
                                    Declined a second time - removed from this session.
                                    {removal.reason && <> <strong>Reason:</strong> {removal.reason}</>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className={`fl-status-badge fl-status-badge--${status.key}`}>
                              <span className="fl-status-dot" />{status.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {mismatchedDatasets.length > 0 && (
                  <div className="fl-result-banner fl-result-banner--error" style={{ marginBottom: '12px' }}>
                    &#10007; Can't take part - not under the constraint (their providers have been told):
                    <ul style={{ margin: '6px 0 0 18px' }}>
                      {mismatchedDatasets.map(d => (
                        <li key={d.dataset_id}><strong>{d.dataset_name}</strong> ({d.provider?.username}) - {d.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <div className="fl-section">
              <div className="fl-action-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendFinalRoster}
                  disabled={sendingRoster || finalRosterSent || notifiedProviders.every(p => removedProviders[p.username] || providerResponses[p.username]?.response !== 'accepted')}
                  style={{ width: 'auto' }}
                  title="Send the final list to everyone who said yes; the contract is then generated and sent to them to sign"
                >
                  {sendingRoster ? 'Sending...' : finalRosterSent ? 'Final Roster Sent' : 'Final Roster'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartFlSession}
                  disabled={!reportSubmissionId || !finalRosterSent || !contractAllSigned}
                  style={{ width: 'auto' }}
                  title={!finalRosterSent
                    ? 'Send the Final Roster first to unlock this'
                    : !contractAllSigned
                    ? 'Every data provider must sign the final roster contract first'
                    : "Provision and launch the FL server + selected providers' clients for this submission"}
                >
                  Start FL Session
                </button>
              </div>
              <div className="fl-footnote">
                The request to take part went to your selected datasets' providers when you
                submitted the configuration. Once they've replied, send the Final Roster: the
                session contract is then generated and sent to everyone who said yes to sign.
                "Start FL Session" unlocks when every signature is verified.
              </div>
              {reportSubmissionId && finalRosterSent && (
                <ContractSignatureStatus
                  key={`${reportSubmissionId}:${finalRosterSent}`}
                  pollKey={`${reportSubmissionId}:${finalRosterSent}`}
                  fetchStatus={() => getSessionContractSignatures(reportSubmissionId, sessionStorage.getItem('access_token') || token)}
                  onStatus={(s) => setContractAllSigned(s?.tee === "can run")}
                  blockedText="The FL session can't start until every data provider has signed the final roster contract."
                />
              )}
              {distributeResult && (
                <div className={`fl-result-banner ${distributeResult.ok ? 'fl-result-banner--ok' : 'fl-result-banner--error'}`}>
                  {distributeResult.text}
                  {distributeResult.details && distributeResult.details.length > 0 && (
                    <ul>
                      {distributeResult.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </div>
              )}
              {Object.keys(azureSignIns).length > 0 && (
                <div className="fl-result-banner fl-result-banner--ok" style={{ marginTop: '10px' }}>
                  <strong>Signed in to Azure:</strong>
                  <ul>
                    {Object.entries(azureSignIns).map(([username, at]) => (
                      <li key={username}>{username} — {new Date(at).toLocaleTimeString()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Output Owner View - Configuration Form */}
        {canSeeOutputOwnerForm && currentStep === 'form' && (
          <div className="fl-section">
            <div className="fl-section-header">
              <div className="fl-section-header-text">
                <h3 className="section-title"><span className="fl-section-icon">&#9881;</span>Federated Learning Configuration</h3>
                <span className="fl-section-sub">
                  {isOutputOwner
                    ? "Step 1 of 2 - fill in and submit your FL configuration. You'll select the data providers to invite next."
                    : 'Fill in and submit your FL configuration.'}
                </span>
              </div>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconTag /></div>
                  <div className="form-section-titles">
                    <h4>Session</h4>
                    <span>Identifies this configuration submission</span>
                  </div>
                </div>
                <div className="fl-form-grid">
                  <div className="form-group">
                    <label>Form ID</label>
                    <input className="input" readOnly disabled value={formData.form_id} />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                      Auto-generated
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Output Owner ID</label>
                    <input className="input" value={formData.output_owner_id} onChange={(e) => setFormData({...formData, output_owner_id: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconSliders /></div>
                  <div className="form-section-titles">
                    <h4>Training Parameters</h4>
                    <span>How the federated rounds run</span>
                  </div>
                </div>
                <div className="fl-form-grid">
                  <div className="form-group">
                    <label>Number of Server Rounds</label>
                    <input className="input" type="number" required min="1" max="100" step="1" value={formData.num_server_rounds} onChange={(e) => setFormData({...formData, num_server_rounds: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Fraction Evaluate</label>
                    <input className="input" type="number" step="0.1" value={formData.fraction_evaluate} onChange={(e) => setFormData({...formData, fraction_evaluate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Local Epochs</label>
                    <input className="input" type="number" required min="1" max="5" step="1" value={formData.local_epochs} onChange={(e) => setFormData({...formData, local_epochs: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Learning Rate</label>
                    <input className="input" type="number" required min="0.000001" max="1" step="any" value={formData.learning_rate} onChange={(e) => setFormData({...formData, learning_rate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Batch Size</label>
                    <input className="input" type="number" required min="1" max="1024" step="1" value={formData.batch_size} onChange={(e) => setFormData({...formData, batch_size: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Min vCPUs required</label>
                    <input className="input" type="number" min="1" step="1" required value={formData.min_vcpus} onChange={(e) => setFormData({...formData, min_vcpus: e.target.value})} />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                      Data providers with fewer vCPUs than this can't take part.
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconCpu /></div>
                  <div className="form-section-titles">
                    <h4>Model</h4>
                    <span>What gets trained</span>
                  </div>
                </div>
                <div className="fl-form-grid">
                  <div className="form-group">
                    <label>Model</label>
                    <input className="input" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Framework</label>
                    <input className="input" value={formData.framework} onChange={(e) => setFormData({...formData, framework: e.target.value})} />
                  </div>
                  <div className="form-group form-group--wide">
                    <label>Components (comma-separated key=value pairs)</label>
                    <input className="input"
                      value={formData.components}
                      onChange={(e) => setFormData({...formData, components: e.target.value})}
                      placeholder="e.g., param1=value1, param2=value2"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                  {isOutputOwner ? 'Submit Configuration & Select Providers' : 'Submit Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
