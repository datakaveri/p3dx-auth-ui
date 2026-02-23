import { useState } from "react";
import { registerUser } from "../api/auth";

export default function Register() {
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await registerUser(form);

      if (res.status === "SUCCESS") {
        window.location.href = "/login";
      } else {
        setError(res.error || "Registration failed");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      submit();
    }
  };

  return (
    <div className="container">
      <h1>Create Account</h1>
      <p style={{ marginBottom: "32px", color: "var(--text-light)" }}>
        Join us today and get started
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Choose a username"
          value={form.username || ""}
          onChange={e => setForm({ ...form, username: e.target.value })}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          value={form.email || ""}
          onChange={e => setForm({ ...form, email: e.target.value })}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          type="text"
          placeholder="Your first name"
          value={form.firstName || ""}
          onChange={e => setForm({ ...form, firstName: e.target.value })}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          placeholder="Your last name"
          value={form.lastName || ""}
          onChange={e => setForm({ ...form, lastName: e.target.value })}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Create a strong password"
          value={form.password || ""}
          onChange={e => setForm({ ...form, password: e.target.value })}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      <button 
        className="btn btn-primary" 
        onClick={submit}
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <div className="auth-link">
        <p>
          Already registered? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
