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
      document.body.classList.add("timer-bg");
    } else {
      document.body.classList.add("default-bg");
    }
  }, [location.pathname]);

  return null; 
}

// Prevents component render until auth is ready
function ProtectedRoute({ isAuthenticated, isLoading, children }) {
  if (isLoading) {
    return <div style={{ textAlign: "center", marginTop: "30vh" }}>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

function HabitsWithNav() {
  const navigate = useNavigate();
  return <Habits onNavigateToTimer={() => navigate('/timer')} />;
}

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Check auth on mount only
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    
    console.log("=== APP INIT ===");
    console.log("Token in storage:", !!token);
    console.log("User in storage:", !!savedUser);
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log("User authenticated:", parsedUser.email);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    
    // Mark auth check as complete
    setIsAuthChecked(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      
      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          console.log("Auth state updated from storage:", parsedUser.email);
        } catch (error) {
          console.error("Failed to parse user on storage change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (!isAuthChecked) {
    return <div style={{ textAlign: "center", marginTop: "30vh" }}>Loading...</div>;
  }

  return (
    <Router>
      <TaskProvider>
        <BackgroundHandler />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<DemoDashboard user={user} setUser={setUser} />} />
          <Route 
            path="/login" 
            element={<Login onLoginSuccess={(newUser) => {
              console.log("Login callback triggered");
              setUser(newUser);
            }} />} 
          />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes with guard */}
          <Route
            path="/home"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <Home user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/habits"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <HabitsWithNav />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timer"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <Timer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gratitude"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <GratitudeJar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={!!user} isLoading={isLoading}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TaskProvider>
    </Router>
  );
}

export default App;
