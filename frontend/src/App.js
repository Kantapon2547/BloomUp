import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import Home from "./pages/Home";

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        {/* Default redirect to /login if not logged in */}
        <Route
          path="/"
          element={user ? <Navigate to="/home" /> : <Navigate to="/login" />}
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
      </Routes>
    </Router>
  );
}

export default App;
