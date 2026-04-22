import { useState } from "react";
import { registerUser } from "../api/auth";

export default function Register() {
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const applyRegisterError = (errOrMessage) => {
    const msg = (typeof errOrMessage === "string"
      ? errOrMessage
      : (errOrMessage?.message || errOrMessage?.data?.error || errOrMessage?.data?.message || "Registration failed")
    ).toString();
    const upper = msg.toUpperCase();
    const lower = msg.toLowerCase();
    const nextFieldErrors = {};

    const statusCode = typeof errOrMessage === "object" ? errOrMessage?.statusCode : undefined;
    const data = typeof errOrMessage === "object" ? errOrMessage?.data : undefined;
    const conflictFieldRaw = data?.field || data?.conflictField || data?.errorField || data?.key;
    const conflictField = typeof conflictFieldRaw === "string" ? conflictFieldRaw.toLowerCase() : "";

    const emailValue = (form.email || "").trim();
    const emailLower = emailValue.toLowerCase();
    const usernameValue = (form.username || "").trim();
    const usernameLower = usernameValue.toLowerCase();

    if (statusCode === 409) {
      if (conflictField.includes("email")) {
        nextFieldErrors.email = "Email already exists.";
      } else if (conflictField.includes("user") || conflictField.includes("username")) {
        nextFieldErrors.username = "Username already exists.";
      }
    }

    if (upper === "EMAIL_ALREADY_EXISTS" || upper.includes("EMAIL_ALREADY_EXISTS")) {
      nextFieldErrors.email = "Email already exists.";
    }

    if (upper === "USERNAME_ALREADY_EXISTS" || upper.includes("USERNAME_ALREADY_EXISTS")) {
      const messageMentionsEmail = /\bemail\b/.test(lower) || (emailLower && lower.includes(emailLower));
      const messageMentionsUsername = /\busername\b/.test(lower) || (usernameLower && lower.includes(usernameLower));
      if (messageMentionsEmail) {
        nextFieldErrors.email = "Email already exists.";
      } else if (messageMentionsUsername) {
        nextFieldErrors.username = "Username already exists.";
      } else {
        nextFieldErrors.email = "Email or username already exists.";
        nextFieldErrors.username = "Email or username already exists.";
      }
    }

    const isConflict = lower.includes("exist") || lower.includes("already");
    if (Object.keys(nextFieldErrors).length === 0 && isConflict) {
      const email = emailLower;
      const username = usernameLower;

      const mentionsEmail = /\bemail\b/.test(lower) || (email && lower.includes(email));
      const mentionsUsername = /\busername\b/.test(lower) || (username && lower.includes(username));

      if (mentionsEmail && !mentionsUsername) {
        nextFieldErrors.email = "Email already exists.";
      } else if (mentionsUsername && !mentionsEmail) {
        nextFieldErrors.username = "Username already exists.";
      } else if (mentionsEmail && mentionsUsername) {
        nextFieldErrors.email = "Email already exists.";
        nextFieldErrors.username = "Username already exists.";
      } else {
        nextFieldErrors.email = "Email or username already exists.";
        nextFieldErrors.username = "Email or username already exists.";
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setError(msg);
  };

  const validate = () => {
    const nextErrors = {};

    const username = (form.username || "").trim();
    if (username.length < 4) {
      nextErrors.username = "Username must be at least 4 characters.";
    }

    const email = (form.email || "").trim();
    if (email && !isValidEmail(email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    const password = form.password || "";
    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    } else {
      if (!/[A-Z]/.test(password)) {
        nextErrors.password = "Password must include at least 1 capital letter.";
      } else if (!/[^A-Za-z0-9]/.test(password)) {
        nextErrors.password = "Password must include at least 1 special character.";
      }
    }

    const confirmPassword = form.confirmPassword || "";
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    setError(null);
    setFieldErrors({});

    if (!validate()) return;

    setLoading(true);

    try {
      const { ...payload } = form;
      delete payload.confirmPassword;
      const res = await registerUser(payload);

      if (res.status === "SUCCESS") {
        window.location.href = "/login";
      } else {
        applyRegisterError(res.error || res.message || "Registration failed");
        setLoading(false);
      }
    } catch (err) {
      applyRegisterError(err);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      submit();
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-left">
          <div className="brand">
            <div>
              <div className="brand-name">Data For Public Good</div>
              <div className="brand-sub">Secure data workflows</div>
            </div>
          </div>

          <div className="hero-title">
            Create your account for secure <strong>workload execution</strong>
          </div>
          <div className="hero-desc">
            Registration enables role requests, policy submission (data-provider), and workload runs with signed contracts.
          </div>
        </div>

        <div className="auth-right">
          <h1 style={{ marginBottom: "6px" }}>Create Account</h1>
          <p style={{ marginBottom: "22px", color: "var(--text-light)" }}>
            Join us today and get started.
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
            {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
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
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
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
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={form.password || ""}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.584 10.587A2 2 0 0 0 13.414 13.413" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.88 5.076A10.54 10.54 0 0 1 12 4c7 0 10 8 10 8a18.67 18.67 0 0 1-3.18 4.304" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.61 6.61A18.67 18.67 0 0 0 2 12s3 8 10 8a10.54 10.54 0 0 0 5.12-1.324" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
              </button>
            </div>
            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
          </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className="password-input-wrapper">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            value={form.confirmPassword || ""}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword(v => !v)}
            disabled={loading}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.584 10.587A2 2 0 0 0 13.414 13.413" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.88 5.076A10.54 10.54 0 0 1 12 4c7 0 10 8 10 8a18.67 18.67 0 0 1-3.18 4.304" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.61 6.61A18.67 18.67 0 0 0 2 12s3 8 10 8a10.54 10.54 0 0 0 5.12-1.324" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <div className="field-error">{fieldErrors.confirmPassword}</div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={loading}
        type="button"
      >
        {loading ? "Creating..." : "Create Account"}
      </button>

      <div className="auth-link">
        <p>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>

        </div>
      </div>
    </div>
  );
}
