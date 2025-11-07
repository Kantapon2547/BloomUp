import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import Home from "./pages/Home";
import DemoDashboard from "./pages/DemoDashboard";
import Habits from "./pages/Habits";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import GratitudeJar from "./pages/GratitudeJar";
import Layout from "./components/Layout";
import "./App.css"; // ✅ move CSS rules here

// ✅ A helper component to handle background updates
function BackgroundHandler() {
  const location = useLocation();

  useEffect(() => {
    document.body.className = ""; // reset previous class

    if (location.pathname === "/home") {
      document.body.classList.add("home-bg");
    } else if (location.pathname === "/gratitude") {
      document.body.classList.add("gratitude-bg");
    } else if (location.pathname === "/habits") {
      document.body.classList.add("habits-bg");
    } else if (location.pathname === "/reports") {
      document.body.classList.add("reports-bg");
    } else if (location.pathname === "/calendar") {
      document.body.classList.add("calendar-bg");
    } else if (location.pathname === "/profile") {
      document.body.classList.add("profile-bg");
    } else {
      // default for login, signup, demo, etc.
      document.body.classList.add("default-bg");
    }
  }, [location.pathname]);

  return null; // this component only manages body classes
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "30vh" }}>Loading...</div>;
  }

  return (
    <Router>
      <BackgroundHandler /> {/* ✅ keeps background synced with route */}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<DemoDashboard user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login onLoginSuccess={setUser} />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            user ? (
              <Layout>
                <Home user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/habits"
          element={
            user ? (
              <Layout>
                <Habits />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/reports"
          element={
            user ? (
              <Layout>
                <Reports />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/gratitude"
          element={
            user ? (
              <Layout>
                <GratitudeJar />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/calendar"
          element={
            user ? (
              <Layout>
                <Calendar />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <Layout>
                <Profile />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
