// src/pages/Home.js
export default function Home({ user }) {
  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>Welcome, {user?.email || "User"}!</h1>
      <p>You have successfully logged in.</p>
    </div>
  );
}
