import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import "./GratitudeJar.css";

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
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");

  const addEntry = () => {
    if (!text.trim()) return;
    const newEntry = {
      id: Date.now(),
      text,
      category: category || "General",
      date: new Date().toLocaleDateString(),
    };
    setEntries([newEntry, ...entries]);
    setText("");
    setCategory("");
  };

  // Delete function
  const deleteEntry = (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content">
        <h1 className="page-title">
          Gratitude Jar <span className="heart">💜</span>
        </h1>
        <p className="page-description">
          Reflect on the positive moments in your day and keep track of what you’re grateful for.
        </p>

        {/* Stats */}
        <div className="stats-container">
          <div className="stat-card purple">
            <h2>{entries.length}</h2>
            <p>Total Entries</p>
          </div>
          <div className="stat-card blue">
            <h2>
              {
                entries.filter(
                  (e) => e.date === new Date().toLocaleDateString()
                ).length
              }
            </h2>
            <p>Added Today</p>
          </div>
        </div>

        {/* Add Entry */}
        <div className="entry-form">
          <h3>➕ What are you grateful for today?</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I'm grateful for..."
          />

          {/* Category Select */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category (optional)</option>
            {Object.keys(categoryColors).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button onClick={addEntry}>Add Entry</button>
        </div>

        {/* Gratitude Collection */}
        <h2 className="collection-title">Your Gratitude Collection</h2>
        <div className="entries-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-header">
                <span
                  className={`category ${
                    categoryColors[entry.category] || "general"
                  }`}
                >
                  {entry.category}
                </span>
                <span className="date">{entry.date}</span>
              </div>
              <p>{entry.text}</p>
              <div className="entry-footer">
                <span className="tag">💜 Grateful moment</span>
                {/* Delete Icon */}
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
