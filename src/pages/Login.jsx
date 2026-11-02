import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { passwordLogin } from "../api/oidc";

export default function Login() {
    const navigate = useNavigate();
    // Set by the sign-up page after a successful registration.
    const registered = useLocation().state?.registered;
    const [form, setForm] = useState(() => (registered ? { identifier: registered } : {}));
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    // Keycloak accepts either the username or the email as the login name.
    const submit = async () => {
        setError(null);

        const identifier = (form.identifier || "").trim();
        if (!identifier) {
            setError("Please enter your username or email.");
            return;
        }
        if (identifier.includes("@") && !isValidEmail(identifier)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (!(form.password || "")) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);
        try {
            await passwordLogin(identifier, form.password);
            navigate("/app", { replace: true });
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
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
                        Privacy Preserving & Processing Data Exchange <strong>(P3DX)</strong>
                    </div>
                    <div className="hero-desc">
                        Sign in to access services, submit policies, and start secure workloads with contract-backed execution.
                    </div>
                </div>

                <div className="auth-right">
                    <h1 style={{ marginBottom: "6px" }}>Welcome Back</h1>
                    <p style={{ marginBottom: "22px", color: "var(--text-light)" }}>
                        Sign in to your account to continue.
                    </p>

                    {registered && !error && (
                        <div
                            className="info-banner"
                            style={{ backgroundColor: "var(--success-color, #27ae60)", color: "white", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}
                        >
                            Account created. Sign in to continue.
                        </div>
                    )}
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="identifier">Username or Email</label>
                        <input
                            id="identifier"
                            type="text"
                            placeholder="Enter your username or email"
                            value={form.identifier || ""}
                            onChange={(e) =>
                                setForm({ ...form, identifier: e.target.value })
                            }
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
                                placeholder="Enter your password"
                                value={form.password || ""}
                                onChange={(e) =>
                                    setForm({ ...form, password: e.target.value })
                                }
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
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="auth-link">
                        <p>
                            No account? <Link to="/register">Create one</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
