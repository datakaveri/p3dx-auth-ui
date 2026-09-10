import { BACKEND_URL } from "../config";

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

export async function registerUser(payload) {
  const res = await fetch(`${BACKEND_URL}/p3dx/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Register failed");
  }
  return data;
}

export async function loginUser(payload) {
  const res = await fetch(`${BACKEND_URL}/p3dx/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Login failed");
  }
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${BACKEND_URL}/p3dx/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Refresh failed");
  }
  return data;
}

export async function getMe(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Unauthorized");
  }
  return data;
}

export async function notifyProviders(selectedProviders, requestedProviders, outputOwnerId, submissionId, token, willingProviders = []) {
  const res = await fetch(`${BACKEND_URL}/p3dx/notify-providers`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/my-notifications`, {
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

export async function markNotificationRead(notificationId, token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/notifications/${notificationId}/read`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/notifications/${notificationId}/respond`, {
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

// Output owner: send the final participant roster (who's willing + who was
// selected) to the selected providers, after the consent round.
export async function notifyRoster(selectedProviders, willingProviders, outputOwnerId, submissionId, token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/notify-roster`, {
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
export async function queueFlSession(submissionId, participatingProviders, vmName, token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/gov/queue-fl-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      submission_id: submissionId,
      participating_providers: participatingProviders,
      vm_name: vmName,
    }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.status === "FAILED") {
    throw buildHttpError(res, data, "Failed to request FL session start");
  }
  return data;
}

// fl-orchestrator operator: actually kicks off the FL session for a
// submission - notifies every provider on the roster to sign in with their
// own Azure account. outputOwnerUsername attributes the resulting
// notification to the real owner (rather than "fl-orchestrator", the actual
// caller) - see the matching parameter on the backend route.
export async function startFlSession(submissionId, azureToken, participatingProviders, token, outputOwnerUsername) {
  const res = await fetch(`${BACKEND_URL}/p3dx/gov/start-fl-session`, {
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

// Data provider: tell the output owner that Azure sign-in for this FL
// session is done, so their dashboard can show it live.
export async function notifyAzureSignIn(ownerUsername, submissionId, token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/gov/azure-signin`, {
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
  const res = await fetch(`${BACKEND_URL}/p3dx/contract/${encodeURIComponent(sessionId)}`, {
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

// Output owner: fetch the participation responses for notifications this user
// sent (each selected provider's accepted/declined status + reason).
export async function getNotificationResponses(token) {
  const res = await fetch(`${BACKEND_URL}/p3dx/notification-responses`, {
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
