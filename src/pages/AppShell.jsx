import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getMe, refreshAccessToken } from "../api/auth";

// Access tokens are short-lived (Keycloak default is a few minutes). Flows
// like FL/VM provisioning run far longer than that and poll on fixed
// intervals with whatever token they captured, so without a proactive
// refresh those polls start failing with "exp" JWT errors partway through
// and the UI silently stops updating. Decode the token's own exp claim
// (no signature check needed - the browser can't forge a token the backend
// will accept) so the refresh timer tracks whatever lifespan Keycloak issued.
function getTokenExpiryMs(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const REFRESH_BUFFER_MS = 30_000; // refresh 30s before expiry
const MIN_REFRESH_DELAY_MS = 5_000; // never hammer the refresh endpoint

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const token = sessionStorage.getItem("access_token");

  const roles = useMemo(() => user?.roles || [], [user]);
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    Promise.resolve().then(() => setLoading(true));

    getMe(token)
      .then(res => {
        if (res?.status !== "SUCCESS") {
          throw new Error("ME_FAILED");
        }
        setUser(res.user);
      })
      .catch(() => {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("last_report_submission_id");
        navigate("/login", { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  // Roles live in the access token's claims, so a role granted after login
  // (e.g. auto-approved on request) won't show up until the token is
  // reissued. Exchange the refresh token for a fresh one, then re-fetch the
  // profile, so newly-granted roles appear without a full re-login.
  const refreshUser = useCallback(async () => {
    const refreshToken = sessionStorage.getItem("refresh_token");
    let freshToken = sessionStorage.getItem("access_token");

    if (refreshToken) {
      try {
        const tokenRes = await refreshAccessToken(refreshToken);
        if (tokenRes?.access_token) {
          freshToken = tokenRes.access_token;
          sessionStorage.setItem("access_token", tokenRes.access_token);
          if (tokenRes.refresh_token) sessionStorage.setItem("refresh_token", tokenRes.refresh_token);
        }
      } catch (err) {
        console.warn("Failed to refresh access token:", err);
      }
    }

    const res = await getMe(freshToken);
    if (res?.status === "SUCCESS") {
      setUser(res.user);
    }
    return res?.user ?? null;
  }, []);

  // Keep the access token alive in the background for as long as the app is
  // open, so long-running polls (FL/VM provisioning) never run on an expired
  // token. Re-runs whenever `token` changes (i.e. right after each refresh),
  // rescheduling itself against the new token's own expiry.
  useEffect(() => {
    if (!token) return undefined;

    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return undefined;

    const delay = Math.max(expiryMs - Date.now() - REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS);
    const timer = setTimeout(() => {
      refreshUser().catch((err) => console.warn("Background token refresh failed:", err));
    }, delay);

    return () => clearTimeout(timer);
  }, [token, refreshUser]);

  // Non-admins land on the role-request page first after login — a mandatory
  // first stop before the services list. There is no per-service gating
  // beyond this: once here, "Continue to Services" takes them to a plain,
  // ungated services page.
  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    if (path === "/app" || path === "/app/") {
      navigate(isAdmin ? "/app/admin" : "/app/role-request", { replace: true });
    }
  }, [user, isAdmin, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    if (isAdmin && (path.startsWith("/app/services") || path.startsWith("/app/role-request"))) {
      navigate("/app/admin", { replace: true });
      return;
    }

    if (!isAdmin && path.startsWith("/app/admin")) {
      navigate("/app/services", { replace: true });
    }
  }, [user, isAdmin, location.pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="nav-title">
          <h2 style={{ marginBottom: 0 }}>Dashboard</h2>
          <div className="nav-subtitle">
            Signed in as <span style={{ color: "var(--text-dark)", fontWeight: 800 }}>{user.username}</span>
          </div>
        </div>
        <div className="nav-actions">
          {isAdmin ? (
            <a className={location.pathname.startsWith("/app/admin") ? "tab tab-active" : "tab"} href="/app/admin">
              Admin
            </a>
          ) : (
            <>
              <a className={location.pathname.startsWith("/app/role-request") ? "tab tab-active" : "tab"} href="/app/role-request">
                Role Access
              </a>
              <a className={location.pathname.startsWith("/app/services") ? "tab tab-active" : "tab"} href="/app/services">
                Services
              </a>
            </>
          )}
          <button
            className="btn btn-logout"
            onClick={() => {
              sessionStorage.removeItem("access_token");
              sessionStorage.removeItem("last_report_submission_id");
              navigate("/login");
            }}
            style={{ marginTop: 0 }}
          >
            Logout
          </button>
        </div>
      </div>

      <div key={location.pathname} className="page-enter">
        <Outlet context={{ user, token, isAdmin, refreshUser }} />
      </div>
    </div>
  );
}
