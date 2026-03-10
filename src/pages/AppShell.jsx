import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";

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
        navigate("/login", { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    if (path === "/app" || path === "/app/") {
      navigate(isAdmin ? "/app/admin" : "/app/services", { replace: true });
    }
  }, [user, isAdmin, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    if (isAdmin && path.startsWith("/app/services")) {
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
        <div>
          <h2 style={{ marginBottom: 0 }}>Dashboard</h2>
          <div style={{ marginTop: "6px", color: "var(--text-light)", fontSize: "14px" }}>
            Signed in as <span style={{ color: "var(--text-dark)", fontWeight: 700 }}>{user.username}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isAdmin ? (
            <a className={location.pathname.startsWith("/app/admin") ? "tab tab-active" : "tab"} href="/app/admin">
              Admin
            </a>
          ) : (
            <a className={location.pathname.startsWith("/app/services") ? "tab tab-active" : "tab"} href="/app/services">
              Services
            </a>
          )}
          <button
            className="btn btn-logout"
            onClick={() => {
              localStorage.removeItem("access_token");
              navigate("/login");
            }}
            style={{ marginTop: 0 }}
          >
            Logout
          </button>
        </div>
      </div>

      <Outlet context={{ user, token, isAdmin }} />
    </div>
  );
}
