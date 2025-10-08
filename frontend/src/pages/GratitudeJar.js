import React, { useState } from "react";
import "./style/GratitudeJar.css";

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
  const [error, setError] = useState("");

  const addEntry = () => {
    if (!text.trim()) return;

    // Require category selection
    if (!category) {
      setError("⚠️ Please select a category before adding your entry.");
      return;
    }

    setError("");
    const newEntry = {
      id: Date.now(),
      text,
      category,
      date: new Date().toLocaleDateString(),
    };
    setEntries([newEntry, ...entries]);
    setText("");
    setCategory("");
  };

  const deleteEntry = (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="app-container">
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
            <p>Total {entries.length <= 1 ? "Entry" : "Entries"}</p>
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
            <option value="">Select Category</option>
            {Object.keys(categoryColors).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Validation message */}
          {error && <p className="error-text">{error}</p>}

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

        {/* 💡 Daily Gratitude Tip */}
        <div className="daily-tip">
          <h3>Daily Gratitude Tip</h3>
          <p>
            "Try to notice three small things each day that bring you joy — they don't have to be big moments,
            sometimes the smallest things create the most happiness."
          </p>
        </div>
      </main>
    </div>
  );
};

export default GratitudeJar;
