// src/pages/Home.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./home.css";

export default function Home({ user }) {
  const navigate = useNavigate();

  // Logout function: clears token + user from localStorage
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const weeklyData = [
    { day: "Mon", completed: 85 },
    { day: "Tue", completed: 92 },
    { day: "Wed", completed: 67 },
    { day: "Thu", completed: 88 },
    { day: "Fri", completed: 75 },
    { day: "Sat", completed: 45 },
    { day: "Sun", completed: 60 },
  ];

  const habits = [
    { name: "Study for 2 hours", description: "Maintain consistent study schedule", streak: 12, tag: "Study" },
    { name: "Morning Exercise", description: "30 minutes of physical activity", streak: 8, tag: "Health" },
    { name: "Read 30 Minutes", description: "Expand knowledge through reading", streak: 5, tag: "Personal" },
  ];

  const gratitudeNotes = [
    "Grateful for my supportive family who believes in me",
    "Thankful for the beautiful sunset I saw today",
    "Appreciating my health and energy to pursue my goals",
    "Grateful for the opportunity to learn something new",
  ];

  const motivationQuotes = [
    "Small steps every day lead to big changes every year.",
    "Progress, not perfection, is the goal.",
    "You are capable of amazing things.",
    "Every day is a new opportunity to grow.",
    "Consistency is the mother of mastery.",
  ];

  const [completed, setCompleted] = useState([false, true, false]);
  const [selectedMood, setSelectedMood] = useState(null);

  const completedHabits = completed.filter(Boolean).length;
  const totalHabits = habits.length;
  const randomQuote = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];
  const randomGratitude = gratitudeNotes[Math.floor(Math.random() * gratitudeNotes.length)];
  const isRaining = Math.random() > 0.7;
  const overallStreak = 23;
  const moodEmojis = ["😢", "😐", "🙂", "😊", "😄"];

  const toggleHabit = (index) => {
    const newState = [...completed];
    newState[index] = !newState[index];
    setCompleted(newState);
  };

  return (
    <div className="home-layout">
      <Sidebar />
      <main className="home-main">
        <header className="home-header">
          <div className="header-left">
            <h1>
              Good morning, {user?.email?.split("@")[0] || "User"}! 🌸
            </h1>
            <p>
              You’ve completed {completedHabits} of {totalHabits} tasks today.
            </p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <section className="home-grid">
          {/* LEFT COLUMN */}
          <div className="left-col">
            {/* Progress card */}
            <div className="progress-card">
              <div className="progress-info">
                <span>Today's Progress</span>
                <span>{Math.round((completedHabits / totalHabits) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(completedHabits / totalHabits) * 100}%` }}
                />
              </div>
            </div>

            {/* Habit cards */}
            {habits.map((h, i) => (
              <div className={`habit-card ${completed[i] ? "done" : ""}`} key={i}>
                <button className="habit-check" onClick={() => toggleHabit(i)}>
                  {completed[i] ? "✓" : ""}
                </button>
                <div className="habit-info">
                  <h3>{h.name}</h3>
                  <p>{h.description}</p>
                  <div className="habit-meta">
                    <span className={`tag ${h.tag.toLowerCase()}`}>{h.tag}</span>
                    <span className="streak">🔥 {h.streak} day streak</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Gratitude */}
            <div className="gratitude-card">
              <h3>Today's Gratitude 🙏</h3>
              <p>"{randomGratitude}"</p>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-col">
            {/* Streak */}
            <div className="streak-card">
              <h3>Overall Streak</h3>
              <div className="streak-number">{overallStreak}</div>
              <p className="streak-sub">days active 🔥</p>
            </div>

            {/* Weather */}
            <div className="weather-card">
              {isRaining ? (
                <>
                  <p className="weather-icon">🌧️</p>
                  <p>Bring an umbrella today ☔</p>
                </>
              ) : (
                <>
                  <p className="weather-icon">☀️</p>
                  <p>Clear skies today 🌤️</p>
                </>
              )}
            </div>

            {/* Mood tracker */}
            <div className="mood-card">
              <h3>How are you feeling?</h3>
              <div className="mood-list">
                {moodEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMood(idx)}
                    className={`mood-btn ${selectedMood === idx ? "selected" : ""}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {selectedMood !== null && (
                <div className="mood-save">
                  <p>You’re feeling {moodEmojis[selectedMood]}</p>
                  <button className="save-btn">Save Mood</button>
                </div>
              )}
            </div>

            {/* Quote */}
            <div className="quote-card">
              <h3>Daily Motivation</h3>
              <blockquote>"{randomQuote}"</blockquote>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
