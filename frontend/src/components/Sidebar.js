import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Target, Heart, CalendarDays, BarChart3, User2, ChevronRight
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar:collapsed");
    const isCollapsed = saved === "1";
    setCollapsed(isCollapsed);
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar:collapsed", next ? "1" : "0");
      document.body.classList.toggle("sidebar-collapsed", next);
      return next;
    });
  };

  useEffect(() => {
  }, [collapsed]);

  const Item = ({ to, icon: Icon, label, badge }) => {
    const active = pathname.startsWith(to);
    const handleClick = () => {
      
      if (collapsed) {
        localStorage.setItem("sidebar:collapsed", "0");
        document.body.classList.remove("sidebar-collapsed");
        setCollapsed(false);
      }
    };
    return (
      <Link
        to={to}
        onClick={handleClick}
        className={`sb-item ${active ? "is-active" : ""}`}
        data-tooltip={collapsed ? label : undefined}
      >
        <Icon size={18} className="sb-icon" />
        <span className="sb-label">{label}</span>
        {badge ? (
          <span className="sb-badge">{badge}</span>
        ) : (
          <ChevronRight size={16} className="sb-caret" />
        )}
      </Link>
    );
  };

  return (
    <aside className={`sb ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sb-brand">
        <button
          type="button"
          className="sb-logo"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          B
        </button>

        <div className="sb-brand-text">
          <div className="sb-title">BloomUp</div>
          <div className="sb-subtitle">Habit Tracker for Students</div>
        </div>
      </div>

      <nav className="sb-nav">
        <Item to="/home"      icon={Home}         label="Home" />
        <Item to="/habits"    icon={Target}       label="Habits" />
        <Item to="/gratitude" icon={Heart}        label="Gratitude Jar" />
        <Item to="/calendar"      icon={CalendarDays} label="Mood Log" />
        <Item to="/reports"   icon={BarChart3}    label="Reports" />
        <Item to="/profile"   icon={User2}        label="Profile" />
      </nav>
    </aside>
  );
}
