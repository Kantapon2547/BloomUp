import React, { useState, useEffect, useRef, useCallback } from "react";
import "./style/GratitudeJar.css";
import { Heart, Trash2 } from "lucide-react";

// Constants
const categoryColors = {
  "Simple Pleasures": "simple-pleasures",
  "Relationships": "relationships",
  "Achievements": "achievements",
  "Nature": "nature",
  "Learning": "learning",
  "Family": "family",
  "Work": "work",
};

const CATEGORIES = Object.keys(categoryColors);

const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 
            process.env.NEXT_PUBLIC_API_URL || 
            "http://localhost:8000",
  ENDPOINTS: {
    GRATITUDE: "/gratitude/",
  }
};

const ERROR_MESSAGES = {
  EMPTY_TEXT: "⚠️ Please enter your gratitude message.",
  NO_CATEGORY: "⚠️ Please select a category before adding your entry.",
  TEXT_TOO_LONG: "⚠️ Your gratitude entry should not exceed 200 characters.",
  LOAD_FAILED: "Failed to load entries. Please try again.",
  CREATE_FAILED: "Failed to add entry. Please try again.",
  DELETE_FAILED: "Failed to delete entry. Please try again.",
};

// API Utilities
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
};

// API Functions
const gratitudeAPI = {
  async listEntries() {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GRATITUDE}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  async createEntry(text, category) {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GRATITUDE}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, category }),
      }
    );
    return handleResponse(response);
  },

  async deleteEntry(id) {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GRATITUDE}${id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );
    return handleResponse(response);
  },
};

const GratitudeJar = () => {
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Load entries from API
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setLoading(true);
        const loadedEntries = await gratitudeAPI.listEntries();
        setEntries(loadedEntries);
      } catch (err) {
        console.error("Failed to load gratitude entries:", err);
        setError(ERROR_MESSAGES.LOAD_FAILED);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const addEntry = async () => {
    if (!text.trim()) return setError("⚠️ Please enter your gratitude message.");
    if (!category) return setError("⚠️ Please select a category before adding your entry.");
    if (text.length > 200) return setError("⚠️ Your gratitude entry should not exceed 200 characters.");

    setError("");
    try {
      const newEntry = await gratitudeAPI.createEntry(text, category);
      setEntries([newEntry, ...entries]);
      setText("");
      setCategory("");
    } catch (err) {
      console.error("Failed to create entry:", err);
      setError(ERROR_MESSAGES.CREATE_FAILED);
    }
  };

  // Delete with animation
  const deleteEntry = (id) => {
    const element = document.getElementById(`entry-${id}`);
    if (element) {
      element.classList.add("removing"); // start animation
      setTimeout(() => {
        setEntries(entries.filter((entry) => entry.id !== id));
      }, 300); // match CSS transition duration
    }
  };

  const today = formatDate(new Date());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="app-container">
        <main className="main-content">
          <div className="loading-state">
            <p>Loading your gratitude entries...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="main-content">
        {/* <h1 className="page-title">
          Gratitude Jar <Heart className="w-8 h-8 text-purple-500" />
        </h1>
        <p className="page-description">
          Reflect on the positive moments in your day
        </p> */}

        {/* Stats */}
        <div className="stats-container">
          <div className="stat-card purple">
            <h2>{entries.length}</h2>
            <p>Total {entries.length <= 1 ? "Entry" : "Entries"}</p>
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
                {CATEGORIES.map((cat) => (
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
            <div key={entry.id} id={`entry-${entry.id}`} className="entry-card">
              <div className="entry-header">
                <span className={`category ${categoryColors[entry.category] || "general"}`}>
                  {entry.category}
                </span>
                <span className="date">{entry.date}</span>
              </div>
              <p className="entry-text">{entry.text}</p>
              <Trash2
                className="delete-icon"
                onClick={() => deleteEntry(entry.id)}
                title="Delete entry"
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default GratitudeJar;