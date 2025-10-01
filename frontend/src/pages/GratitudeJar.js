//import React, { useState, useEffect } from "react";
//import Sidebar from "../components/Sidebar";
//import "./GratitudeJar.css";
//
//export default function GratitudeJar() {
//  const [entries, setEntries] = useState(() => {
//    const saved = localStorage.getItem("gratitudeEntries");
//    return saved ? JSON.parse(saved) : [];
//  });
//
//  const [newEntry, setNewEntry] = useState("");
//  const [category, setCategory] = useState("");
//  const [streak, setStreak] = useState(() => {
//    const saved = localStorage.getItem("gratitudeStreak");
//    return saved ? JSON.parse(saved) : 0;
//  });
//
//  useEffect(() => {
//    localStorage.setItem("gratitudeEntries", JSON.stringify(entries));
//  }, [entries]);
//
//  useEffect(() => {
//    localStorage.setItem("gratitudeStreak", streak);
//  }, [streak]);
//
//  const handleAddEntry = () => {
//    if (!newEntry.trim()) return;
//
//    const today = new Date().toDateString();
//    const entry = {
//      text: newEntry,
//      category: category || "Grateful moment",
//      date: today,
//    };
//
//    setEntries([entry, ...entries]); // prepend to show newest first
//    setNewEntry("");
//    setCategory("");
//
//    // ✅ Update streak if first entry today
//    const addedToday = entries.filter((e) => e.date === today).length;
//    if (addedToday === 0) {
//      setStreak(streak + 1);
//    }
//  };
//
//  const totalEntries = entries.length;
//  const today = new Date().toDateString();
//  const addedToday = entries.filter((e) => e.date === today).length;
//
//  return (
//    <div className="app-container">
//      {/* Sidebar with stats */}
//      <Sidebar>
//        <div className="stat-box">
//          <p>Total Entries</p>
//          <span>{totalEntries}</span>
//        </div>
//        <div className="stat-box">
//          <p>Added Today</p>
//          <span>{addedToday}</span>
//        </div>
//        <div className="stat-box">
//          <p>Day Streak</p>
//          <span>{streak}</span>
//        </div>
//      </Sidebar>
//
//      {/* Main Content */}
//      <main className="main-content">
//        <h1 className="page-title">💜 Gratitude Jar</h1>
//        <p className="page-subtitle">
//          Collect moments of joy and appreciation
//        </p>
//
//        {/* Add entry */}
//        <div className="entry-box">
//          <textarea
//            className="entry-input"
//            placeholder="I'm grateful for..."
//            value={newEntry}
//            onChange={(e) => setNewEntry(e.target.value)}
//          />
//          <input
//            className="category-input"
//            placeholder="Category (optional)"
//            value={category}
//            onChange={(e) => setCategory(e.target.value)}
//          />
//          <button className="add-btn" onClick={handleAddEntry}>
//            Add Entry
//          </button>
//        </div>
//
//        {/* Gratitude Collection */}
//        <div className="collection">
//          <h2 className="collection-title">Your Gratitude Collection</h2>
//          <div className="card-grid">
//            {entries.map((entry, idx) => (
//              <div key={idx} className="gratitude-card">
//                <div className="card-header">
//                  <span className="category-tag">{entry.category}</span>
//                  <span className="date-text">
//                    {entry.date === today ? "Today" : entry.date}
//                  </span>
//                </div>
//                <p className="card-text">{entry.text}</p>
//                <div className="card-footer">
//                  <span className="heart">💜</span> Grateful moment
//                </div>
//              </div>
//            ))}
//          </div>
//        </div>
//      </main>
//    </div>
//  );
//}

import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import "./GratitudeJar.css";

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

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="main-content">
        <h1 className="page-title">Gratitude Jar</h1>

        {/* Stats */}
        <div className="stats-container">
          <div className="stat-card purple">
            <h2>{entries.length}</h2>
            <p>Total Entries</p>
          </div>
          <div className="stat-card blue">
            <h2>{entries.filter(e => e.date === new Date().toLocaleDateString()).length}</h2>
            <p>Added Today</p>
          </div>
          <div className="stat-card green">
            <h2>7</h2>
            <p>Day Streak</p>
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
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
          />
          <button onClick={addEntry}>Add Entry</button>
        </div>

        {/* Gratitude Collection */}
        <h2 className="collection-title">Your Gratitude Collection</h2>
        <div className="entries-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-header">
                <span className="category">{entry.category}</span>
                <span className="date">Today</span>
              </div>
              <p>{entry.text}</p>
              <span className="tag">💜 Grateful moment</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default GratitudeJar;
