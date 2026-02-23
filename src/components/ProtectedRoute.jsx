import { Navigate } from "react-router-dom";

function parseHashTokens() {
  const hash = window.location.hash?.slice(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  localStorage.setItem("access_token", accessToken);
  const expiresIn = params.get("expires_in");
  const refreshToken = params.get("refresh_token");
  if (expiresIn) localStorage.setItem("expires_in", expiresIn);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return accessToken;
}

export default function ProtectedRoute({ children }) {
  let token = localStorage.getItem("access_token");

  if (!token) {
    token = parseHashTokens();
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
