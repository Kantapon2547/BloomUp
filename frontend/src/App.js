import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import Home from "./pages/Home";
import DemoDashboard from "./pages/DemoDashboard";
import Habits from "./pages/Habits";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import Timer from "./pages/Timer";
import GratitudeJar from "./pages/GratitudeJar";
import Layout from "./components/Layout";
import { TaskProvider } from "./pages/SharedTaskContext";
import "./App.css"; 

function BackgroundHandler() {
  const location = useLocation();

  useEffect(() => {
    // Clear all background classes
    document.body.className = "";

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
    } else if (location.pathname === "/timer") {
      // set timer-bg as base
      document.body.classList.add("timer-bg");
    } else {
      document.body.classList.add("default-bg");
    }
  }, [location.pathname]);

  return null; 
}

// wrapper component to use useNavigate inside Routes
function HabitsWithNav() {
  const navigate = useNavigate();
  return <Habits onNavigateToTimer={() => navigate('/timer')} />;
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
      <TaskProvider>
        <BackgroundHandler />
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
                <HabitsWithNav />
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
          path="/timer"
          element={
            user ? (
              <Layout>
                <Timer />
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
      </TaskProvider>
    </Router>
  );
}

export default App;
