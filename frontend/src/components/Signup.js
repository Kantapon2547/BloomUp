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

    // Save user to localStorage for profile page
    const userData = {
      name: formData.name,
      email: formData.email,
      bio: "", // optional default bio
      picture: "", // optional default picture
    };
    localStorage.setItem("user", JSON.stringify(userData));

    // Redirect to login and prefill email
    navigate("/login", { state: { email: formData.email } });
  };

  return (
    <div className="signup-container">
      <div className="signup-logo-section">
        <div className="signup-logo-heading">
          <div className="signup-logo">B</div>
          <h1 className="signup-heading">Create Account</h1>
        </div>
        <p className="signup-subtitle">Join BloomUp and start building habits 🚀</p>
      </div>

      <div className="signup-card">
        <form onSubmit={handleSubmit}>
          <div className="signup-input-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
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
              value={formData.email}
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
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="signup-error">{error}</p>}

          <button type="submit">Sign Up</button>
        </form>

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
