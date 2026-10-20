
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = (
    import.meta.env.VITE_API_URL ||
    "https://intellmeet-backend-tqot.onrender.com"
  ).replace(/\/$/, "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span>✦</span>
          <h1>IntellMeet</h1>
        </div>

        <div className="auth-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your workspace.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="auth-options">
            <label className="remember">
              <input type="checkbox" />
              Remember me
            </label>
            <span className="forgot">Forgot password?</span>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && (
          <div className="auth-message" role="status">
            {message}
          </div>
        )}

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="auth-signup">
          Don't have an account?{" "}
          <Link to="/register">Create account</Link>
        </div>

        <Link to="/" className="back-home">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default Login;
