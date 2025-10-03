import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";

export function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

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

    // Simulate backend login
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!email || !password) {
      setError("Please fill all fields");
    } else {
      onLoginSuccess({ email });
      // navigate("/home"); // redirect to home after login
      navigate("/habits", { replace: true });
    }

    setIsLoading(false);
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

        {/* Clickable Sign up text using navigate */}
        <p className="signup-link">
          Don’t have an account?{" "}
          <span
            className="clickable-text"
            onClick={() => navigate("/signup")}
            style={{ color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
          >
            Sign up
          </span>
        </p>
      </div>

      {/* Demo/Admin info outside card */}
      <div className="demo-dashboard">
        <p
          className="clickable-text"
          onClick={() => navigate("/demo")}
          style={{ color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
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
