import React from "react";
import { NavLink } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  const navLinks = [
    { path: "/home", label: "Home" },
    { path: "/gratitude", label: "Gratitude" },
    { path: "/calendar", label: "Mood" },
    { path: "/reports", label: "Report" },
    { path: "/habits", label: "Habit" },
    { path: "/profile", label: <span className="material-symbols-outlined">account_circle</span> },
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

      </div>
    </nav>
  );
};

export default Navbar;
