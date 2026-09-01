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
