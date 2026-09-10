import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BACKEND_URL } from '../config';
import { notifyProviders, getNotificationResponses, notifyRoster, getSessionContract, getMyNotifications, queueFlSession } from '../api/auth';

const GOVERNANCE_LAYER_URL = `${BACKEND_URL}/p3dx/form-submissions`;
const DATA_PROVIDER_FORM_URL = `${BACKEND_URL}/p3dx/data-provider-forms`;

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

// Derive the pending/willing/declined status for a notified provider from
// their latest participation response. Shared by the "Selected Data-Providers"
// panel and the provider checklist so both render identical badges.
function providerStatus(providerResponse) {
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
function IconDatabase() {
  return (
    <svg {...ICON_PROPS}>
      <ellipse cx="10" cy="5" rx="6" ry="2.2" />
      <path d="M4 5v10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" />
      <path d="M4 10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" />
    </svg>
  );
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
function IconPlug() {
  return <svg {...ICON_PROPS}><path d="M8 12l4-4" /><path d="M7 9 5.6 7.6a2.5 2.5 0 1 1 3.5-3.5L10.4 5.4" /><path d="M12 11l1.4 1.4a2.5 2.5 0 1 1-3.5 3.5L8.6 14.6" /></svg>;
}

export default function FederatedLearning() {
  const { user, token } = useOutletContext();

  // Check user roles
  const roles = user?.roles || [];
  const isDataProvider = roles.includes('data-provider');
  // No separate "output-owner" role to request/approve - any logged-in user
  // who isn't a data-provider gets the full owner workflow (provider
  // selection, final model, report download).
  const isOutputOwner = !isDataProvider;
  const canSeeOutputOwnerForm = isOutputOwner;

  // Data Provider form state
  const [dpFormData, setDpFormData] = useState({
    form_id: 'dataform-001',
    data_owner_id: user?.username || '',
    dataset_name: '',
    dataset_location_url: '',
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
    port: '',
    // Not part of buildOwnerPayload below (governance layer doesn't need
    // it) - only read by handleStartFlSession to name the VM Terraform creates.
    vm_name: user?.username || ''
  });
  const [msg, setMsg] = useState(null);
  // Persist the last submission id so the report stays downloadable after a page reload.
  const [reportSubmissionId, setReportSubmissionId] = useState(
    () => sessionStorage.getItem('last_report_submission_id') || null
  );

  // "Send config to data providers" popup state (shown after a successful submit).
  const [showDistribute, setShowDistribute] = useState(false);
  // Independent in-flight flags so the three actions don't disable each other.
  const [downloading, setDownloading] = useState(false);
  const [pushing, setPushing] = useState(false);
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
  // Each selected provider's participation response so far, keyed by
  // username: { response: 'accepted' | 'declined', message }. Read back from
  // this owner's previously-sent notifications so the selection list shows
  // live willing/not-willing status next to each provider.
  const [providerResponses, setProviderResponses] = useState({});
  // Providers who've completed their Azure sign-in for the started FL
  // session, keyed by username -> ISO timestamp first seen. Read back from
  // this owner's own notification inbox (each provider posts one on sign-in).
  const [azureSignIns, setAzureSignIns] = useState({});
  // "Send Message" to selected providers, in flight flag.
  const [sendingMessage, setSendingMessage] = useState(false);
  // Providers that have actually been notified via "Send Message" so far -
  // this is what the "Selected Data-Providers" panel shows (pending until
  // they respond), decoupled from the live checkbox selection so it survives
  // Clear All / Invite (which resets the checkboxes).
  const [notifiedProviders, setNotifiedProviders] = useState([]);
  // Manual "Refresh" on the Selected Data-Providers panel, in flight flag.
  const [refreshingResponses, setRefreshingResponses] = useState(false);
  // "Final Roster" - announcing the confirmed participants, in flight flag.
  const [sendingRoster, setSendingRoster] = useState(false);
  // Gates "Start FL Session" - only unlocked once the owner has sent the
  // final roster announcement to the confirmed participants.
  const [finalRosterSent, setFinalRosterSent] = useState(false);
  // The exact roster (id/username/email) sent as the final participant list -
  // kept around so "Start FL Session" can notify the same providers without
  // re-deriving the willing list.
  const [finalRoster, setFinalRoster] = useState([]);
  // "View Contract" - the stored session contract (draft or finalized), shown
  // on demand rather than polled.
  const [contract, setContract] = useState(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState(null);

  // Final (highest-round) global model produced by the FL server for the session.
  const [finalModel, setFinalModel] = useState(null);
  const [finalModelLoading, setFinalModelLoading] = useState(false);
  // Readable summary of the final model (layers/shapes/params) - shown on "Open".
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
            ? 'Model reader not available yet - restart the governance layer to load the /final-model/summary endpoint.'
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
    const freshToken = sessionStorage.getItem('access_token') || token;
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
          if (payload.kind && payload.kind !== 'participation_request') return false;
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

  // Manual refresh for the "Selected Data-Providers" panel - re-pulls
  // responses immediately instead of waiting for the background poll.
  const refreshProviderResponses = async () => {
    setRefreshingResponses(true);
    try {
      await fetchProviderResponses();
    } finally {
      setRefreshingResponses(false);
    }
  };

  // Load on mount, and re-pull whenever the owner enters the provider-selection
  // step so newly-registered/withdrawn providers are reflected (not stale).
  useEffect(() => {
    if (token && (currentStep === 'provider-selection' || dataProviders.length === 0)) {
      fetchDataProviders();
    }
    if (token && currentStep === 'provider-selection') {
      fetchProviderResponses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentStep]);

  // While the owner is on the provider-selection step, poll so a provider who
  // requests (submits their form) appears automatically - and one whose request
  // goes stale drops off, and responses stay live - without a manual Refresh.
  // Silent to avoid UI flicker.
  useEffect(() => {
    if (!token || currentStep !== 'provider-selection') return;
    const h = setInterval(() => { fetchDataProviders(true); fetchProviderResponses(); }, 6000);
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

  // Output owners: load the final model on mount and poll so it appears once the
  // FL server finishes writing the final round's checkpoint - no manual refresh.
  useEffect(() => {
    if (!token || !isOutputOwner) return;
    loadFinalModel(true);
    const h = setInterval(() => loadFinalModel(true), 15000);
    return () => clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isOutputOwner]);

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
      selected_providers: selected.map(p => p.username),
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
    const freshToken = sessionStorage.getItem("access_token") || token;
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
        setMsg({ type: 'success', text: 'Configuration submitted. Now select the data providers to invite.' });
        setCurrentStep('provider-selection');
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
  const handleSendMessage = async () => {
    if (selectedProviders.length === 0) {
      setMsg({ type: 'error', text: 'Select at least one data provider before sending a message.' });
      return;
    }
    const freshToken = sessionStorage.getItem('access_token') || token;
    setSendingMessage(true);
    try {
      const selectedPayload = selectedProviders.map(p => ({ id: p.id, username: p.username, email: p.email }));

      let willingProviders = [];
      try {
        const responsesRes = await getNotificationResponses(freshToken);
        const sent = Array.isArray(responsesRes.notifications) ? responsesRes.notifications : [];
        const willingUsernames = new Set(
          sent
            .filter(n => n.response === 'accepted')
            .filter(n => {
              const payload = typeof n.payload === 'string' ? JSON.parse(n.payload || '{}') : (n.payload || {});
              return !reportSubmissionId || payload.submission_id === reportSubmissionId;
            })
            .map(n => n.recipient_username)
        );
        willingProviders = selectedPayload.filter(p => willingUsernames.has(p.username));
      } catch (err) {
        console.warn('[DEBUG] Failed to load prior responses, sending without willing list:', err);
      }

      await notifyProviders(selectedPayload, selectedPayload, formData.output_owner_id, reportSubmissionId, freshToken, willingProviders);

      // Add the just-notified providers to the "Selected Data-Providers" panel
      // (dedup by id so re-sending doesn't create duplicates).
      setNotifiedProviders(prev => {
        const next = [...prev];
        selectedProviders.forEach(p => {
          if (!next.find(np => np.id === p.id)) next.push(p);
        });
        return next;
      });

      setMsg({
        type: 'success',
        text: `Message sent to ${selectedPayload.length} selected provider(s) - ${willingProviders.length} willing so far.`,
      });
    } catch (err) {
      console.error('[DEBUG] Send message error:', err);
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSendingMessage(false);
    }
  };

  // "Final Roster": once providers have weighed in, announce the confirmed
  // participant list - only those who responded "willing" so far - to those
  // same willing providers. A done-deal notice, not another accept/decline ask.
  const handleSendFinalRoster = async () => {
    const willing = notifiedProviders.filter(p => providerResponses[p.username]?.response === 'accepted');
    if (willing.length === 0) {
      setMsg({ type: 'error', text: 'No data provider has confirmed willing yet - nothing to send.' });
      return;
    }
    const freshToken = sessionStorage.getItem('access_token') || token;
    setSendingRoster(true);
    try {
      const willingPayload = willing.map(p => ({ id: p.id, username: p.username, email: p.email }));
      const selectedPayload = notifiedProviders.map(p => ({ id: p.id, username: p.username, email: p.email }));
      const res = await notifyRoster(selectedPayload, willingPayload, formData.output_owner_id, reportSubmissionId, freshToken);
      setFinalRosterSent(true);
      setFinalRoster(willingPayload);
      if (res?.contract) {
        setContract(res.contract);
        setContractError(null);
      }
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

  // "View Contract": read back the stored session contract (draft before Final
  // Roster, finalized after) so the owner can inspect who's on it.
  const handleViewContract = async () => {
    if (contractOpen) { setContractOpen(false); return; }
    if (!reportSubmissionId) {
      setContractError('No submission found yet - submit your configuration first.');
      setContractOpen(true);
      return;
    }
    setContractOpen(true);
    setContractError(null);
    setContractLoading(true);
    try {
      const freshToken = sessionStorage.getItem('access_token') || token;
      const data = await getSessionContract(reportSubmissionId, freshToken);
      if (data?.contract) {
        setContract(data.contract);
      } else {
        setContract(null);
        setContractError('No contract has been generated for this session yet - send the Final Roster first.');
      }
    } catch (err) {
      setContractError(err.message);
    } finally {
      setContractLoading(false);
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

  // Owner-side: PUSH the rendered config over HTTP to each selected provider's
  // receiver (ip:port from their registration form). gov_layer does the POSTs.
  const handlePushConfig = async () => {
    const id = reportSubmissionId || sessionStorage.getItem('last_report_submission_id');
    if (!id) {
      setDistributeResult({ ok: false, text: 'No submission found. Submit the request first.' });
      return;
    }
    const freshToken = sessionStorage.getItem('access_token') || token;
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
        r => `- ${r.username} (${r.ip || '?'}:${r.port || '?'}) - ${r.status}${r.reason ? ': ' + r.reason : ''}${r.http ? ' [HTTP ' + r.http + ']' : ''}`
      );
      setDistributeResult({
        ok: data.status === 'SUCCESS',
        text: data.message || `Push complete - sent ${s.sent}, failed ${s.failed}, skipped ${s.skipped}.`,
        details,
      });
    } catch (e) {
      setDistributeResult({ ok: false, text: `Push failed: ${e.message}` });
    } finally {
      setPushing(false);
    }
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
    const vmName = formData.vm_name || user?.username || '';
    try {
      await queueFlSession(id, finalRoster, vmName, freshToken);
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
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowDistribute(false)} disabled={downloading || pushing}>
                Close
              </button>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleDownloadConfig} disabled={downloading}>
                {downloading ? 'Working...' : 'Download Config (YAML)'}
              </button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handlePushConfig} disabled={pushing}>
                {pushing ? 'Sending...' : 'Send to Providers'}
              </button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleStartFlSession}>
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

        {/* Final model - the aggregated global model from the last training round. */}
        {isOutputOwner && (
          <div className="fl-section">
            <div className="fl-section-header">
              <div className="fl-section-header-text">
                <h3 className="section-title"><span className="fl-section-icon">&#9670;</span>Final Model</h3>
                <span className="fl-section-sub">The aggregated global model from this session's last training round</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                onClick={() => loadFinalModel(false)}
                disabled={finalModelLoading}
              >
                {finalModelLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {!finalModel ? (
              <div className="fl-empty">
                {finalModelLoading ? 'Loading...' : "No trained model yet - it appears here once the FL session finishes its final round."}
              </div>
            ) : (
              <div className="card" style={{ padding: '16px' }}>
                <div className="fl-model-meta">
                  <div className="fl-model-meta-item">
                    <div className="fl-model-meta-item__label">Session</div>
                    <div className="fl-model-meta-item__value"><code>{finalModel.session_id}</code></div>
                  </div>
                  <div className="fl-model-meta-item">
                    <div className="fl-model-meta-item__label">Final Round</div>
                    <div className="fl-model-meta-item__value">{finalModel.round}</div>
                  </div>
                  <div className="fl-model-meta-item">
                    <div className="fl-model-meta-item__label">Size</div>
                    <div className="fl-model-meta-item__value">{(finalModel.size_bytes / 1024).toFixed(1)} KB</div>
                  </div>
                  <div className="fl-model-meta-item">
                    <div className="fl-model-meta-item__label">File</div>
                    <div className="fl-model-meta-item__value"><code>{finalModel.file}</code></div>
                  </div>
                  <div className="fl-model-meta-item">
                    <div className="fl-model-meta-item__label">Updated</div>
                    <div className="fl-model-meta-item__value">{new Date(finalModel.modified_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="fl-action-row" style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                    onClick={openFinalModel}
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? 'Reading...' : summaryOpen ? 'Hide Final Model' : 'Open Final Model'}
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
                  <div style={{ marginTop: '14px' }}>
                    {summaryError ? (
                      <div className="fl-result-banner fl-result-banner--error">&#9888; {summaryError}</div>
                    ) : summaryLoading ? (
                      <div className="fl-section-sub">Reading model...</div>
                    ) : modelSummary ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                          <strong>{modelSummary.format}</strong>
                          {' - '}{modelSummary.num_tensors} tensors,{' '}
                          <strong>{Number(modelSummary.total_params || 0).toLocaleString()}</strong> parameters
                        </div>
                        <div className="cat-table-wrap">
                          <table className="cat-table">
                            <thead>
                              <tr>
                                <th>Layer</th>
                                <th>dtype</th>
                                <th>shape</th>
                                <th style={{ textAlign: 'right' }}>params</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(modelSummary.layers || []).map((l, i) => (
                                <tr key={i}>
                                  <td style={{ fontFamily: 'monospace' }}>{l.name}</td>
                                  <td>{l.dtype}</td>
                                  <td style={{ fontFamily: 'monospace' }}>[{(l.shape || []).join(', ')}]</td>
                                  <td style={{ textAlign: 'right' }}>{Number(l.params || 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {modelSummary.sample && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
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
          <div className="fl-section">
            <div className="fl-section-header">
              <div className="fl-section-header-text">
                <h3 className="section-title"><span className="fl-section-icon">&#9671;</span>Data Provider Form</h3>
                <span className="fl-section-sub">Register your dataset so output owners can find and invite you</span>
              </div>
            </div>
            <form onSubmit={handleDataProviderSubmit}>
              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconDatabase /></div>
                  <div className="form-section-titles">
                    <h4>Dataset</h4>
                    <span>Identity for this registration</span>
                  </div>
                </div>
                <div className="fl-form-grid">
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
                    <label>Dataset Location URL</label>
                    <input placeholder="e.g. https://storage.example.com/datasets/my-dataset" value={dpFormData.dataset_location_url} onChange={(e) => setDpFormData({...dpFormData, dataset_location_url: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconServer /></div>
                  <div className="form-section-titles">
                    <h4>Resources</h4>
                    <span>Capacity available for training</span>
                  </div>
                </div>
                <div className="fl-form-grid">
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
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconPlug /></div>
                  <div className="form-section-titles">
                    <h4>Network</h4>
                    <span>Where your client receives training config</span>
                  </div>
                </div>
                <div className="fl-form-grid">
                  <div className="form-group">
                    <label>IP Address</label>
                    <input placeholder="e.g. 192.168.1.10" value={dpFormData.ip_address} onChange={(e) => setDpFormData({...dpFormData, ip_address: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input type="number" placeholder="e.g. 8080" min="1" max="65535" value={dpFormData.port} onChange={(e) => setDpFormData({...dpFormData, port: e.target.value})} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Submit Data Provider Form</button>
              </div>
            </form>

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
                <h3 className="section-title"><span className="fl-section-icon">&#10003;</span>Selected Data-Providers</h3>
                <span className="fl-section-sub">
                  {notifiedProviders.length > 0
                    ? `${notifiedProviders.length} provider(s) messaged for this session`
                    : 'Providers you message below will appear here with their live status'}
                </span>
              </div>
              <div className="fl-section-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleEditConfiguration}
                  style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  Edit Configuration
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                  onClick={refreshProviderResponses}
                  disabled={refreshingResponses}
                >
                  {refreshingResponses ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                  onClick={handleSendFinalRoster}
                  disabled={sendingRoster || notifiedProviders.every(p => providerResponses[p.username]?.response !== 'accepted')}
                  title="Send a final message to every provider who has confirmed willing, listing who's participating"
                >
                  {sendingRoster ? 'Sending...' : 'Final Roster'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                  onClick={handleViewContract}
                  disabled={contractLoading || !reportSubmissionId}
                  title="View the session contract built from the Final Roster"
                >
                  {contractLoading ? 'Loading...' : contractOpen ? 'Hide Contract' : 'View Contract'}
                </button>
              </div>
            </div>
            {contractOpen && (
              <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
                {contractError ? (
                  <div className="fl-result-banner fl-result-banner--error" style={{ marginTop: 0 }}>&#9888; {contractError}</div>
                ) : !contract ? (
                  <div className="fl-section-sub">Loading contract...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="fl-model-meta">
                      <div className="fl-model-meta-item">
                        <div className="fl-model-meta-item__label">Contract ID</div>
                        <div className="fl-model-meta-item__value"><code>{contract.contract_id}</code></div>
                      </div>
                      <div className="fl-model-meta-item">
                        <div className="fl-model-meta-item__label">Version</div>
                        <div className="fl-model-meta-item__value">{contract.version} {contract.version === 2 ? '(finalized)' : '(draft)'}</div>
                      </div>
                      <div className="fl-model-meta-item">
                        <div className="fl-model-meta-item__label">Output Owner</div>
                        <div className="fl-model-meta-item__value">{contract.parties?.user?.name}</div>
                      </div>
                      <div className="fl-model-meta-item">
                        <div className="fl-model-meta-item__label">Valid Until</div>
                        <div className="fl-model-meta-item__value">{contract.lifecycle?.valid_until ? new Date(contract.lifecycle.valid_until).toLocaleString() : '-'}</div>
                      </div>
                    </div>

                    <div>
                      <div className="fl-section-sub" style={{ marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                        Data Provider Parties ({(contract.parties?.data_providers || []).length})
                      </div>
                      <div className="cat-table-wrap">
                        <table className="cat-table">
                          <thead>
                            <tr>
                              <th>Provider</th>
                              <th>Dataset</th>
                              <th>Data URL</th>
                              <th>Signed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(contract.parties?.data_providers || []).map((dp, i) => (
                              <tr key={dp.id || i}>
                                <td>{dp.name}</td>
                                <td>{dp.dataset_name || <span style={{ color: 'var(--text-light)' }}>-</span>}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{dp.data_url || <span style={{ color: 'var(--text-light)' }}>-</span>}</td>
                                <td>
                                  {dp.signature?.signed_at ? (
                                    <span className="fl-status-badge fl-status-badge--willing"><span className="fl-status-dot" />Signed</span>
                                  ) : (
                                    <span className="fl-status-badge fl-status-badge--pending"><span className="fl-status-dot" />Unsigned</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <div className="fl-section-sub" style={{ marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                        Raw Contract JSON
                      </div>
                      <pre className="code-block" style={{ maxHeight: '320px', overflow: 'auto' }}>{JSON.stringify(contract, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            {notifiedProviders.length === 0 ? (
              <div className="fl-empty">
                No data providers messaged yet - select providers below and click "Send Message".
              </div>
            ) : (
              <div className="fl-provider-list">
                {notifiedProviders.map(provider => {
                  const providerResponse = providerResponses[provider.username];
                  const status = providerStatus(providerResponse);
                  return (
                    <div key={provider.id} className={`fl-provider-card fl-provider-card--${status.key}`}>
                      <div className="fl-provider-identity">
                        <div className="fl-provider-avatar">{initials(provider.username)}</div>
                        <div>
                          <div className="fl-provider-name">{provider.username}</div>
                          <div className="fl-provider-email">{provider.email}</div>
                          {status.key === 'declined' && providerResponse?.message && (
                            <div className="fl-decline-reason"><strong>Reason:</strong> {providerResponse.message}</div>
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
            )}

            <div className="fl-section">
              <div className="fl-section-header">
                <div className="fl-section-header-text">
                  <h3 className="section-title"><span className="fl-section-icon">&#9776;</span>Select Participating Data Providers</h3>
                  <span className="fl-section-sub">
                    {selectedProviders.length > 0 ? `${selectedProviders.length} selected` : 'Choose which providers to invite'}
                  </span>
                </div>
                <div className="fl-section-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={fetchDataProviders}
                    disabled={providersLoading}
                  >
                    {providersLoading ? 'Refreshing...' : 'Refresh'}
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
              <div className="fl-hint">
                Only providers whose <strong>RAM Usage &le; your RAM Usage</strong>
                {ownerRamValid ? ` (${ownerRam} MB)` : ''} can be selected - eligible providers are green, the rest red.
              </div>
              {!ownerRamValid && (
                <div className="fl-result-banner fl-result-banner--error" style={{ marginTop: 0, marginBottom: '12px' }}>
                  &#9888; Set <strong>RAM Usage</strong> in your configuration to compare against providers (use "Edit Configuration" above).
                </div>
              )}
              {providersLoading && (
                <div className="fl-empty">Loading data providers...</div>
              )}
              {providersError && (
                <div className="fl-result-banner fl-result-banner--error" style={{ marginTop: 0 }}>&#9888; {providersError}</div>
              )}
              {!providersLoading && !providersError && dataProviders.length === 0 && (
                <div className="fl-empty">No data providers registered yet.</div>
              )}
              {!providersLoading && dataProviders.length > 0 && (
                <div className="fl-provider-scroll fl-provider-list">
                  {dataProviders.map(provider => {
                    const isSelected = !!selectedProviders.find(p => p.id === provider.id);
                    const eligible = providerEligible(provider);
                    const hasRam = provider.ram_usage !== null && provider.ram_usage !== undefined && provider.ram_usage !== '';
                    const providerResponse = providerResponses[provider.username];
                    const cardModifier = !eligible ? 'ineligible' : isSelected ? 'selected' : 'eligible';
                    return (
                      <div
                        key={provider.id}
                        onClick={() => { if (eligible) toggleProvider(provider); }}
                        title={eligible ? '' : (ownerRamValid
                          ? `RAM Usage ${hasRam ? Number(provider.ram_usage) + ' MB' : 'not provided'} exceeds your ${ownerRam} MB`
                          : 'Set your RAM Usage in the configuration to compare')}
                        className={`fl-provider-card fl-provider-card--clickable fl-provider-card--${cardModifier}`}
                      >
                        <div className="fl-provider-identity">
                          <div className="fl-provider-avatar">{initials(provider.username)}</div>
                          <div>
                            <div className="fl-provider-name">{provider.username}</div>
                            <div className="fl-provider-email">{provider.email}</div>
                            <div className={`fl-provider-meta ${eligible ? 'fl-provider-meta--ok' : 'fl-provider-meta--bad'}`}>
                              RAM Usage: {hasRam ? `${Number(provider.ram_usage)} MB` : 'not provided'}
                              {' - '}{eligible ? 'eligible' : 'exceeds your RAM Usage'}
                            </div>
                          </div>
                        </div>
                        <div className="fl-provider-side">
                          {isSelected && eligible && (
                            <span className="fl-check">&#10003;</span>
                          )}
                          {providerResponse && (() => {
                            const status = providerStatus(providerResponse);
                            return (
                              <span
                                title={status.key === 'declined' && providerResponse.message ? `Reason: ${providerResponse.message}` : ''}
                                className={`fl-status-badge fl-status-badge--${status.key}`}
                              >
                                <span className="fl-status-dot" />{status.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="fl-section">
              <div className="fl-action-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSendMessage}
                  disabled={selectedProviders.length === 0 || sendingMessage}
                  style={{ width: 'auto' }}
                  title="Notify the selected providers who's selected and who's willing so far"
                >
                  {sendingMessage ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartFlSession}
                  disabled={!reportSubmissionId || !finalRosterSent}
                  style={{ width: 'auto' }}
                  title={finalRosterSent
                    ? "Provision and launch the FL server + selected providers' clients for this submission"
                    : 'Send the Final Roster first to unlock this'}
                >
                  Start FL Session
                </button>
              </div>
              <div className="fl-footnote">
                Sends every selected provider a message listing who's selected and who has
                already responded willing to participate. "Start FL Session" unlocks once
                you've sent the Final Roster, and launches the server and every participating
                provider's client for this submission.
              </div>
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
                    <input value={formData.form_id} onChange={(e) => setFormData({...formData, form_id: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Output Owner ID</label>
                    <input value={formData.output_owner_id} onChange={(e) => setFormData({...formData, output_owner_id: e.target.value})} />
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
                    <input value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Framework</label>
                    <input value={formData.framework} onChange={(e) => setFormData({...formData, framework: e.target.value})} />
                  </div>
                  <div className="form-group form-group--wide">
                    <label>Components (comma-separated key=value pairs)</label>
                    <input
                      value={formData.components}
                      onChange={(e) => setFormData({...formData, components: e.target.value})}
                      placeholder="e.g., param1=value1, param2=value2"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-head">
                  <div className="form-section-icon"><IconPlug /></div>
                  <div className="form-section-titles">
                    <h4>Network &amp; VM</h4>
                    <span>Where this session's server runs</span>
                  </div>
                </div>
                <div className="fl-form-grid">
                  <div className="form-group">
                    <label>IP Address</label>
                    <input placeholder="e.g. 192.168.1.1" value={formData.ip_address} onChange={(e) => setFormData({...formData, ip_address: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input type="number" placeholder="e.g. 8080" min="1" max="65535" value={formData.port} onChange={(e) => setFormData({...formData, port: e.target.value})} />
                  </div>
                  <div className="form-group form-group--wide">
                    <label>VM Name</label>
                    <input placeholder="e.g. my-fl-vm" value={formData.vm_name} onChange={(e) => setFormData({...formData, vm_name: e.target.value})} />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                      Names the VM auto-created for you when you start the FL session.
                    </div>
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
