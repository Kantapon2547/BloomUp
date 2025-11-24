import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { path: "/home", label: "Home" },
    { path: "/gratitude", label: "Gratitude" },
    { path: "/calendar", label: "Mood" },
    { path: "/habits", label: "Habit" },
    { path: "/reports", label: "Report" },
    { path: "/profile", label: <span className="material-symbols-outlined">account_circle</span> },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogoClick = () => {
    navigate("/");
    closeMenu();
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title" onClick={handleLogoClick} style={{ cursor: "pointer" }}>
          BloomUp
        </h1>
      </div>

      <button className="hamburger" onClick={toggleMenu}>
        <span className={`hamburger-line ${isMenuOpen ? "open" : ""}`}></span>
        <span className={`hamburger-line ${isMenuOpen ? "open" : ""}`}></span>
        <span className={`hamburger-line ${isMenuOpen ? "open" : ""}`}></span>
      </button>

      <div className={`navbar-right ${isMenuOpen ? "active" : ""}`}>
        <div className="navbar-center">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
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