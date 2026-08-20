import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BACKEND_URL } from '../config';
import { notifyProviders, getNotificationResponses, notifyRoster } from '../api/auth';

const GOVERNANCE_LAYER_URL = `${BACKEND_URL}/p3dx/form-submissions`;
const DATA_PROVIDER_FORM_URL = `${BACKEND_URL}/p3dx/data-provider-forms`;
const APD_URL = `${BACKEND_URL}/p3dx/form-submissions`;

// Send Output Owner details to Governance Layer
async function submitOutputOwnerToGovernance(payload, token) {
  const res = await fetch(GOVERNANCE_LAYER_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ payload })
  });
  return res.json();
}

// Send selected Data Providers to APD
async function submitSelectedProvidersToAPD(selectedProviders, token) {
  const res = await fetch(APD_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ 
      form_id: 'selected-providers-001',
      payload: {
        selected_data_providers: selectedProviders,
        submitted_at: new Date().toISOString()
      }
    })
  });
  return res.json();
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

// Data Provider form submission to governance layer
async function submitDataProviderFormToBackend(payload, token) {
  const res = await fetch(DATA_PROVIDER_FORM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ payload })
  });
  return res.json();
}

export default function FederatedLearning() {
  const { user, token } = useOutletContext();
  const navigate = useNavigate();

  // Check user roles
  const roles = user?.roles || [];
  const isOutputOwner = roles.includes('output-owner');
  const isDataProvider = roles.includes('data-provider');

  // Data Provider form state
  const [dpFormData, setDpFormData] = useState({
    form_id: 'dataform-001',
    data_owner_id: user?.username || '',
    dataset_name: '',
    RAM: 16,
    ram_usage: '',
    memory_mb: 8192,
    data_size_bytes: '',
    data_resource_id: '',
    ip_address: '',
    port: ''
  });

  // Output Owner form state
  const [formData, setFormData] = useState({
    form_id: 'outputform-001',
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
    ram_usage: '',
    ip_address: '',
    port: ''
  });
  const [msg, setMsg] = useState(null);
  // Persist the last submission id so the report stays downloadable after a page reload.
  const [reportSubmissionId, setReportSubmissionId] = useState(
    () => localStorage.getItem('last_report_submission_id') || null
  );

  // "Send config to data providers" popup state (shown after a successful submit).
  const [showDistribute, setShowDistribute] = useState(false);
  // Independent in-flight flags so the three actions don't disable each other.
  const [downloading, setDownloading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [distributeResult, setDistributeResult] = useState(null);
  // Data-provider "download my client config" status.
  const [dpConfigMsg, setDpConfigMsg] = useState(null);

  // Step tracking for federated learning flow (only for output owners). The owner
  // fills + submits the configuration first ('form'), then selects the data
  // providers to invite ('provider-selection').
  const [currentStep, setCurrentStep] = useState('form'); // 'form', then 'provider-selection'

  // Data providers from Keycloak
  const [dataProviders, setDataProviders] = useState([]);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(null);

  // Participation responses from the providers this owner has notified.
  const [responses, setResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [sendingRoster, setSendingRoster] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  // "Invite Selected Providers" is unlocked only after the final roster is sent.
  const [rosterSent, setRosterSent] = useState(false);
  // Final (highest-round) global model produced by the FL server for the session.
  const [finalModel, setFinalModel] = useState(null);
  const [finalModelLoading, setFinalModelLoading] = useState(false);
  // Readable summary of the final model (layers/shapes/params) â€” shown on "Open".
  const [modelSummary, setModelSummary] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // RAM eligibility: a provider is selectable only when its RAM Usage is <= the
  // output owner's RAM Usage (submitted with the configuration in step 1).
  const ownerRam = Number(formData.ram_usage);
  const ownerRamValid = formData.ram_usage !== '' && formData.ram_usage != null && Number.isFinite(ownerRam);
  const providerEligible = (p) => {
    const v = p?.ram_usage;
    if (!ownerRamValid || v === null || v === undefined || v === '') return false;
    const n = Number(v);
    return Number.isFinite(n) && n <= ownerRam;
  };

  // Latest participation answer per provider, scoped to the CURRENT FL request so
  // a re-login or a new round never shows a previous selection. With no active
  // submission (e.g. right after login) the panel stays empty.
  async function loadResponses(submissionId = reportSubmissionId, silent = false) {
    const freshToken = localStorage.getItem('access_token') || token;
    if (!freshToken || !submissionId) {
      setResponses([]);
      return;
    }
    if (!silent) setResponsesLoading(true);
    try {
      const res = await getNotificationResponses(freshToken);
      // Scope to the providers messaged in the CURRENT round (persisted at send).
      // submission_id is reused across rounds (form_id is reused), so without this
      // gate, answers from earlier rounds and providers not selected this round
      // would leak into the panel (e.g. an old "accepted" showing as Willing).
      let roster = [];
      try { roster = JSON.parse(localStorage.getItem('current_round_roster') || '[]'); } catch { roster = []; }
      const rosterSet = new Set(roster);
      const seen = new Set();
      const latest = [];
      for (const n of res.notifications || []) {
        const payload = typeof n.payload === 'string'
          ? (() => { try { return JSON.parse(n.payload || '{}'); } catch { return {}; } })()
          : (n.payload || {});
        // Only participation REQUESTS carry an accept/decline answer. Roster (and
        // any other) notifications never have a response and, being created after
        // the request, would otherwise mask the real answer in the newest-first
        // dedupe below.
        if (payload.kind !== 'participation_request') continue;
        if (payload.submission_id !== submissionId) continue;   // only this request
        if (!rosterSet.has(n.recipient_username)) continue;      // only this round's selected providers
        if (seen.has(n.recipient_username)) continue;            // notifications are newest-first
        seen.add(n.recipient_username);
        latest.push(n);
      }
      setResponses(latest);
    } catch (err) {
      console.warn('Failed to load participation responses:', err);
    } finally {
      if (!silent) setResponsesLoading(false);
    }
  }

  // Send the final participant roster to the selected providers: who is willing
  // (accepted the request) and who was selected by the owner. Derived from the
  // current participation responses.
  const handleSendRoster = async () => {
    const freshToken = localStorage.getItem('access_token') || token;
    if (!responses.length) {
      setMsg({ type: 'error', text: 'No participants yet â€” invite providers and wait for responses first.' });
      return;
    }
    const selected = responses.map(r => ({ id: r.recipient_id, username: r.recipient_username }));
    const willing = responses
      .filter(r => r.response === 'accepted')
      .map(r => ({ id: r.recipient_id, username: r.recipient_username }));
    setSendingRoster(true);
    try {
      await notifyRoster(selected, willing, formData.output_owner_id, reportSubmissionId, freshToken);
      setRosterSent(true); // unlocks "Invite Selected Providers"
      setMsg({ type: 'success', text: `Roster sent to ${selected.length} selected provider(s) â€” ${willing.length} willing.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSendingRoster(false);
    }
  };

  // Fetch the CURRENT data-provider list (enriched with RAM). Reusable so the
  // owner can refresh on demand and entering the selection step always re-pulls;
  // cache:'no-store' defeats any stale browser/HTTP caching of the GET.
  // Load the latest final global model (newest session's highest round) from the
  // governance layer, which reads the FL server's checkpoint dir.
  const loadFinalModel = async (silent = false) => {
    if (!silent) setFinalModelLoading(true);
    try {
      const res = await fetch('/api/v1/final-models', { cache: 'no-store' });
      const data = await res.json();
      if (data.status === 'SUCCESS') setFinalModel(data.latest || null);
    } catch (err) {
      console.warn('Failed to load final model:', err);
    } finally {
      if (!silent) setFinalModelLoading(false);
    }
  };

  // "Open Final Model": fetch a readable summary (layers/shapes/params/sample) and
  // toggle it open. A .pt is opaque binary, so this makes it legible in the UI.
  const openFinalModel = async () => {
    if (summaryOpen) { setSummaryOpen(false); return; }
    setSummaryOpen(true);
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const q = finalModel?.session_id ? `?session_id=${encodeURIComponent(finalModel.session_id)}` : '';
      const res = await fetch(`/api/v1/final-model/summary${q}`, { cache: 'no-store' });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* non-JSON (e.g. a 404 page) */ }
      if (!data) {
        setSummaryError(
          res.status === 404
            ? 'Model reader not available yet â€” restart the governance layer to load the /final-model/summary endpoint.'
            : `Unexpected response (HTTP ${res.status}).`
        );
      } else if (data.status === 'SUCCESS') {
        setModelSummary(data.summary);
      } else {
        setSummaryError(data.message || data.error || 'Failed to read model');
      }
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchDataProviders = useCallback(async (silent = false) => {
    const freshToken = localStorage.getItem('access_token') || token;
    if (!freshToken) return;
    if (!silent) setProvidersLoading(true);
    setProvidersError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/p3dx/api/v1/data-providers`, {
        headers: { Authorization: `Bearer ${freshToken}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setDataProviders(data.data_providers || []);
      } else {
        setProvidersError(data.error || 'Failed to load data providers');
      }
    } catch (err) {
      setProvidersError(err.message);
    } finally {
      if (!silent) setProvidersLoading(false);
    }
  }, [token]);

  // Load on mount, and re-pull whenever the owner enters the provider-selection
  // step so newly-registered/withdrawn providers are reflected (not stale).
  useEffect(() => {
    if (token && (currentStep === 'provider-selection' || dataProviders.length === 0)) {
      fetchDataProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentStep]);

  // While the owner is on the provider-selection step, poll so a provider who
  // requests (submits their form) appears automatically â€” and one whose request
  // goes stale drops off â€” without a manual Refresh. Silent to avoid UI flicker.
  useEffect(() => {
    if (!token || currentStep !== 'provider-selection') return;
    const h = setInterval(() => fetchDataProviders(true), 6000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentStep]);

  // Output owners: load the final model on mount and poll so it appears once the
  // FL server finishes writing the final round's checkpoint â€” no manual refresh.
  useEffect(() => {
    if (!token || !isOutputOwner) return;
    loadFinalModel(true);
    const h = setInterval(() => loadFinalModel(true), 15000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isOutputOwner]);

  // Output owners: load participation responses for the current request and POLL
  // so a provider's answer (accept/decline + note) appears in the panel
  // automatically â€” no manual Refresh needed.
  useEffect(() => {
    if (!token || !isOutputOwner || !reportSubmissionId) {
      setResponses([]);
      return;
    }
    loadResponses(reportSubmissionId, true);
    const h = setInterval(() => loadResponses(reportSubmissionId, true), 8000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isOutputOwner, reportSubmissionId]);

  // Drop any selected providers that stop meeting the RAM rule (e.g. after the
  // owner edits their RAM Usage back on the configuration step).
  useEffect(() => {
    setSelectedProviders(prev => prev.filter(providerEligible));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.ram_usage]);

  function toggleProvider(provider) {
    setSelectedProviders(prev => {
      const exists = prev.find(p => p.id === provider.id);
      return exists
        ? prev.filter(p => p.id !== provider.id)
        : [...prev, provider];
    });
  }

  function clearSelection() {
    setSelectedProviders([]);
  }

  // Go back to edit the configuration (from the provider-selection step).
  function handleEditConfiguration() {
    setCurrentStep('form');
    setMsg(null);
  }

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
      ram_usage: formData.ram_usage ? Number(formData.ram_usage) : undefined,
      selected_providers: selected.map(p => ({ id: p.id, username: p.username, email: p.email })),
      ip_address: formData.ip_address || undefined,
      port: formData.port ? Number(formData.port) : undefined,
      filled: true,
      requested_at: new Date().toISOString(),
      filled_at: new Date().toISOString(),
    };
  }

  // Data Provider form submit handler
  const handleDataProviderSubmit = async (e) => {
    e.preventDefault();
    const obj = {
      ...dpFormData,
      data_owner_id: user?.username || '',
      filled: true,
      requested_at: new Date().toISOString(),
      filled_at: new Date().toISOString()
    };
    const freshToken = localStorage.getItem("access_token") || token;
    try {
      const data = await submitDataProviderFormToBackend(obj, freshToken);
      setMsg({ type: data.status === 'SUCCESS' ? 'success' : 'error', text: data.status === 'SUCCESS' ? 'Data Provider form submitted successfully!' : (data.error || 'Error saving form') });
    } catch(err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  // Step 1: submit the Output Owner configuration to the governance layer (no
  // providers yet), then advance to provider selection. Upserts on form_id, so
  // step 2 updates this same submission with the chosen providers.
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const freshToken = localStorage.getItem("access_token") || token;

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
        localStorage.setItem('last_report_submission_id', governanceRes.submission_id);
      }
      setMsg({ type: 'success', text: 'Configuration submitted. Now select the data providers to invite.' });
      setCurrentStep('provider-selection');
    } catch (err) {
      console.error('[DEBUG] Config submit error:', err);
      setMsg({ type: 'error', text: err.message });
    }
  };

  // Step 2a: send the FIRST message ("are you still willing to participate?") to
  // the selected providers, and persist the selection so responses are scoped to
  // it. Keeps the selection so the owner can then proceed to Invite.
  const handleSendMessage = async () => {
    const freshToken = localStorage.getItem("access_token") || token;

    if (selectedProviders.length === 0) {
      setMsg({ type: 'error', text: 'Please select at least one data provider first.' });
      return;
    }

    // Accepted (selected) set for the notification recipients.
    const providersPayload = selectedProviders.map(p => ({
      id: p.id,
      username: p.username,
      email: p.email,
      form_data: p.formData || {},
    }));
    // Everyone who advertised (requested to participate) â€” sent alongside the
    // selected set so each notified provider sees who requested vs who was selected.
    const requestedPayload = dataProviders.map(p => ({
      id: p.id,
      username: p.username,
      email: p.email,
    }));

    setSendingMessage(true);
    try {
      const governanceRes = await submitOutputOwnerToGovernance(buildOwnerPayload(selectedProviders), freshToken);
      const govSuccess = governanceRes.status?.toLowerCase() === 'success';
      if (!govSuccess) {
        setMsg({ type: 'error', text: `Governance: ${governanceRes.message || governanceRes.error || 'Failed'}` });
        return;
      }

      setReportSubmissionId(governanceRes.submission_id);
      if (governanceRes.submission_id) {
        localStorage.setItem('last_report_submission_id', governanceRes.submission_id);
      }

      await notifyProviders(providersPayload, requestedPayload, formData.output_owner_id, governanceRes.submission_id, freshToken);
      // A new round starts: the owner must send the final roster again before they
      // can invite, so re-lock the invite button.
      setRosterSent(false);
      // Record exactly who was messaged this round so the responses panel shows
      // only these providers (not leftovers from earlier rounds under the same id).
      localStorage.setItem('current_round_roster', JSON.stringify(selectedProviders.map(p => p.username)));
      // Refresh the responses panel so the newly-notified providers show as pending.
      loadResponses(governanceRes.submission_id);
      setMsg({ type: 'success', text: `Message sent to ${selectedProviders.length} selected provider(s). They can now respond in their dashboard.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSendingMessage(false);
    }
  };

  // Step 2b: finalize â€” persist the selection, submit to APD, and open the "send
  // config" dialog. Does NOT message providers (that's "Send message" above).
  const handleConfirmProviders = async () => {
    const freshToken = localStorage.getItem("access_token") || token;

    if (selectedProviders.length === 0) {
      setMsg({ type: 'error', text: 'Please select at least one data provider to invite.' });
      return;
    }

    // Prepare selected providers for APD.
    const providersPayload = selectedProviders.map(p => ({
      id: p.id,
      username: p.username,
      email: p.email,
      form_data: p.formData || {},
    }));

    try {
      const governanceRes = await submitOutputOwnerToGovernance(buildOwnerPayload(selectedProviders), freshToken);
      console.log('[DEBUG] Governance response (providers):', governanceRes);

      const govSuccess = governanceRes.status?.toLowerCase() === 'success';
      if (!govSuccess) {
        setMsg({ type: 'error', text: `Governance: ${governanceRes.message || governanceRes.error || 'Failed'}` });
        return;
      }

      // Send to APD in parallel (non-blocking for the user)
      submitSelectedProvidersToAPD(providersPayload, freshToken)
        .then(r => console.log('[DEBUG] APD response:', r))
        .catch(e => console.warn('[DEBUG] APD submission failed:', e));

      setReportSubmissionId(governanceRes.submission_id);
      if (governanceRes.submission_id) {
        localStorage.setItem('last_report_submission_id', governanceRes.submission_id);
      }
      setMsg({ type: 'success', text: `Invited ${selectedProviders.length} data provider(s).` });
      // Pop up the "send config to providers" dialog now that we have a submission id.
      setDistributeResult(null);
      setShowDistribute(true);
      clearSelection();
    } catch(err) {
      console.error('[DEBUG] Provider submit error:', err);
      setMsg({ type: 'error', text: err.message });
    }
  };

  // Owner-side: download/preview the rendered config (output-owner IP in MQTT
  // broker_host + gRPC host) that the selected providers will pull.
  const handleDownloadConfig = async () => {
    const id = reportSubmissionId || localStorage.getItem('last_report_submission_id');
    if (!id) {
      setDistributeResult({ ok: false, text: 'No submission found. Submit the request first.' });
      return;
    }
    const freshToken = localStorage.getItem('access_token') || token;
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

  // Owner-side: PUSH the rendered config over HTTP to each selected provider's
  // receiver (ip:port from their registration form). gov_layer does the POSTs.
  const handlePushConfig = async () => {
    const id = reportSubmissionId || localStorage.getItem('last_report_submission_id');
    if (!id) {
      setDistributeResult({ ok: false, text: 'No submission found. Submit the request first.' });
      return;
    }
    const freshToken = localStorage.getItem('access_token') || token;
    setPushing(true);
    setDistributeResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/p3dx/gov/push-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ submission_id: id }),
      });
      const data = await res.json();
      const s = data.summary || { sent: 0, failed: 0, skipped: 0 };
      const details = (data.results || []).map(
        r => `â€¢ ${r.username} (${r.ip || '?'}:${r.port || '?'}) â€” ${r.status}${r.reason ? ': ' + r.reason : ''}${r.http ? ' [HTTP ' + r.http + ']' : ''}`
      );
      setDistributeResult({
        ok: data.status === 'SUCCESS',
        text: data.message || `Push complete â€” sent ${s.sent}, failed ${s.failed}, skipped ${s.skipped}.`,
        details,
      });
    } catch (e) {
      setDistributeResult({ ok: false, text: `Push failed: ${e.message}` });
    } finally {
      setPushing(false);
    }
  };

  // Owner-side: bring up the FL run for this submission â€” gov_layer creates the
  // owner venv (+ server requirements) and launches flo_server.py on the owner, then
  // provisions each provider's venv (+ client requirements) and launches
  // flo_client.py on each provider. flo_session.py is launched in a later step.
  const handleStartFlSession = async () => {
    const id = reportSubmissionId || localStorage.getItem('last_report_submission_id');
    if (!id) {
      setDistributeResult({ ok: false, text: 'No submission found. Submit the request first.' });
      return;
    }
    const freshToken = localStorage.getItem('access_token') || token;
    setStartingSession(true);
    setDistributeResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/p3dx/gov/start-fl-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ submission_id: id }),
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        const p = data.provision?.summary || { ok: 0, failed: 0, skipped: 0 };
        const c = data.clients?.summary || { started: 0, failed: 0, skipped: 0 };
        const provDetails = (data.provision?.results || []).map(
          r => `â€¢ env ${r.username} (${r.ip || '?'}:${r.port || '?'}) â€” ${r.status}${r.reason ? ': ' + r.reason : ''}`
        );
        const clientDetails = (data.clients?.results || []).map(
          r => `â€¢ client ${r.username} (${r.ip || '?'}:${r.port || '?'}) â€” ${r.status}${r.reason ? ': ' + r.reason : ''}`
        );
        const sess = data.session?.status === 'started'
          ? `Session started (flo_session.py pid ${data.session.pid}, after ${Math.round((data.session.waited_ms ?? 0) / 1000)}s wait).`
          : `Session: ${data.session?.detail || 'not started'}.`;
        setDistributeResult({
          ok: true,
          text: `Owner ${data.owner?.url ?? ''} up â€” flo_server.py pid ${data.server?.pid ?? '?'}. Provider envs: ok ${p.ok}, failed ${p.failed}, skipped ${p.skipped}. Clients: started ${c.started}, failed ${c.failed}, skipped ${c.skipped}. ${sess}`,
          details: [
            ...(data.server?.log ? [`server log: ${data.server.log} @ ${data.owner?.url ?? 'owner'}`] : []),
            ...provDetails,
            ...clientDetails,
            ...(data.session?.log ? [`session log: ${data.session.log}`] : []),
          ],
        });
      } else {
        setDistributeResult({ ok: false, text: data.message || data.error || 'Failed to start FL session.' });
      }
    } catch (e) {
      setDistributeResult({ ok: false, text: `Start FL session failed: ${e.message}` });
    } finally {
      setStartingSession(false);
    }
  };

  // Data-provider side: pull this provider's own client config from the gov layer.
  const downloadMyConfig = async () => {
    const freshToken = localStorage.getItem('access_token') || token;
    setDpConfigMsg(null);
    const r = await fetchClientConfig(`/api/v1/client-config/${encodeURIComponent(user?.username || '')}`, freshToken);
    if (r.ok) {
      triggerBlobDownload(r.text, 'client_config.yaml');
      setDpConfigMsg({ type: 'success', text: 'Client config downloaded â€” MQTT broker host & gRPC host point to the output owner.' });
    } else {
      setDpConfigMsg({ type: 'error', text: r.message });
    }
  };

  return (
    <div>
      {/* Send-config popup â€” appears after a successful FL request submission. */}
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
                <div style={{ marginTop: '12px', fontWeight: 500, color: distributeResult.ok ? 'var(--success-color, #27ae60)' : '#e74c3c' }}>
                  {distributeResult.text}
                  {distributeResult.details && distributeResult.details.length > 0 && (
                    <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontWeight: 400, fontSize: '13px', color: 'var(--text-light)' }}>
                      {distributeResult.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowDistribute(false)} disabled={downloading || pushing || startingSession}>
                Close
              </button>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleDownloadConfig} disabled={downloading}>
                {downloading ? 'Workingâ€¦' : 'Download Config (YAML)'}
              </button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handlePushConfig} disabled={pushing}>
                {pushing ? 'Sendingâ€¦' : 'Send to Providers'}
              </button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleStartFlSession} disabled={startingSession}>
                {startingSession ? 'Startingâ€¦' : 'Start FL Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-header-title">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Federated Learning</h3>
          <div style={{ color: "var(--text-light)", fontSize: "14px" }}>
            Configure federated learning parameters and select data providers
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        {msg && (
          <div className={msg.type === 'success' ? 'info-banner' : 'error-message'} style={msg.type === 'success' ? { backgroundColor: 'var(--success-color, #27ae60)', color: 'white' } : {}}>{msg.text}</div>
        )}

        {/* Report download â€” available any time a session has been submitted.
            The report is persisted in the governance DB, so it survives page reloads. */}
        {isOutputOwner && reportSubmissionId && (
          <div style={{ marginTop: '10px' }}>
            <a
              href={`/api/v1/form-submissions/${reportSubmissionId}/report`}
              download={`fl_session_${reportSubmissionId}.json`}
              className="btn btn-secondary"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              Download Selected Providers Report (JSON)
            </a>
          </div>
        )}

        {/* Participation responses â€” each selected provider's answer to the
            "are you still willing to participate?" request, with their reason. */}
        {isOutputOwner && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Participation responses</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                  onClick={loadResponses}
                  disabled={responsesLoading}
                >
                  {responsesLoading ? 'Refreshingâ€¦' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                  onClick={handleSendRoster}
                  disabled={sendingRoster || responses.length === 0}
                  title="Message the selected providers the final roster: who is willing and who was selected"
                >
                  {sendingRoster ? 'Sendingâ€¦' : 'Send final roster'}
                </button>
              </div>
            </div>
            {responses.length === 0 ? (
              <div style={{ padding: '8px 0', color: 'var(--text-light, #888)', fontSize: '0.9rem' }}>
                {responsesLoading ? 'Loadingâ€¦' : 'No providers notified yet. Submit a request to invite providers.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {responses.map((n) => {
                  const status = n.response || 'pending';
                  const color = status === 'accepted' ? 'var(--success-color, #27ae60)'
                    : status === 'declined' ? '#e74c3c' : '#999';
                  const label = status === 'accepted' ? 'âœ… Willing'
                    : status === 'declined' ? 'âŒ Declined' : 'â³ Pending';
                  return (
                    <div key={n.id} style={{
                      padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border-color, #ddd)',
                      backgroundColor: 'var(--bg-light, #f8f9fa)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-dark, #333)' }}>{n.recipient_username}</span>
                        <span style={{ fontWeight: 600, color, whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      {n.response_message && (
                        <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-light, #555)' }}>
                          Note: {n.response_message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Final model â€” the aggregated global model from the last training round. */}
        {isOutputOwner && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Final model</h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                onClick={() => loadFinalModel(false)}
                disabled={finalModelLoading}
              >
                {finalModelLoading ? 'Refreshingâ€¦' : 'Refresh'}
              </button>
            </div>
            {!finalModel ? (
              <div style={{ padding: '8px 0', color: 'var(--text-light, #888)', fontSize: '0.9rem' }}>
                {finalModelLoading ? 'Loadingâ€¦' : 'No trained model yet â€” it appears here once the FL session finishes its final round.'}
              </div>
            ) : (
              <div style={{
                marginTop: '8px', padding: '12px 14px', borderRadius: '8px',
                border: '1px solid var(--border-color, #ddd)', backgroundColor: 'var(--bg-light, #f8f9fa)',
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', fontSize: '0.85rem', color: 'var(--text-light, #555)' }}>
                  <span style={{ color: '#888' }}>Session</span><span><code>{finalModel.session_id}</code></span>
                  <span style={{ color: '#888' }}>Final round</span><span>{finalModel.round}</span>
                  <span style={{ color: '#888' }}>Size</span><span>{(finalModel.size_bytes / 1024).toFixed(1)} KB</span>
                  <span style={{ color: '#888' }}>File</span><span><code>{finalModel.file}</code></span>
                  <span style={{ color: '#888' }}>Updated</span><span>{new Date(finalModel.modified_at).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                    onClick={openFinalModel}
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? 'Readingâ€¦' : summaryOpen ? 'Hide Final Model' : 'Open Final Model'}
                  </button>
                  <a
                    className="btn btn-secondary"
                    style={{ width: 'auto', textDecoration: 'none' }}
                    href={`/api/v1/final-model/download?session_id=${encodeURIComponent(finalModel.session_id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download .pt
                  </a>
                </div>

                {summaryOpen && (
                  <div style={{ marginTop: '10px' }}>
                    {summaryError ? (
                      <div style={{ color: '#e74c3c', fontSize: '0.85rem' }}>âš  {summaryError}</div>
                    ) : summaryLoading ? (
                      <div style={{ color: 'var(--text-light, #888)', fontSize: '0.9rem' }}>Reading modelâ€¦</div>
                    ) : modelSummary ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-dark, #333)' }}>
                          <strong>{modelSummary.format}</strong>
                          {' â€” '}{modelSummary.num_tensors} tensors,{' '}
                          <strong>{Number(modelSummary.total_params || 0).toLocaleString()}</strong> parameters
                        </div>
                        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color, #ddd)', borderRadius: '6px' }}>
                          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-light, #f1f1f4)', textAlign: 'left' }}>
                                <th style={{ padding: '6px 10px' }}>Layer</th>
                                <th style={{ padding: '6px 10px' }}>dtype</th>
                                <th style={{ padding: '6px 10px' }}>shape</th>
                                <th style={{ padding: '6px 10px', textAlign: 'right' }}>params</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(modelSummary.layers || []).map((l, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border-color, #eee)' }}>
                                  <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>{l.name}</td>
                                  <td style={{ padding: '5px 10px' }}>{l.dtype}</td>
                                  <td style={{ padding: '5px 10px', fontFamily: 'monospace' }}>[{(l.shape || []).join(', ')}]</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right' }}>{Number(l.params || 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {modelSummary.sample && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light, #555)' }}>
                            <strong>Sample weights</strong> ({modelSummary.sample.layer}, {modelSummary.sample.dtype}):{' '}
                            <code>[{(modelSummary.sample.values || []).join(', ')}]</code>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Data Provider View */}
        {isDataProvider && !isOutputOwner && (
          <div>
            <h3 className="section-title">Data Provider Form</h3>
            <form onSubmit={handleDataProviderSubmit}>
              <div className="form-group">
                <label>Form ID</label>
                <input value={dpFormData.form_id} onChange={(e) => setDpFormData({...dpFormData, form_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Data Owner ID</label>
                <input value={dpFormData.data_owner_id} onChange={(e) => setDpFormData({...dpFormData, data_owner_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Dataset Name</label>
                <input value={dpFormData.dataset_name} onChange={(e) => setDpFormData({...dpFormData, dataset_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>RAM (MB)</label>
                <input type="number" value={dpFormData.RAM} onChange={(e) => setDpFormData({...dpFormData, RAM: e.target.value})} />
              </div>
              <div className="form-group">
                <label>RAM Usage (MB)</label>
                <input type="number" value={dpFormData.ram_usage} onChange={(e) => setDpFormData({...dpFormData, ram_usage: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Disk Space (MB)</label>
                <input type="number" value={dpFormData.memory_mb} onChange={(e) => setDpFormData({...dpFormData, memory_mb: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Data Size (bytes)</label>
                <input type="number" value={dpFormData.data_size_bytes} onChange={(e) => setDpFormData({...dpFormData, data_size_bytes: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Data Resource ID</label>
                <input value={dpFormData.data_resource_id} onChange={(e) => setDpFormData({...dpFormData, data_resource_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>IP Address</label>
                <input placeholder="e.g. 192.168.1.10" value={dpFormData.ip_address} onChange={(e) => setDpFormData({...dpFormData, ip_address: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input type="number" placeholder="e.g. 8080" min="1" max="65535" value={dpFormData.port} onChange={(e) => setDpFormData({...dpFormData, port: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Submit Data Provider Form</button>
            </form>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <button type="button" className="btn btn-secondary" onClick={downloadMyConfig}>
                Download My Client Config (YAML)
              </button>
              {dpConfigMsg && (
                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: dpConfigMsg.type === 'success' ? 'var(--success-color, #27ae60)' : '#e74c3c' }}>
                  {dpConfigMsg.text}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#888' }}>
                Available once an output owner has selected you in a session.
              </div>
            </div>
          </div>
        )}

        {/* Output Owner View - Provider Selection */}
        {isOutputOwner && currentStep === 'provider-selection' && (
          <div>
            <h3 className="section-title">Select Participating Data Providers</h3>

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(108, 99, 255, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dark, #333)' }}>
                Step 2 of 2 â€” configuration submitted{formData.form_id ? ` (${formData.form_id})` : ''}. Choose the providers to invite.
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleEditConfiguration}
                style={{ width: 'auto', padding: '4px 12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                Edit Configuration
              </button>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label>
                  Select Participating Data Providers
                  {selectedProviders.length > 0 && (
                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--primary-color, #6c63ff)', fontWeight: 400 }}>
                      ({selectedProviders.length} selected)
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={fetchDataProviders}
                    disabled={providersLoading}
                  >
                    {providersLoading ? 'Refreshingâ€¦' : 'Refresh'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={clearSelection}
                    disabled={selectedProviders.length === 0}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-light, #666)' }}>
                Only providers whose <strong>RAM Usage â‰¤ your RAM Usage</strong>
                {ownerRamValid ? ` (${ownerRam} MB)` : ''} can be selected â€” eligible providers are green, the rest red.
              </div>
              {!ownerRamValid && (
                <div style={{ marginTop: '6px', padding: '8px', borderRadius: '6px', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', fontSize: '0.85rem' }}>
                  âš  Set <strong>RAM Usage</strong> in your configuration to compare against providers (use â€œEdit Configurationâ€ above).
                </div>
              )}
              {providersLoading && (
                <div style={{ padding: '12px', color: '#888', fontSize: '0.9rem' }}>Loading data providers...</div>
              )}
              {providersError && (
                <div style={{ padding: '8px', color: '#e74c3c', fontSize: '0.85rem' }}>âš  {providersError}</div>
              )}
              {!providersLoading && !providersError && dataProviders.length === 0 && (
                <div style={{ padding: '12px', color: '#888', fontSize: '0.9rem' }}>No data providers registered yet.</div>
              )}
              {!providersLoading && dataProviders.length > 0 && (
                <div style={{
                  border: '2px solid var(--primary-color, #6c63ff)',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '8px',
                  marginTop: '8px'
                }}>
                  {dataProviders.map(provider => {
                    const isSelected = !!selectedProviders.find(p => p.id === provider.id);
                    const eligible = providerEligible(provider);
                    const hasRam = provider.ram_usage !== null && provider.ram_usage !== undefined && provider.ram_usage !== '';
                    const green = 'var(--success-color, #27ae60)';
                    const red = '#e74c3c';
                    return (
                      <div
                        key={provider.id}
                        onClick={() => { if (eligible) toggleProvider(provider); }}
                        title={eligible ? '' : (ownerRamValid
                          ? `RAM Usage ${hasRam ? Number(provider.ram_usage) + ' MB' : 'not provided'} exceeds your ${ownerRam} MB`
                          : 'Set your RAM Usage in the configuration to compare')}
                        style={{
                          padding: '10px',
                          margin: '4px 0',
                          border: `2px solid ${eligible ? (isSelected ? 'var(--primary-color, #6c63ff)' : green) : red}`,
                          borderRadius: '6px',
                          cursor: eligible ? 'pointer' : 'not-allowed',
                          opacity: eligible ? 1 : 0.7,
                          backgroundColor: eligible
                            ? (isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(39, 174, 96, 0.08)')
                            : 'rgba(231, 76, 60, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500 }}>{provider.username}</div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>{provider.email}</div>
                          <div style={{ fontSize: '0.8rem', color: eligible ? green : red, marginTop: '2px' }}>
                            RAM Usage: {hasRam ? `${Number(provider.ram_usage)} MB` : 'not provided'}
                            {' â€” '}{eligible ? 'eligible' : 'exceeds your RAM Usage'}
                          </div>
                        </div>
                        {isSelected && eligible && (
                          <span style={{ color: 'var(--primary-color, #6c63ff)', fontSize: '1.2rem' }}>âœ“</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={sendingMessage || selectedProviders.length === 0}
                style={{ width: 'auto' }}
                title="Send the first message (are you still willing to participate?) to the selected providers"
              >
                {sendingMessage ? 'Sendingâ€¦' : 'Send message'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleConfirmProviders}
                disabled={selectedProviders.length === 0 || !rosterSent}
                style={{ width: 'auto' }}
                title={rosterSent
                  ? 'Finalize: save the selection and open the config-distribution dialog'
                  : 'Send the final roster first to enable inviting'}
              >
                Invite Selected Providers
              </button>
              {!rosterSent && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light, #777)' }}>
                  Send the final roster first to enable â€œInvite Selected Providersâ€.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Fallback for users without proper roles */}
        {!isOutputOwner && !isDataProvider && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>You need to request the <strong>output-owner</strong> or <strong>data-provider</strong> role to access Federated Learning.</p>
            <p>Please go to the App page to request a role.</p>
          </div>
        )}

        {/* Output Owner View - Configuration Form */}
        {isOutputOwner && currentStep === 'form' && (
          <div>
            <h3 className="section-title">Federated Learning Configuration</h3>

            <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-light, #666)' }}>
              Step 1 of 2 â€” fill in and submit your FL configuration. You'll select the data providers to invite next.
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Form ID</label>
                <input value={formData.form_id} onChange={(e) => setFormData({...formData, form_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Output Owner ID</label>
                <input value={formData.output_owner_id} onChange={(e) => setFormData({...formData, output_owner_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Number of Server Rounds</label>
                <input type="number" value={formData.num_server_rounds} onChange={(e) => setFormData({...formData, num_server_rounds: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Fraction Evaluate</label>
                <input type="number" step="0.1" value={formData.fraction_evaluate} onChange={(e) => setFormData({...formData, fraction_evaluate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Local Epochs</label>
                <input type="number" value={formData.local_epochs} onChange={(e) => setFormData({...formData, local_epochs: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Learning Rate</label>
                <input type="number" step="0.001" value={formData.learning_rate} onChange={(e) => setFormData({...formData, learning_rate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Batch Size</label>
                <input type="number" value={formData.batch_size} onChange={(e) => setFormData({...formData, batch_size: e.target.value})} />
              </div>
              <div className="form-group">
                <label>RAM Usage (MB)</label>
                <input type="number" value={formData.ram_usage} onChange={(e) => setFormData({...formData, ram_usage: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Framework</label>
                <input value={formData.framework} onChange={(e) => setFormData({...formData, framework: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Components (comma-separated key=value pairs)</label>
                <input
                  value={formData.components}
                  onChange={(e) => setFormData({...formData, components: e.target.value})}
                  placeholder="e.g., param1=value1, param2=value2"
                />
              </div>
              <div className="form-group">
                <label>IP Address</label>
                <input placeholder="e.g. 192.168.1.1" value={formData.ip_address} onChange={(e) => setFormData({...formData, ip_address: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input type="number" placeholder="e.g. 8080" min="1" max="65535" value={formData.port} onChange={(e) => setFormData({...formData, port: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Submit Configuration &amp; Select Providers</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
