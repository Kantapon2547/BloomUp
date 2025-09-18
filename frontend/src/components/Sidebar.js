import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Target, Heart, CalendarDays, FileText, BarChart3, User2, ChevronRight
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar() {
  const { pathname } = useLocation();

  const Item = ({ to, icon: Icon, label, badge }) => {
    const active = pathname.startsWith(to);
    return (
      <Link to={to} className={`sb-item ${active ? "is-active" : ""}`}>
        <Icon size={18} />
        <span className="sb-label">{label}</span>
        {badge ? <span className="sb-badge">{badge}</span> : <ChevronRight size={16} className="sb-caret" />}
      </Link>
    );
  };

  return (
    <aside className="sb">
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-logo">B</div>
        <div>
          <div className="sb-title">BloomUp</div>
          <div className="sb-subtitle">Habit Tracker for Students</div>
        </div>
      </div>

      {/* Profile (mock)
      <div className="sb-profile">
        <div className="sb-avatar">🙂</div>
        <div className="sb-profile-text">
          <div className="sb-name">Student User</div>
          <div className="sb-status">
            <span className="sb-dot" /> online
          </div>
        </div>
      </div> */}

      {/* Nav */}
      <nav className="sb-nav">
        <Item to="/home"   icon={Home}        label="Home" />
        <Item to="/habits" icon={Target}      label="Habits" />
        <Item to="/gratitude" icon={Heart}    label="Gratitude Jar" />
        <Item to="/mood"   icon={CalendarDays} label="Mood Log" />
        <Item to="/reports" icon={BarChart3}  label="Reports" />
        <Item to="/profile" icon={User2}      label="Profile" />
      </nav>
    </aside>
  );
}