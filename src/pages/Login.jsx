import { useState } from "react";
import { loginUser } from "../api/auth";
import { APP_URL } from "../config";

export default function Login() {
    const [form, setForm] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const extractToken = (res) =>
        res?.access_token ||
        res?.data?.access_token ||
        res?.accessToken;

    const isLoginFailureResponse = (res) => {
        if (!res) return true;
        if (res?.status && res.status !== "SUCCESS") return true;
        if (res?.error && !extractToken(res)) return true;
        return false;
    };

    const submit = async () => {
        setError(null);
        setLoading(true);

        try {
            const identifier = (form.identifier || "").trim();
            if (!identifier) {
                setError("Please enter your username or email.");
                setLoading(false);
                return;
            }

            if (identifier.includes("@") && !isValidEmail(identifier)) {
                setError("Please enter a valid email address.");
                setLoading(false);
                return;
            }

            if (!(form.password || "")) {
                setError("Please enter your password.");
                setLoading(false);
                return;
            }

            const password = form.password || "";
            let res;
            let lastErr;

            if (identifier.includes("@")) {
                try {
                    res = await loginUser({ email: identifier, password });
                    console.log("LOGIN RESPONSE (email):", res);
                } catch (e) {
                    lastErr = e;
                    console.log("LOGIN ERROR (email):", e);
                }

                if (!res || isLoginFailureResponse(res)) {
                    try {
                        const retryRes = await loginUser({ username: identifier, password });
                        console.log("LOGIN RESPONSE (fallback username):", retryRes);
                        if (!isLoginFailureResponse(retryRes)) {
                            res = retryRes;
                            lastErr = undefined;
                        }
                    } catch (e) {
                        lastErr = e;
                        console.log("LOGIN ERROR (fallback username):", e);
                    }
                }
            } else {
                try {
                    res = await loginUser({ username: identifier, password });
                    console.log("LOGIN RESPONSE (username):", res);
                } catch (e) {
                    lastErr = e;
                    console.log("LOGIN ERROR (username):", e);
                }
            }

            if (!res) {
                const msg = (lastErr?.message || "").toString();
                const normalized = msg === "INVALID_CREDENTIALS" ? "Invalid username/email or password." : msg;
                setError(normalized || "Login failed. Please try again.");
                setLoading(false);
                return;
            }

            if (isLoginFailureResponse(res)) {
                setError(res?.error || "Invalid username/email or password.");
                setLoading(false);
                return;
            }

            const token = extractToken(res);

            if (!token) {
                setError("Login failed. Please check your credentials and try again.");
                setLoading(false);
                return;
            }

            const expiresIn = res.expires_in ?? res?.data?.expires_in ?? res?.expiresIn ?? "";
            const refreshToken = res.refresh_token ?? res?.data?.refresh_token ?? res?.refreshToken ?? "";

            const params = new URLSearchParams();
            params.set("access_token", token);
            if (expiresIn) params.set("expires_in", String(expiresIn));
            if (refreshToken) params.set("refresh_token", refreshToken);

            const redirectUrl = `${APP_URL}/app#${params.toString()}`;
            window.location.href = redirectUrl;
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
        <div className="container">
            <h1>Welcome Back</h1>
            <p style={{ marginBottom: "32px", color: "var(--text-light)" }}>
                Sign in to your account to continue
            </p>

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
                    No account? <a href="/register">Create one</a>
                </p>
            </div>
        </div>
    );
}
