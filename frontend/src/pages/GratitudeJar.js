import React, { useState, useEffect, useRef } from "react";
import "./style/GratitudeJar.css";
import { Heart } from "lucide-react";

const categoryColors = {
  "Simple Pleasures": "simple-pleasures",
  Relationships: "relationships",
  Achievements: "achievements",
  Nature: "nature",
  Learning: "learning",
  Family: "family",
  Work: "work",
};

const GratitudeJar = () => {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("gratitudeEntries");
    return saved ? JSON.parse(saved) : [];
  });
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("gratitudeEntries", JSON.stringify(entries));
  }, [entries]);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const addEntry = () => {
    if (!text.trim()) return setError("⚠️ Please enter your gratitude message.");
    if (!category) return setError("⚠️ Please select a category before adding your entry.");
    if (text.length > 200) return setError("⚠️ Your gratitude entry should not exceed 200 characters.");

    setError("");
    const newEntry = {
      id: Date.now(),
      text,
      category,
      date: formatDate(new Date()),
    };
    setEntries([newEntry, ...entries]);
    setText("");
    setCategory("");
  };

  const deleteEntry = (id) => setEntries(entries.filter((entry) => entry.id !== id));

  const today = formatDate(new Date());

  // Close dropdown if click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app-container">
      <main className="main-content">
        <h1 className="page-title">
          Gratitude Jar <Heart className="w-8 h-8 text-purple-500" />
        </h1>
        <p className="page-description">
          Reflect on the positive moments in your day.
        </p>

        {/* Stats */}
        <div className="stats-container">
          <div className="stat-card purple">
            <h2>{entries.length}</h2>
            <p>Total {entries.length === 1 ? "Entry" : "Entries"}</p>
          </div>
          <div className="stat-card blue">
            <h2>{entries.filter((e) => e.date === today).length}</h2>
            <p>Added Today</p>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="entry-form">
          <h3>➕ What are you grateful for today?</h3>
          <textarea
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 200) {
                setText(value);
                setError("");
              } else {
                setError("⚠️ Your gratitude entry should not exceed 200 characters.");
              }
            }}
            placeholder="I'm grateful for..."
          />

          {/* Custom Dropdown */}
          <div className="custom-dropdown" ref={dropdownRef}>
            <button
              className={`dropdown-toggle ${category ? "selected" : ""}`}
              onClick={() => setOpen(!open)}
              aria-expanded={open}
            >
              {category || "Select Category"}
            </button>
            {open && (
              <ul className="dropdown-list">
                {Object.keys(categoryColors).map((cat) => (
                  <li
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setOpen(false);
                      setError("");
                    }}
                    style={{
                      backgroundColor: category === cat ? "rgba(122, 90, 248, 0.1)" : "",
                    }}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          <button onClick={addEntry}>Add Entry</button>
        </div>

        {/* Gratitude Collection */}
        <h2 className="collection-title">Your Gratitude Collection</h2>
        <div className="entries-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-header">
                <span className={`category ${categoryColors[entry.category] || "general"}`}>
                  {entry.category}
                </span>
                <span className="date">{entry.date}</span>
              </div>
              <p className="entry-text">{entry.text}</p>
              <div className="entry-footer">
                <span className="tag">💜 Grateful moment</span>
                <span
                  className="delete-icon"
                  onClick={() => deleteEntry(entry.id)}
                  title="Delete entry"
                >
                  🗑️
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default GratitudeJar;