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

function NavIcon({ children }) {
  return (
    <svg
      className="sidebar-link-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  admin: (
    <NavIcon>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
    </NavIcon>
  ),
  roleAccess: (
    <NavIcon>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </NavIcon>
  ),
  services: (
    <NavIcon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </NavIcon>
  ),
  manage: (
    <NavIcon>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </NavIcon>
  ),
  logout: (
    <NavIcon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </NavIcon>
  ),
};

// Positions the cursor-tracking glow (see .sidebar-link::after) at the
// pointer's location within the link, as CSS custom properties.
function trackGlow(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
  e.currentTarget.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
}

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const token = sessionStorage.getItem("access_token");

  const roles = useMemo(() => user?.roles || [], [user]);
  const isAdmin = roles.includes("admin");
  // The fl-orchestrator platform operator (see p3dx-aaa/scripts/create-fl-orchestrator-user.js)
  // gets its own landing page instead of the normal owner/provider flow.
  const isOrchestrator = roles.includes("fl-orchestrator");
  // A user only ever holds one of these two provider roles in practice (same
  // assumption UserDashboard.jsx's keyRoleName makes) — drives which
  // role-exclusive management dashboard the nav "Manage" tab points at.
  const hasInfraProvider = roles.includes("infra-provider");
  const hasDataProvider = roles.includes("data-provider");

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
      navigate(isOrchestrator ? "/app/orchestrator" : isAdmin ? "/app/admin" : "/app/role-request", { replace: true });
    }
  }, [user, isAdmin, isOrchestrator, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    if (isOrchestrator) {
      if (!path.startsWith("/app/orchestrator")) {
        navigate("/app/orchestrator", { replace: true });
      }
      return;
    }
    if (path.startsWith("/app/orchestrator")) {
      navigate("/app/services", { replace: true });
      return;
    }

    if (isAdmin && (path.startsWith("/app/services") || path.startsWith("/app/role-request"))) {
      navigate("/app/admin", { replace: true });
      return;
    }

    if (!isAdmin && path.startsWith("/app/admin")) {
      navigate("/app/services", { replace: true });
    }
  }, [user, isAdmin, isOrchestrator, location.pathname, navigate]);

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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2 style={{ marginBottom: 0 }}>Dashboard</h2>
          <div className="nav-subtitle">
            Signed in as <span style={{ color: "var(--text-dark)", fontWeight: 800 }}>{user.username}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {isAdmin ? (
            <a className={location.pathname.startsWith("/app/admin") ? "sidebar-link sidebar-link-active" : "sidebar-link"} href="/app/admin" onMouseMove={trackGlow}>
              {ICONS.admin}
              <span>Admin</span>
            </a>
          ) : (
            <>
              <a className={location.pathname.startsWith("/app/role-request") ? "sidebar-link sidebar-link-active" : "sidebar-link"} href="/app/role-request" onMouseMove={trackGlow}>
                {ICONS.roleAccess}
                <span>Role Access</span>
              </a>
              <a
                className={
                  location.pathname.startsWith("/app/services") &&
                  !location.pathname.startsWith("/app/services/infra-policy/my") &&
                  !location.pathname.startsWith("/app/services/policies/my")
                    ? "sidebar-link sidebar-link-active"
                    : "sidebar-link"
                }
                href="/app/services"
                onMouseMove={trackGlow}
              >
                {ICONS.services}
                <span>Services</span>
              </a>
              {/* Role-exclusive management dashboards ("My Infrastructure" /
                  "My Datasets") — migrated here from a UserDashboard.jsx
                  action card so they're reachable regardless of which
                  service tab is active. Renders for at most one of the two
                  roles, and not at all otherwise. */}
              {hasInfraProvider || hasDataProvider ? (
                <a
                  className={
                    location.pathname.startsWith("/app/services/infra-policy/my") ||
                    location.pathname.startsWith("/app/services/policies/my")
                      ? "sidebar-link sidebar-link-active"
                      : "sidebar-link"
                  }
                  // Infra-first landing target when a user holds both roles —
                  // the in-page tab switcher on each dashboard (see
                  // MyInfraDashboard.jsx/MyDatasetsDashboard.jsx) is what
                  // makes the other one reachable, not this link.
                  href={hasInfraProvider ? "/app/services/infra-policy/my" : "/app/services/policies/my"}
                  onMouseMove={trackGlow}
                >
                  {ICONS.manage}
                  <span>Manage</span>
                </a>
              ) : null}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-logout"
            onClick={() => {
              sessionStorage.removeItem("access_token");
              sessionStorage.removeItem("last_report_submission_id");
              navigate("/login");
            }}
            style={{ marginTop: 0, width: "100%" }}
          >
            {ICONS.logout}
            Logout
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div key={location.pathname} className="page-enter">
          <Outlet context={{ user, token, isAdmin, refreshUser }} />
        </div>
      </main>
    </div>
  );
}
