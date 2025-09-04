import { useState } from "react";

export function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // --- Fake API delay for frontend testing ---
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Pretend login succeeded
    onLoginSuccess({ email }); // passes email to App
    setIsLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: "400px",
        margin: "auto",
        padding: "2rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Sign In</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="student@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        />
      </div>

      {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        style={{ width: "100%", padding: "0.75rem" }}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
