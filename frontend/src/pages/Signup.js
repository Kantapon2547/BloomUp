import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./style/Signup.css";

export function Signup() {
  const navigate = useNavigate();
  const API =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm_password)
      return setError("Passwords do not match.");

    try {
      setSubmitting(true);
      
      // Sign up first
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.full_name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Sign up failed");

      console.log("Signup successful:", data);

      // Auto-login after signup
      const loginRes = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData?.detail || "Login after signup failed");

      console.log("Auto-login after signup successful");

      // Store token (matches Calendar.js)
      if (loginData.token) {
        localStorage.setItem("token", loginData.token);
        console.log("Token stored:", loginData.token.substring(0, 20) + "...");
      } else {
        throw new Error("No token received from server");
      }

      // Store complete user data
      const loggedInUser = {
        user_id: loginData.user_id || null,
        email: loginData.email || form.email,
        name: loginData.name || form.full_name,
        bio: loginData.bio || null,
        profile_picture: loginData.profile_picture || null,
        created_at: loginData.created_at || new Date().toISOString(),
      };
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      console.log("User stored:", loggedInUser);

      // Wait before navigation
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 100);
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="signup-page-wrapper">
      {/* Left Section */}
      <div className="signup-left-section">
        <div className="back-arrow" onClick={() => navigate("/login")}>
          <ArrowLeft size={26} color="black" />
        </div>
        <div className="signup-illustration">
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
      <div className="signup-right-section">
        <div className="signup-card">
          <div className="signup-logo-section">
            <div className="signup-logo">B</div>
            <h1 className="signup-heading">Create Account</h1>
            <p className="signup-subtitle">
              Join BloomUp and start building better habits 🌱
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="signup-input-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                placeholder="Enter your full name"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="signup-input-group">
              <label htmlFor="confirm_password">Confirm Password</label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                placeholder="Confirm your password"
                value={form.confirm_password}
                onChange={handleChange}
                required
              />
            </div>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          {/* Already have an account */}
          <div className="signin-link">
            <p>
              Already have an account?{" "}
              <span onClick={() => navigate("/login")} className="signin-text">
                Sign in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
