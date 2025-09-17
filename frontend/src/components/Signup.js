import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

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

    // client validation
    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm_password)
      return setError("Passwords do not match.");

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Sign up failed");
      }

      // redirect with email prefilled
      navigate("/login", { state: { email: data.email } });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-logo-section">
        <div className="signup-logo-heading">
          <div className="signup-logo">B</div>
          <h1 className="signup-heading">Create Account</h1>
        </div>
        <p className="signup-subtitle">
          Join BloomUp and start building habits 🚀
        </p>
      </div>

      <div className="signup-card">
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

        <p className="login-link">
          Already have an account?{" "}
          <span
            className="clickable-text"
            onClick={() => navigate("/login")}
            style={{
              color: "#007bff",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
