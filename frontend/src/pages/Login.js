import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./style/Login.css";

export function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const API =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  // Prefill email if coming from signup
  const prefillEmail = location.state?.email || "";

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(prefillEmail);
  }, [prefillEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Login failed");
      }

      // Save token if backend returns one
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      // when success, go to homepage
      if (onLoginSuccess) {
        const loggedInUser = { email };
        localStorage.setItem("user", JSON.stringify(loggedInUser));
        onLoginSuccess(loggedInUser);
        navigate("/home", { replace: true });
      }

    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="logo-section">
        <div className="logo">B</div>
        <h1>BloomUp</h1>
        <p>Your personal habit tracker for student success</p>
      </div>

      <div className="login-card">
        <h2>Welcome Back</h2>
        <p>Sign in to continue your wellness journey</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="signup-link">
          Don’t have an account?{" "}
          <span
            className="clickable-text"
            onClick={() => navigate("/signup")}
            style={{
              color: "#007bff",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Sign up
          </span>
        </p>
      </div>

      <div className="demo-dashboard">
        <p
          className="clickable-text"
          onClick={() => navigate("/demo")}
          style={{
            color: "#007bff",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Try Demo Dashboard
        </p>
        <p>
          Admin login: <span>admin@bloomup.com</span> (any password)
        </p>
      </div>
    </div>
  );
}