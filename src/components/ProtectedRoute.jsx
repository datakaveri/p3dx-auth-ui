import { Navigate } from "react-router-dom";

function parseHashTokens() {
  const hash = window.location.hash?.slice(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  sessionStorage.setItem("access_token", accessToken);
  const expiresIn = params.get("expires_in");
  const refreshToken = params.get("refresh_token");
  if (expiresIn) sessionStorage.setItem("expires_in", expiresIn);
  if (refreshToken) sessionStorage.setItem("refresh_token", refreshToken);
  // A fresh token may belong to a different user than whatever was cached —
  // drop the prior session's FL submission id so its data doesn't leak
  // into this one.
  sessionStorage.removeItem("last_report_submission_id");

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return accessToken;
}

export default function ProtectedRoute({ children }) {
  // A hash always means a login/redirect just completed with a fresh token —
  // it must win over whatever (possibly a different user's) token is already
  // sitting in sessionStorage from a prior session in this browser.
  let token = parseHashTokens();

  if (!token) {
    token = sessionStorage.getItem("access_token");
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
