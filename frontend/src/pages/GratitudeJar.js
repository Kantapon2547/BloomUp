import React, { useState, useEffect, useRef, useCallback } from "react";
import "./style/GratitudeJar.css";
import { Heart } from "lucide-react";

// Constants
const CATEGORY_COLORS = {
  "Simple Pleasures": "simple-pleasures",
  "Relationships": "relationships",
  "Achievements": "achievements",
  "Nature": "nature",
  "Learning": "learning",
  "Family": "family",
  "Work": "work",
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

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

// Custom Hook for Entries Management
const useEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const loadedEntries = await gratitudeAPI.listEntries();
      setEntries(loadedEntries);
    } catch (err) {
      console.error("Failed to load gratitude entries:", err);
      setError(ERROR_MESSAGES.LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEntry = useCallback(async (text, category) => {
    try {
      setError("");
      const newEntry = await gratitudeAPI.createEntry(text, category);
      setEntries(prev => [newEntry, ...prev]);
      return true;
    } catch (err) {
      console.error("Failed to create entry:", err);
      setError(ERROR_MESSAGES.CREATE_FAILED);
      return false;
    }
  }, []);

  const removeEntry = useCallback(async (id) => {
    try {
      await gratitudeAPI.deleteEntry(id);
      setEntries(prev => prev.filter(entry => entry.id !== id));
      return true;
    } catch (err) {
      console.error("Failed to delete entry:", err);
      setError(ERROR_MESSAGES.DELETE_FAILED);
      return false;
    }
  }, []);

  return { entries, loading, error, loadEntries, addEntry, removeEntry, setError };
};

// Custom Hook for Date Formatting
const useDateFormatter = () => {
  const formatDate = useCallback((date) => {
    const dateObj = new Date(date);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const today = formatDate(new Date());

  return { formatDate, today };
};

// Custom Dropdown Component
const CategoryDropdown = ({ value, onChange, isOpen, onToggle, error }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onToggle]);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button
        className={`dropdown-toggle ${value ? "selected" : ""}`}
        onClick={() => onToggle(!isOpen)}
        aria-expanded={isOpen}
      >
        {value || "Select Category"}
      </button>
      {isOpen && (
        <ul className="dropdown-list">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              onClick={() => {
                onChange(category);
                onToggle(false);
              }}
              style={{
                backgroundColor: value === category ? "rgba(122, 90, 248, 0.1)" : "",
              }}
            >
              {category}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Entry Form Component
const EntryForm = ({ onSubmit, error, onErrorChange }) => {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleTextChange = (value) => {
    if (value.length <= 200) {
      setText(value);
      onErrorChange("");
    } else {
      onErrorChange(ERROR_MESSAGES.TEXT_TOO_LONG);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      onErrorChange(ERROR_MESSAGES.EMPTY_TEXT);
      return;
    }

    if (!category) {
      onErrorChange(ERROR_MESSAGES.NO_CATEGORY);
      return;
    }

    const success = await onSubmit(text.trim(), category);
    if (success) {
      setText("");
      setCategory("");
    }
  };

  return (
    <div className="entry-form">
      <h3>➕ What are you grateful for today?</h3>
      <textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="I'm grateful for..."
        maxLength={200}
      />

      <CategoryDropdown
        value={category}
        onChange={setCategory}
        isOpen={isDropdownOpen}
        onToggle={setIsDropdownOpen}
        error={error}
      />

      {error && <p className="error-text">{error}</p>}
      
      <div className="character-count">
        {text.length}/200 characters
      </div>
      
      <button onClick={handleSubmit}>Add Entry</button>
    </div>
  );
};

// Stats Component
const StatsSection = ({ entries, today }) => {
  const todaysEntriesCount = entries.filter(entry => entry.date === today).length;

  return (
    <div className="stats-container">
      <div className="stat-card purple">
        <h2>{entries.length}</h2>
        <p>Total {entries.length === 1 ? "Entry" : "Entries"}</p>
      </div>
      <div className="stat-card blue">
        <h2>{todaysEntriesCount}</h2>
        <p>Added Today</p>
      </div>
    </div>
  );
};

// Entry Card Component
const EntryCard = ({ entry, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this gratitude entry?")) {
      onDelete(entry.id);
    }
  };

  return (
    <div className="entry-card">
      <div className="entry-header">
        <span className={`category ${CATEGORY_COLORS[entry.category] || "general"}`}>
          {entry.category}
        </span>
        <span className="date">{entry.date}</span>
      </div>
      <p className="entry-text">{entry.text}</p>
      <div className="entry-footer">
        <span className="tag">💜 Grateful moment</span>
        <span
          className="delete-icon"
          onClick={handleDelete}
          title="Delete entry"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleDelete()}
        >
          🗑️
        </span>
      </div>
    </div>
  );
};

// Entries Grid Component
const EntriesGrid = ({ entries, onDeleteEntry }) => {
  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>No gratitude entries yet. Start by adding your first entry above!</p>
      </div>
    );
  }

  return (
    <div className="entries-grid">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onDelete={onDeleteEntry}
        />
      ))}
    </div>
  );
};

// Daily Tip Component
const DailyTip = () => (
  <div className="daily-tip">
    <h3>Daily Gratitude Tip</h3>
    <p>
      "Try to notice three small things each day that bring you joy – they don't have to be big moments,
      sometimes the smallest things create the most happiness."
    </p>
  </div>
);

// Loading Component
const LoadingState = () => (
  <div className="app-container">
    <main className="main-content">
      <div className="loading-state">
        <p>Loading your gratitude entries...</p>
      </div>
    </main>
  </div>
);

// Main Component
const GratitudeJar = () => {
  const { entries, loading, error, loadEntries, addEntry, removeEntry, setError } = useEntries();
  const { today } = useDateFormatter();

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="app-container">
      <main className="main-content">
        <header className="page-header">
          <h1 className="page-title">
            Gratitude Jar <Heart className="w-8 h-8 text-purple-500" />
          </h1>
          <p className="page-description">
            Reflect on the positive moments in your day.
          </p>
        </header>

        <StatsSection entries={entries} today={today} />

        <EntryForm
          onSubmit={addEntry}
          error={error}
          onErrorChange={setError}
        />

        <section className="entries-section">
          <h2 className="collection-title">Your Gratitude Collection</h2>
          <EntriesGrid
            entries={entries}
            onDeleteEntry={removeEntry}
          />
        </section>

      </main>
    </div>
  );
};

export default GratitudeJar;