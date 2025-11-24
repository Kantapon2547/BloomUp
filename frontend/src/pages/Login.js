import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import "./style/Login.css";
import { ArrowLeft } from "lucide-react";

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

      console.log("Login response:", data);

      // Store token
      if (data.token) {
        localStorage.setItem("token", data.token);
        console.log("Token stored:", data.token.substring(0, 20) + "...");
      } else {
        throw new Error("No token received from server");
      }

      // Store complete user data
      const loggedInUser = {
        user_id: data.user_id || null,
        email: data.email || email,
        name: data.name || email.split("@")[0],
        bio: data.bio || null,
        profile_picture: data.profile_picture || null,
        created_at: data.created_at || new Date().toISOString(),
      };
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      console.log("User stored:", loggedInUser);

      if (onLoginSuccess) {
        onLoginSuccess(loggedInUser);
      }

      navigate("/home", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

// In handleGoogleSuccess function:
const handleGoogleSuccess = async (credentialResponse) => {
  setIsLoading(true);
  setError("");

  try {
    const decoded = jwtDecode(credentialResponse.credential);
    console.log("Google decoded:", decoded);

    const res = await fetch(`${API}/auth/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: credentialResponse.credential }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || "Google login failed");

    console.log("Backend response:", data);

    // Store token
    if (data.token) {
      localStorage.setItem("token", data.token);
      console.log("BloomUp token stored:", data.token.substring(0, 20) + "...");
    } else {
      throw new Error("No token received from backend");
    }

    const loggedInUser = {
      user_id: data.user_id || null,
      email: data.email || decoded.email,
      name: data.name || decoded.name || decoded.email.split("@")[0],
      bio: data.bio || null,
      profile_picture: data.profile_picture || decoded.picture || null,
      created_at: data.created_at || new Date().toISOString(),
    };
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    console.log("User stored:", loggedInUser);

    if (onLoginSuccess) onLoginSuccess(loggedInUser);
    
    setTimeout(() => {
      navigate("/home", { replace: true });
    }, 100);
  } catch (err) {
    console.error("Google login error:", err);
    setError(err.message || "Google login failed. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  const handleGoogleError = () => {
    console.error("Google login error");
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
          <div className="back-arrow" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={26} color="black" />
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
            <GoogleLogin 
              onSuccess={handleGoogleSuccess} 
              onError={handleGoogleError} 
            />
          </div>

          <p className="signup-link">
            Don't have an account?{" "}
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
