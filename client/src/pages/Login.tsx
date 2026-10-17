import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      // Save authentication information
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful!");

      // Go to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
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
          <p>
            Sign in to continue to your workspace.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">

          <div className="form-group">
            <label>Email address</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-options">
            <label className="remember">
              <input type="checkbox" />
              Remember me
            </label>

            <span className="forgot">
              Forgot password?
            </span>
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
          <div className="auth-message">
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