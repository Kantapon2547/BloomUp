import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

export function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");

    // Simulate backend signup
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log("Signup successful:", formData);

    // Redirect to login and prefill email
    navigate("/login", { state: { email: formData.email } });
  };

  return (
    <div className="signup-container">
      <div className="signup-logo-section">
        <div className="signup-logo">B</div>
        <h1>Create Account</h1>
        <p>Join BloomUp and start building habits 🚀</p>
      </div>

      <div className="signup-card">
        <form onSubmit={handleSubmit}>
          <div className="signup-input-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-input-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-input-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="signup-error">{error}</p>}

          <button type="submit">Sign Up</button>
        </form>

        {/* Clickable Sign in text */}
        <p className="login-link">
          Already have an account?{" "}
          <span
            className="clickable-text"
            onClick={() => navigate("/login")}
            style={{ color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
}
