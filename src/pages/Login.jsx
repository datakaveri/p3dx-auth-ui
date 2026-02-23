import { useState } from "react";
import { loginUser } from "../api/auth";
import { APP_URL } from "../config";

export default function Login() {
    const [form, setForm] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setError(null);
        setLoading(true);

        try {
            const res = await loginUser(form);
            console.log("LOGIN RESPONSE:", res);

            const token =
                res.access_token ||
                res?.data?.access_token ||
                res?.accessToken;

            if (!token) {
                setError("Login succeeded but token missing");
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
                <label htmlFor="username">Username</label>
                <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={form.username || ""}
                    onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                    }
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={form.password || ""}
                    onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                    }
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                />
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
