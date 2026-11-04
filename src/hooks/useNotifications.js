import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyNotifications,
  markNotificationRead,
  respondToNotification,
  dismissNotification,
  notifyAzureSignIn,
  subscribeToNotifications,
} from "../api/auth";
import { signInProviderWithAzure, completeProviderAzureSignIn } from "../api/azureAuth";
import { listMyInfraPolicies } from "../api/policies";

export function parseNotificationPayload(n) {
  try {
    return typeof n?.payload === "string" ? JSON.parse(n.payload || "{}") : (n?.payload || {});
  } catch {
    return {};
  }
}

// Everything the notification bell / panel / FL-session-start sign-in flow
// needs, mounted once in AppShell so it works on any page. The server already
// leaves answered and dismissed notifications out of the list (and the SSE
// nudges), so rows are simply removed locally after respond / dismiss.
export function useNotifications(token, user) {
  const navigate = useNavigate();
  const username = user?.username;
  const roles = useMemo(() => user?.roles || [], [user]);
  const hasDataProvider = roles.includes("provider");
  const hasInfraRole = roles.includes("infra_provider");

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);
  const getToken = () => sessionStorage.getItem("access_token") || tokenRef.current;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [responseDrafts, setResponseDrafts] = useState({});
  const [respondingId, setRespondingId] = useState(null);

  // FL-session-start sign-in modal (auto-opened on a live push, or from the panel).
  const [sessionStartModal, setSessionStartModal] = useState({ open: false, notification: null });
  const [azureSignInResult, setAzureSignInResult] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  // Notification ids already auto-popped, so an unread one doesn't reopen the
  // modal on every refetch.
  const autoOpenedSessionStartIds = useRef(new Set());

  // A data provider also needs the infra_provider role + a filled infra form
  // to be able to say "willing" (enforced by gov_layer).
  const [hasInfraRegistration, setHasInfraRegistration] = useState(null);
  useEffect(() => {
    if (!token || !hasDataProvider || !hasInfraRole) return undefined;
    let cancelled = false;
    listMyInfraPolicies(token)
      .then(res => { if (!cancelled) setHasInfraRegistration(Array.isArray(res?.data) && res.data.length > 0); })
      .catch(() => { if (!cancelled) setHasInfraRegistration(false); });
    return () => { cancelled = true; };
  }, [token, hasDataProvider, hasInfraRole]);
  const canJoinFl = hasDataProvider && hasInfraRole && hasInfraRegistration === true;

  // `isLiveUpdate`: only a fresh SSE push may auto-pop the sign-in modal;
  // initial loads mark existing invites as already seen.
  const fetchNotifications = useCallback(async (isLiveUpdate = false) => {
    const t = getToken();
    if (!t) return;
    setLoading(true);
    try {
      const res = await getMyNotifications(t);
      if (res?.status === "SUCCESS") {
        const list = Array.isArray(res.notifications) ? res.notifications : [];
        setNotifications(list);
        setUnreadCount(res.unread_count || 0);

        const unreadSessionStarts = list.filter(
          (n) => !n.read && parseNotificationPayload(n).kind === "fl_session_start"
        );
        if (isLiveUpdate) {
          const pending = unreadSessionStarts.find((n) => !autoOpenedSessionStartIds.current.has(n.id));
          if (pending) {
            // Marked seen right away so a refetch during the delay can't queue
            // a second pop; the popup is held a few seconds after the owner's
            // sign-in so it doesn't fire in the same instant.
            autoOpenedSessionStartIds.current.add(pending.id);
            setTimeout(() => {
              setAzureSignInResult(null);
              setSessionStartModal({ open: true, notification: pending });
            }, 5000);
          }
        } else {
          unreadSessionStarts.forEach((n) => autoOpenedSessionStartIds.current.add(n.id));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time nudges via SSE, then refetch the canonical list.
  useEffect(() => {
    if (!username) return undefined;
    const close = subscribeToNotifications({
      key: username,
      onOpen: () => setConnected(true),
      onNotification: () => fetchNotifications(true),
      onError: () => setConnected(false),
    });
    fetchNotifications();
    return () => close();
  }, [username, fetchNotifications]);

  const handleMarkRead = useCallback(async (notificationId) => {
    const t = getToken();
    if (!t) return;
    try {
      await markNotificationRead(notificationId, t);
      let wasUnread = false;
      setNotifications(prev => prev.map(n => {
        if (n.id !== notificationId) return n;
        wasUnread = !n.read;
        return { ...n, read: true, read_at: new Date().toISOString() };
      }));
      setUnreadCount(prev => (wasUnread ? Math.max(0, prev - 1) : prev));
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  }, []);

  const removeLocal = (notificationId) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === notificationId);
      if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== notificationId);
    });
  };

  // Server-side dismiss (persists).
  const handleDismiss = async (notificationId) => {
    const t = getToken();
    if (!t) return;
    try {
      await dismissNotification(notificationId, t);
      removeLocal(notificationId);
    } catch (err) {
      console.warn("Failed to dismiss notification:", err);
      setActionError(err.message || "Failed to dismiss notification");
    }
  };

  // Answer a participation request ("accepted" | "declined"), optional reason.
  // finalWarning: declining again removes the provider, so confirm first.
  const handleRespond = async (notificationId, response, finalWarning = false) => {
    const t = getToken();
    if (!t) return;
    if (response === "declined" && finalWarning &&
        !window.confirm("You already declined once for this session. If you decline again, you will be removed from this session. Decline anyway?")) {
      return;
    }
    const message = (responseDrafts[notificationId] || "").trim();
    setRespondingId(notificationId);
    setActionError(null);
    try {
      await respondToNotification(notificationId, response, message, t);
      removeLocal(notificationId);
    } catch (err) {
      console.warn("Failed to send participation response:", err);
      setActionError(err.message || "Failed to send participation response");
    } finally {
      setRespondingId(null);
    }
  };

  const setDraft = (id, value) => setResponseDrafts(prev => ({ ...prev, [id]: value }));

  // After sign-in: tell the owner (best effort), mark the invite read, and
  // send this provider on to the FL Orchestrator page for their own VM.
  const finishAzureSignIn = async (account, ctx) => {
    setAzureSignInResult({ ok: true, text: `Signed in as ${account?.username || "your Azure account"}.` });
    const freshToken = sessionStorage.getItem("access_token") || tokenRef.current;
    if (ctx?.ownerUsername && freshToken) {
      try {
        await notifyAzureSignIn(ctx.ownerUsername, ctx.submissionId, freshToken);
      } catch (err) {
        console.warn("Failed to notify owner of Azure sign-in:", err);
      }
    }
    if (ctx?.notificationId) {
      handleMarkRead(ctx.notificationId);
    }
    if (ctx?.submissionId) {
      // The run page asks for the provider's password next; this modal would
      // cover it, so close it and let the run page say who signed in.
      setSessionStartModal({ open: false, notification: null });
      navigate(`/app/services/fl/orchestrator/${encodeURIComponent(ctx.submissionId)}`, {
        state: {
          role: "data-provider",
          submissionId: ctx.submissionId,
          azureSignedInAs: account?.username || "your Azure account",
        },
      });
    }
  };

  // Resume after a full-page Azure redirect (signInProviderWithAzure uses
  // loginRedirect), which lands back on /app/services/fl with the shell mounted.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    (async () => {
      try {
        const resumed = await completeProviderAzureSignIn();
        if (resumed) {
          setSigningIn(false);
          setSessionStartModal({
            open: true,
            notification: {
              id: resumed.context?.notificationId,
              message: "You've signed in with Azure for this FL session.",
              payload: { submission_id: resumed.context?.submissionId },
            },
          });
          await finishAzureSignIn(resumed.account, resumed.context);
        }
      } catch (err) {
        setAzureSignInResult({ ok: false, text: `Azure sign-in failed: ${err?.message || String(err)}` });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Provider signs in with their own Azure account in response to an FL-session-start invite.
  const joinSession = async (notification) => {
    setSigningIn(true);
    const payload = parseNotificationPayload(notification);
    const context = {
      ownerUsername: payload.output_owner_id,
      submissionId: payload.submission_id,
      notificationId: notification?.id,
    };
    try {
      const result = await signInProviderWithAzure(context);
      if (result.redirected) return; // page is navigating to Microsoft
      await finishAzureSignIn(result.account, context);
    } catch (err) {
      const text = `Azure sign-in failed: ${err?.message || String(err)}`;
      setAzureSignInResult({ ok: false, text });
      if (!sessionStartModal.open) setActionError(text);
    } finally {
      setSigningIn(false);
    }
  };

  const closeSessionStartModal = () => setSessionStartModal({ open: false, notification: null });
  const openSessionStartModal = (notification) => {
    setAzureSignInResult(null);
    setSessionStartModal({ open: true, notification });
  };

  // Per session, only the newest willing/not-willing ask can be answered.
  const latestAskBySession = useMemo(() => {
    const latest = {};
    notifications.forEach(n => {
      const p = parseNotificationPayload(n);
      if (p.kind !== "participation_request" && p.kind !== "participation_update") return;
      const key = p.submission_id || "";
      const prev = latest[key];
      if (!prev || new Date(n.created_at) > new Date(prev.created_at)) latest[key] = n;
    });
    const ids = {};
    Object.entries(latest).forEach(([k, n]) => { ids[k] = n.id; });
    return ids;
  }, [notifications]);

  return {
    notifications, loading, unreadCount, connected, actionError, setActionError,
    responseDrafts, setDraft, respondingId, canJoinFl, latestAskBySession,
    refresh: () => fetchNotifications(),
    handleMarkRead, handleDismiss, handleRespond,
    sessionStartModal, azureSignInResult, signingIn, joinSession,
    closeSessionStartModal, openSessionStartModal,
  };
}
