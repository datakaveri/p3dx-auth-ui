import { CONTROLPLANE_URL, GOV_URL } from "../config";
import { authFetch, getFreshAccessToken } from "./session";

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function buildHttpError(res, data, fallbackMessage) {
  const msg = data?.error || data?.message || fallbackMessage;
  const err = new Error(msg);
  err.statusCode = res.status;
  err.data = data;
  return err;
}

// Self-registration through dx-controlplane (POST /iudx/v2/auth/register),
// which creates the Keycloak user. payload: {username, email, firstName,
// lastName, password}. Throws with statusCode (409: username/email taken).
export async function registerUser(payload) {
  const res = await fetch(`${CONTROLPLANE_URL}/iudx/v2/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw buildHttpError(res, { ...data, error: data?.detail || data?.title }, "Registration failed");
  }
  return data;
}

// Profile from dx-controlplane (GET /iudx/v2/auth/user), reshaped to the
// { status, user: { username, email, roles } } form the pages already use.
// The full controlplane record (sub, name, pendingRoles, organisation, ...)
// is kept on user as well.
export async function getMe(token) {
  const res = await authFetch(`${CONTROLPLANE_URL}/iudx/v2/auth/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  const profile = data?.result;
  if (!res.ok || !profile) {
    throw buildHttpError(res, data, "Unauthorized");
  }
  return {
    status: "SUCCESS",
    user: {
      ...profile,
      username: profile.preferredUsername,
      email: profile.email,
      roles: Array.isArray(profile.roles) ? profile.roles : [],
    },
  };
}

export async function notifyProviders(selectedProviders, requestedProviders, outputOwnerId, submissionId, token, willingProviders = []) {
  const res = await authFetch(`${GOV_URL}/me/fl/notify-providers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      selected_providers: selectedProviders,
      requested_providers: requestedProviders,
      willing_providers: willingProviders,
      output_owner_id: outputOwnerId,
      submission_id: submissionId,
      notified_at: new Date().toISOString(),
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to notify providers");
  }
  return data;
}

export async function getMyNotifications(token) {
  const res = await authFetch(`${GOV_URL}/me/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to fetch notifications");
  }
  return data;
}

// Every dataset on the platform for an FL output owner to pick from, each with
// its provider, whether that provider is set up for FL (fl_ready) and their
// infrastructure's vCPUs. Returns { status, datasets }.
export async function listFlDatasets(token) {
  const res = await authFetch(`${GOV_URL}/me/fl/datasets`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to fetch datasets");
  }
  return data;
}

// Checks the owner's picked datasets against their configuration (Max vCPUs).
// gov_layer notifies each out-of-constraint dataset's provider and returns
// { status, matching, mismatched (each with a reason), unknown }.
export async function checkFlDatasets(submissionId, maxVcpus, datasetIds, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/check-datasets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ submission_id: submissionId, max_vcpus: maxVcpus, dataset_ids: datasetIds }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to check datasets");
  }
  return data;
}

// The caller's own Projects list — fl-orchestrator sees every project,
// anyone else sees only their own (as output owner).
export async function getMyProjects(token) {
  const res = await authFetch(`${GOV_URL}/me/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to fetch projects");
  }
  return data;
}

export async function markNotificationRead(notificationId, token) {
  const res = await authFetch(`${GOV_URL}/me/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to mark notification as read");
  }
  return data;
}

// A selected provider answers a participation request. response is
// "accepted" | "declined"; message is an optional reason for the output owner.
export async function respondToNotification(notificationId, response, message, token) {
  const res = await authFetch(`${GOV_URL}/me/notifications/${encodeURIComponent(notificationId)}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ response, message }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to send participation response");
  }
  return data;
}

// Output owner: data providers removed from an FL session for declining to
// participate a second time ([{ username, reason, removed_at }]).
export async function getRemovedProviders(submissionId, token) {
  const res = await authFetch(`${GOV_URL}/sessions/${encodeURIComponent(submissionId)}/removed-providers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to load removed providers");
  }
  return data?.removed_providers || [];
}

