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

  // ----- Local storage keys
  const LS_KEYS = {
    habits: "home.habits",
    completed: "home.completed",
    mood: "home.mood", // stores { date: YYYY-MM-DD, value: index }
    streak: "home.streak", // stores { count: number, lastActiveDate: YYYY-MM-DD }
    dailyQuote: "home.dailyQuote", // stores { date, text }
    dailyGratitude: "home.dailyGratitude" // stores { date, text }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const [completed, setCompleted] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [overallStreak, setOverallStreak] = useState(0);
  const [moodSaved, setMoodSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");

  const defaultHabits = [
    { name: "Study for 2 hours", description: "Maintain consistent study schedule", streak: 12, tag: "Study" },
    { name: "Morning Exercise", description: "30 minutes of physical activity", streak: 8, tag: "Health" },
    { name: "Read 30 Minutes", description: "Expand knowledge through reading", streak: 5, tag: "Personal" },
  ];
  const [habits, setHabits] = useState(defaultHabits);
  const [todayHabitsTotal, setTodayHabitsTotal] = useState(0);
  const [todayHabitsDone, setTodayHabitsDone] = useState(0);

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
  const moodEmojis = ["😢", "😐", "🙂", "😊", "😄"];

  // Helpers to interop with Habits storage
  const todayKey = () => new Date().toISOString().slice(0,10);
  const calcStreak = (habit) => {
    let s = 0;
    for (let i = 0;; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0,10);
      if (habit.history?.[k]) s++; else break;
    }
    return s;
  };
  const syncFromHabits = () => {
    try {
      const raw = JSON.parse(localStorage.getItem("habit-tracker@v3") || "null") || [];
      if (Array.isArray(raw)) {
        setHabits(raw.map(h => ({ name: h.name, description: "", tag: (h.category||"general").replace(/^./, c=>c.toUpperCase()), streak: calcStreak(h) })));
        const t = todayKey();
        setCompleted(raw.map(h => !!h.history?.[t]));
      } else { setHabits([]); setCompleted([]); }
    } catch { setHabits([]); setCompleted([]); }
  };

  const toggleHabit = (index) => {
    const newState = [...completed];
    newState[index] = !newState[index];
    setCompleted(newState);

    // write-through to Habits storage and update local streak
    try {
      const raw = JSON.parse(localStorage.getItem("habit-tracker@v3") || "null") || [];
      if (Array.isArray(raw) && raw[index]) {
        const t = todayKey();
        raw[index].history = { ...(raw[index].history || {}), [t]: newState[index] };
        localStorage.setItem("habit-tracker@v3", JSON.stringify(raw));
        const updated = [...habits];
        updated[index] = { ...updated[index], streak: calcStreak(raw[index]) };
        setHabits(updated);
      }
    } catch {}

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

  // Load initial state from localStorage
  useEffect(() => {
    try {
      // Mirror tasks from Habits page
      syncFromHabits();

      const storedMood = JSON.parse(localStorage.getItem(LS_KEYS.mood) || "null");
      const storedStreak = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      const storedDailyQuote = JSON.parse(localStorage.getItem(LS_KEYS.dailyQuote) || "null");
      const storedDailyGratitude = JSON.parse(localStorage.getItem(LS_KEYS.dailyGratitude) || "null");

      if (storedMood && storedMood.date === todayStr) {
        setSelectedMood(storedMood.value);
        setMoodSaved(true);
      }

      if (storedStreak && typeof storedStreak.count === "number") {
        setOverallStreak(storedStreak.count);
      } else {
        setOverallStreak(0);
      }

      if (!storedDailyQuote || storedDailyQuote.date !== todayStr) {
        const text = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];
        localStorage.setItem(LS_KEYS.dailyQuote, JSON.stringify({ date: todayStr, text }));
      }
      if (!storedDailyGratitude || storedDailyGratitude.date !== todayStr) {
        const text = gratitudeNotes[Math.floor(Math.random() * gratitudeNotes.length)];
        localStorage.setItem(LS_KEYS.dailyGratitude, JSON.stringify({ date: todayStr, text }));
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      width: `${totalHabits ? (completedHabits / totalHabits) * 100 : 0}%`,
      duration: 0.8,
      ease: "power2.out"
    });
  }, [completedHabits, totalHabits]);

  // Persist habits completion whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.completed, JSON.stringify(completed));

      // Update streak bookkeeping when user completes at least one habit today
      const hasProgressToday = completed.some(Boolean);
      const stored = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      const lastActiveDate = stored?.lastActiveDate;
      let count = stored?.count || 0;

      if (hasProgressToday) {
        if (lastActiveDate === todayStr) {
          // already counted today
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().slice(0, 10);
          if (lastActiveDate === yStr) {
            count = count + 1;
          } else {
            count = 1; // reset streak starting today
          }
          localStorage.setItem(LS_KEYS.streak, JSON.stringify({ count, lastActiveDate: todayStr }));
          setOverallStreak(count);
        }
      }
    } catch (_) {
      // ignore storage errors
    }
  }, [completed]);

  // Sync today's habit stats from Habits app when returning to Home
  useEffect(() => {
    const onFocus = () => {
      syncFromHabits();
    };
    window.addEventListener("focus", onFocus);
    onFocus();
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleMoodClick = (idx) => {
    setSelectedMood(idx);
    setMoodSaved(false);
    gsap.fromTo(
      `.mood-btn:nth-child(${idx + 1})`,
      { scale: 0.8 },
      { scale: 1.2, duration: 0.3, yoyo: true, repeat: 1 }
    );
  };

  const handleSaveMood = () => {
    if (selectedMood === null) return;
    try {
      localStorage.setItem(LS_KEYS.mood, JSON.stringify({ date: todayStr, value: selectedMood }));
      setMoodSaved(true);
      setSaveFeedback("Mood saved for today");
      setTimeout(() => setSaveFeedback(""), 2000);
    } catch (_) {
      // ignore storage errors
    }
  };

  // Navigation helpers for accessibility
  const makeCardInteractive = (onActivate) => ({
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") { onActivate(); }
    },
    style: { cursor: "pointer" }
  });

  return (
    <div className="home-layout">
      <main className="home-main">
        <header className="home-header" ref={headerRef}>
          <div className="header-left">
            <h1>
              {(() => {
                const greeting = (() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "Good morning";
                  if (hour < 18) return "Good afternoon";
                  return "Good evening";
                })();
                const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "User";
                return `${greeting}, ${displayName}! 🌸`;
              })()}
            </h1>
            <p>You’ve completed {completedHabits} of {totalHabits} tasks today.</p>
          </div>
        </header>

        <section className="home-grid">
          <div className="left-col" ref={leftColRef}>
            <div className="progress-card" {...makeCardInteractive(() => navigate("/habits"))} aria-label="Go to Habits">
              <div className="progress-info">
                <span>Today's Progress</span>
                <span>{totalHabits ? Math.round((completedHabits / totalHabits) * 100) : 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" ref={progressFillRef} style={{ width: 0 }} />
              </div>
            </div>

            {habits.map((h, i) => (
              <div className={`habit-card ${completed[i] ? "done" : ""}`} key={i}>
                <button
                  className="habit-check"
                  onClick={() => toggleHabit(i)}
                  aria-pressed={completed[i]}
                  aria-label={`Mark habit '${h.name}' as ${completed[i] ? "not done" : "done"}`}
                >
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

            <div className="gratitude-card" {...makeCardInteractive(() => navigate("/gratitude"))} aria-label="Go to Gratitude">
              <h3>Today's Gratitude 🙏</h3>
              <p>"{randomGratitude}"</p>
            </div>
          </div>

          <div className="right-col" ref={rightColRef}>
            <div className="streak-card" {...makeCardInteractive(() => navigate("/reports"))} aria-label="Go to Reports">
              <h3>Overall Streak</h3>
              <div className="streak-number">{overallStreak}</div>
              <p className="streak-sub">days active 🔥</p>
            </div>

            <div className="weather-card" {...makeCardInteractive(() => navigate("/calendar"))} aria-label="Go to Calendar">
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
                    aria-pressed={selectedMood === idx}
                    aria-label={`Select mood ${idx + 1}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {selectedMood !== null && (
                <div className="mood-save">
                  <p>You’re feeling {moodEmojis[selectedMood]}</p>
                  <button
                    className="save-btn"
                    onClick={handleSaveMood}
                    disabled={moodSaved}
                    aria-disabled={moodSaved}
                    aria-label={moodSaved ? "Mood already saved for today" : "Save mood for today"}
                  >
                    {moodSaved ? "Saved" : "Save Mood"}
                  </button>
                  <div aria-live="polite" style={{ minHeight: "1.25rem" }}>{saveFeedback}</div>
                </div>
              )}
            </div>

            <div className="quote-card">
              <h3>Daily Motivation</h3>
              <blockquote>
                "{(() => {
                  try {
                    const q = JSON.parse(localStorage.getItem(LS_KEYS.dailyQuote) || "null");
                    return q?.date === todayStr ? q.text : randomQuote;
                  } catch (_) { return randomQuote; }
                })()}"
              </blockquote>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}