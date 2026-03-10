import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return navigate("/login");

    getMe(token)
      .then(res => {
        if (res.status === "SUCCESS") {
          setUser(res.user);
        } else {
          throw new Error();
        }
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        navigate("/login");
      });
  }, [navigate]);

  if (!user) {
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
        <h2>Dashboard</h2>
        <button
          className="btn btn-logout"
          onClick={() => {
            localStorage.removeItem("access_token");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ 
          fontSize: "18px", 
          fontWeight: "600", 
          marginBottom: "12px",
          color: "var(--text-dark)"
        }}>
          Your Profile
        </h3>
        <p style={{ 
          color: "var(--text-light)",
          marginBottom: "16px"
        }}>
          Welcome back! Here's your account information:
        </p>
      </div>

      <div className="user-info">
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
}
