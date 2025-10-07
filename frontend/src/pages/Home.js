// src/pages/Home.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./style/Home.css";

export default function Home({ user }) {
  const navigate = useNavigate();

  const headerRef = useRef(null);
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);
  const progressFillRef = useRef(null);

  const [completed, setCompleted] = useState([false, true, false]);
  const [selectedMood, setSelectedMood] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

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

    gsap.fromTo(
      `.habit-card:nth-child(${index + 2})`, // +2 to skip progress card
      { scale: 0.95 },
      { scale: 1, duration: 0.3, ease: "power2.out" }
    );
  };

  // ✅ Fix: Reset all opacity + remove unwanted overlays on mount
  useEffect(() => {
    document.querySelectorAll(".overlay, .backdrop, .filter").forEach(el => el.remove());
    ["body", "#root", ".home-layout", ".home-main", ".home-grid"].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.opacity = "1";
        el.style.filter = "none";
        el.style.transition = "none";
        el.style.backdropFilter = "none";
      });
    });
  }, []);

  // 👇 Run entrance animation once on mount
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // ✅ Force opacity to 1 before animating (fix ghost fade)
    gsap.set([".home-header", ".left-col > div", ".right-col > div"], { opacity: 1 });

    tl.from(headerRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".left-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7")
      .set(".home-layout, .home-main, .home-grid", { clearProps: "transform" });
  }, []);

  // 👇 Animate progress bar smoothly when habits change
  useEffect(() => {
    gsap.to(progressFillRef.current, {
      width: `${(completedHabits / totalHabits) * 100}%`,
      duration: 0.8,
      ease: "power2.out"
    });
  }, [completedHabits, totalHabits]);

  const handleMoodClick = (idx) => {
    setSelectedMood(idx);
    gsap.fromTo(
      `.mood-btn:nth-child(${idx + 1})`,
      { scale: 0.8 },
      { scale: 1.2, duration: 0.3, yoyo: true, repeat: 1 }
    );
  };

  return (
    <div className="home-layout">
      <main className="home-main">
        <header className="home-header" ref={headerRef}>
          <div className="header-left">
            <h1>Good morning, {user?.email?.split("@")[0] || "User"}! 🌸</h1>
            <p>You’ve completed {completedHabits} of {totalHabits} tasks today.</p>
          </div>
        </header>

        <section className="home-grid">
          <div className="left-col" ref={leftColRef}>
            <div className="progress-card">
              <div className="progress-info">
                <span>Today's Progress</span>
                <span>{Math.round((completedHabits / totalHabits) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" ref={progressFillRef} style={{ width: 0 }} />
              </div>
            </div>

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

            <div className="gratitude-card">
              <h3>Today's Gratitude 🙏</h3>
              <p>"{randomGratitude}"</p>
            </div>
          </div>

          <div className="right-col" ref={rightColRef}>
            <div className="streak-card">
              <h3>Overall Streak</h3>
              <div className="streak-number">{overallStreak}</div>
              <p className="streak-sub">days active 🔥</p>
            </div>

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

            <div className="mood-card">
              <h3>How are you feeling?</h3>
              <div className="mood-list">
                {moodEmojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleMoodClick(idx)}
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
