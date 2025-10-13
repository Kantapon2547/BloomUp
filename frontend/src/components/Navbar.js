import React from "react";
import { NavLink } from "react-router-dom"; // <-- use NavLink
import { FiLogOut } from "react-icons/fi";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  const navLinks = [
    { path: "/home", label: "Home" },
    { path: "/gratitude", label: "Gratitude" },
    { path: "/calendar", label: "Mood" },
    { path: "/reports", label: "Report" },
    { path: "/habits", label: "Habit" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">BloomUp</h1>
      </div>

      <div className="navbar-right">
        <div className="navbar-center">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <button className="logout-btn" onClick={onLogout}>
          <FiLogOut size={20} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;