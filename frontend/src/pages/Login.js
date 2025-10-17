import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import "./style/Login.css";

export function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const API =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

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
      if (!res.ok) throw new Error(data?.detail || "Login failed");

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

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

  // ✅ Google login success handler
  const handleGoogleSuccess = async (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    console.log("Google User:", decoded);

    // Optionally send credential to backend for verification:
    // const res = await fetch(`${API}/auth/google-login`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ token: credentialResponse.credential }),
    // });

    const loggedInUser = {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };

    localStorage.setItem("user", JSON.stringify(loggedInUser));
    if (onLoginSuccess) onLoginSuccess(loggedInUser);
    navigate("/home", { replace: true });
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };

  return (
    <div className="login-page-wrapper">
      {/* Left Section */}
      <div className="left-section">
        <div className="illustration">
          <img
            src="https://images.rawpixel.com/image_social_square/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA4L3Jhd3BpeGVsX29mZmljZV8yNl9taW5pbWFsX2Flc3RoZXRpY19iYWNrZ3JvdW5kX29mX2hvbG9ncmFwaHlfdF8wZGZjNTNlZi00MGVjLTRkMTQtODM0OS1mODYxYWNkMDViMGVfMS5qcGc.jpg"
            alt="Illustration"
            className="illustration-img"
          />
          <h2>Welcome to BloomUp 🌱</h2>
          <p>Join us and start growing better habits every day!</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="right-section">
        <div className="login-card">
          {/* Back Arrow */}
          <div className="back-arrow" onClick={() => navigate("/demo")}>
            <img src="/arrow_back.png" alt="Back" className="arrow-icon" />
          </div>

          {/* Logo + Header */}
          <div className="logo-section">
            <div className="logo">B</div>
            <h1>Welcome Back</h1>
            <p>Sign in to continue your wellness journey</p>
          </div>

          {/* Email/Password Login */}
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

          {/* Divider */}
          <div className="divider">
            <span>OR</span>
          </div>

          {/* Google Login Button */}
          <div className="google-login">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>

          <p className="signup-link">
            Don’t have an account?{" "}
            <span
              className="clickable-text"
              onClick={() => navigate("/signup")}
              style={{
                color: "#7c3aed",
                cursor: "pointer",
                textDecoration: "underline",
                fontWeight: "600",
              }}
            >
              Sign up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