// Output owner: send the final participant roster (who's willing + who was
// selected) to the selected providers, after the consent round.
export async function notifyRoster(selectedProviders, willingProviders, outputOwnerId, submissionId, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/notify-roster`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      selected_providers: selectedProviders,
      willing_providers: willingProviders,
      output_owner_id: outputOwnerId,
      submission_id: submissionId,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to send roster");
  }
  return data;
}

// Output owner: request that the FL session for a submission be started.
// Queues the request for the fl-orchestrator operator (see
// pages/fl_orchestrator/FL_Orchestrator.jsx) rather than starting it directly - the owner
// just gets a "requested, waiting" result back.
export async function queueFlSession(submissionId, participatingProviders, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/queue-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      submission_id: submissionId,
      participating_providers: participatingProviders,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to request FL session start");
  }
  return data;
}

// Signing status of a session's current contract (for FL, the final roster
// contract): {signatures: "matching"|"not matching", tee: "can run"|"cannot run"}.
// "Start FL Session" stays disabled until tee is "can run".
export async function getSessionContractSignatures(submissionId, token) {
  const res = await authFetch(`${GOV_URL}/contracts/by-session/${encodeURIComponent(submissionId)}/signatures`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to check contract signatures");
  }
  return data;
}

// Output owner: second half of "Start Again" - once every provider has signed
// the restart's new contract, queue the session for the fl-orchestrator.
export async function queueRestartedFlSession(submissionId, providerUsernames, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/restart-session/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      submission_id: submissionId,
      provider_usernames: providerUsernames,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to start FL session");
  }
  return data;
}

// Output owner: "Start Again" on a project (ProjectsList.jsx) - builds a new
// contract for the same session and data-provider roster (without redoing
// invite/accept) and sends it to every provider to sign. The session is
// queued afterwards via queueRestartedFlSession, once all have signed.
export async function restartFlSession(submissionId, providerUsernames, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/restart-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      submission_id: submissionId,
      provider_usernames: providerUsernames,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to restart FL session");
  }
  return data;
}

// fl-orchestrator operator: actually kicks off the FL session for a
// submission - notifies every provider on the roster to sign in with their
// own Azure account. outputOwnerUsername attributes the resulting
// notification to the real owner (rather than "fl-orchestrator", the actual
// caller) - see the matching parameter on the backend route.
export async function startFlSession(submissionId, azureToken, participatingProviders, token, outputOwnerUsername) {
  const res = await authFetch(`${GOV_URL}/me/fl/start-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      submission_id: submissionId,
      azure_token: azureToken,
      participating_providers: participatingProviders,
      output_owner_username: outputOwnerUsername,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to start FL session");
  }
  return data;
}

// Data provider: re-enter the P3DX password to authorize this session's
// client VM. The password goes only to p3dx-aaa, which hands the resulting
// VM token straight to the orchestrator - the browser only ever gets back
// an opaque credential_id to pass on to triggerAutoProvision.
export async function issueVmCredential(submissionId, password, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/vm-credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ submission_id: submissionId, password }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED" || !data?.credential_id) {
    const err = new Error(data?.message || data?.error || `Failed to authorize VM (${res.status})`);
    err.code = data?.error || `HTTP_${res.status}`;
    err.statusCode = res.status;
    throw err;
  }
  return { credential_id: data.credential_id, expires_at: data.expires_at };
}

// Data provider: tell the output owner that Azure sign-in for this FL
// session is done, so their dashboard can show it live.
export async function notifyAzureSignIn(ownerUsername, submissionId, token) {
  const res = await authFetch(`${GOV_URL}/me/fl/azure-signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ owner_username: ownerUsername, submission_id: submissionId }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to notify Azure sign-in");
  }
  return data;
}

// Output owner: read back the stored FL session contract (draft before Final
// Roster, finalized after) for a submission id, so it can be viewed in the UI.
export async function getSessionContract(sessionId, token) {
  const res = await authFetch(`${GOV_URL}/contract/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to fetch session contract");
  }
  return data;
}

// Output owner: read back the contract for one specific project (a session
// can have several projects now - draft, final, and any "Start Again"
// restarts each mint their own project_id/contract).
export async function getContractByProject(projectId, token) {
  const res = await authFetch(`${GOV_URL}/contracts/by-project/${encodeURIComponent(projectId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to fetch project contract");
  }
  return data;
}

// Output owner: fetch the participation responses for notifications this user
// sent (each selected provider's accepted/declined status + reason).
export async function getNotificationResponses(token) {
  const res = await authFetch(`${GOV_URL}/me/notifications/sent`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store", // always fetch fresh — the poll must reflect new answers
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to fetch participation responses");
  }
  return data;
}

// Live notification nudges from gov_layer (GET /me/notifications/stream,
// Server-Sent Events). Read with fetch instead of EventSource because the
// stream needs the Authorization header. Calls onNotification on each
// {type:"notification"} event and reconnects after drops, like EventSource.
// Returns a function that closes the stream.
const STREAM_RETRY_MS = 5000;

export function subscribeToNotifications({ onOpen, onNotification, onError }) {
  let closed = false;
  let controller = null;
  let retryTimer = null;

  const connect = async () => {
    controller = new AbortController();
    try {
      const token = await getFreshAccessToken();
      const res = await fetch(`${GOV_URL}/me/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Notification stream failed (${res.status})`);
      onOpen?.();

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const events = buffer.split("\n\n");
        buffer = events.pop();
        for (const event of events) {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              if (JSON.parse(line.slice(5)).type === "notification") onNotification?.();
            } catch {
              // not JSON — ignore
            }
          }
        }
      }
      throw new Error("Notification stream closed");
    } catch (err) {
      if (closed) return;
      onError?.(err);
      retryTimer = setTimeout(connect, STREAM_RETRY_MS);
    }
  };

  connect();
  return () => {
    closed = true;
    clearTimeout(retryTimer);
    controller?.abort();
  };
}
