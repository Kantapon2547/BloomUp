import { useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import Home from "./pages/Home";
import DemoDashboard from "./components/DemoDashboard";
import Habits from "./components/Habits";
import Profile from "./pages/Profile";
import Calendar from "./components/Calendar";

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        {/* Calendar page */}
        <Route path="/calendar" element={<Calendar />} />

        {/* Root route shows demo dashboard */}
        <Route
          path="/"
          element={<DemoDashboard user={user} setUser={setUser} />}
        />

        {/* Login page */}
        <Route
          path="/login"
          element={<Login onLoginSuccess={setUser} />}
        />

        {/* Signup page */}
        <Route path="/signup" element={<Signup />} />

        {/* Protected home page */}
        <Route
          path="/home"
          element={user ? <Home user={user} /> : <Navigate to="/login" />}
        />

        {/* Demo Dashboard page */}
        <Route path="/demo" element={<DemoDashboard />} />

        {/* Habits page */}
        <Route path="/habits" element={<Habits />} />

        {/* Profile page */}
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
