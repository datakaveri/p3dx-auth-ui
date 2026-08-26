import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getMe, refreshAccessToken } from "../api/auth";

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("access_token");

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
        localStorage.removeItem("access_token");
        localStorage.removeItem("last_report_submission_id");
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
    const refreshToken = localStorage.getItem("refresh_token");
    let freshToken = localStorage.getItem("access_token");

    if (refreshToken) {
      try {
        const tokenRes = await refreshAccessToken(refreshToken);
        if (tokenRes?.access_token) {
          freshToken = tokenRes.access_token;
          localStorage.setItem("access_token", tokenRes.access_token);
          if (tokenRes.refresh_token) localStorage.setItem("refresh_token", tokenRes.refresh_token);
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
              localStorage.removeItem("access_token");
              localStorage.removeItem("last_report_submission_id");
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
