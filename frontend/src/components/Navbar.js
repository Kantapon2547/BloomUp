import React from "react";
import { Link } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  return (
    <nav className="navbar">
  <div className="navbar-left">
    <h1 className="navbar-title">BloomUp</h1>
  </div>

  <div className="navbar-right">
    <div className="navbar-center">
      <Link to="/home" className="nav-link">Home</Link>
      <Link to="/gratitude" className="nav-link">Gratitude</Link>
      <Link to="/calendar" className="nav-link">Mood</Link>
      <Link to="/reports" className="nav-link">Report</Link>
      <Link to="/habits" className="nav-link">Habit</Link>
      <Link to="/profile" className="nav-link">Profile</Link>
    </div>

    <button className="logout-btn" onClick={onLogout}>
        <FiLogOut size={20} />
    </button>

  </div>
</nav>

  );
};

export default Navbar;
