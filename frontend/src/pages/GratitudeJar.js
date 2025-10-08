import React, { useState, useEffect } from "react";
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

// API Config
const API =
  process.env.REACT_APP_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// API Calls
async function apiListEntries() {
  const res = await fetch(`${API}/gratitude/`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`List failed ${res.status}`);
  return res.json();
}

async function apiCreateEntry(text, category) {
  const res = await fetch(`${API}/gratitude/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text, category }),
  });
  if (!res.ok) throw new Error(`Create failed ${res.status}`);
  return res.json();
}

async function apiDeleteEntry(id) {
  const res = await fetch(`${API}/gratitude/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed ${res.status}`);
}

const GratitudeJar = () => {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load entries from backend
  useEffect(() => {
    (async () => {
      try {
        const loaded = await apiListEntries();
        setEntries(loaded);
      } catch (e) {
        console.error("Failed to load gratitude entries:", e);
        setError("Failed to load entries. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addEntry = async () => {
    if (!text.trim()) return;

    // Require category selection
    if (!category) {
      setError("⚠️ Please select a category before adding your entry.");
      return;
    }

    setError("");
    
    try {
      const newEntry = await apiCreateEntry(text.trim(), category);
      setEntries([newEntry, ...entries]);
      setText("");
      setCategory("");
    } catch (e) {
      console.error("Failed to create entry:", e);
      setError("Failed to add entry. Please try again.");
    }
  };

  const deleteEntry = async (id) => {
    try {
      await apiDeleteEntry(id);
      setEntries(entries.filter((entry) => entry.id !== id));
    } catch (e) {
      console.error("Failed to delete entry:", e);
      setError("Failed to delete entry. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <main className="main-content">
          <p>Loading your gratitude entries...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="main-content">
        <h1 className="page-title">
          Gratitude Jar <span className="heart">💜</span>
        </h1>
        <p className="page-description">
          Reflect on the positive moments in your day and keep track of what you're grateful for.
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
            "Try to notice three small things each day that bring you joy – they don't have to be big moments,
            sometimes the smallest things create the most happiness."
          </p>
        </div>
      </main>
    </div>
  );
};

export default GratitudeJar;