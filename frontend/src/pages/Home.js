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
    mood: "home.mood",
    streak: "home.streak",
    dailyQuote: "home.dailyQuote",
    homeGratitude: "home.gratitude"
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const [completed, setCompleted] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [overallStreak, setOverallStreak] = useState(0);
  const [moodSaved, setMoodSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [randomGratitude, setRandomGratitude] = useState(null);


  const [habits, setHabits] = useState([]);

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
  const moodEmojis = ["😭", "😐", "🙂", "😊", "😁"];

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const calcStreak = (habit) => {
    let s = 0;
    for (let i = 0;; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (habit.history?.[k]) s++; else break;
    }
    return s;
  };

  const syncFromHabits = () => {
    try {
      const raw = JSON.parse(localStorage.getItem("habit-tracker@v3") || "null") || [];
      if (Array.isArray(raw)) {
        setHabits(
          raw.map(h => ({
            name: h.name,
            description: "",
            tag: (h.category || "general").replace(/^./, c => c.toUpperCase()),
            streak: calcStreak(h)
          }))
        );
        const t = todayKey();
        setCompleted(raw.map(h => !!h.history?.[t]));
      } else { setHabits([]); setCompleted([]); }
    } catch { setHabits([]); setCompleted([]); }
  };

  const toggleHabit = (index) => {
    const newState = [...completed];
    newState[index] = !newState[index];
    setCompleted(newState);

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
      `.habit-card:nth-child(${index + 2})`,
      { scale: 0.95 },
      { scale: 1, duration: 0.3, ease: "power2.out" }
    );
  };

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

  useEffect(() => {
    try {
      syncFromHabits();

      const storedMood = JSON.parse(localStorage.getItem(LS_KEYS.mood) || "null");
      const storedStreak = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      const storedDailyQuote = JSON.parse(localStorage.getItem(LS_KEYS.dailyQuote) || "null");
      const storedHomeGratitude = JSON.parse(localStorage.getItem("home.gratitude") || "null");

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
      if (storedHomeGratitude) {
        setRandomGratitude(storedHomeGratitude.text);
      } else {
        setRandomGratitude("Take a moment to feel grateful today.");
      }

    } catch (_) {}
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".left-col > div", ".right-col > div"], { opacity: 1 });
    tl.from(headerRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".left-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, []);

  useEffect(() => {
    gsap.to(progressFillRef.current, {
      width: `${totalHabits ? (completedHabits / totalHabits) * 100 : 0}%`,
      duration: 0.8,
      ease: "power2.out"
    });
  }, [completedHabits, totalHabits]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.completed, JSON.stringify(completed));
      const hasProgressToday = completed.some(Boolean);
      const stored = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      const lastActiveDate = stored?.lastActiveDate;
      let count = stored?.count || 0;

      if (hasProgressToday) {
        if (lastActiveDate !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().slice(0, 10);
          count = lastActiveDate === yStr ? count + 1 : 1;
          localStorage.setItem(LS_KEYS.streak, JSON.stringify({ count, lastActiveDate: todayStr }));
          setOverallStreak(count);
        }
      }
    } catch (_) {}
  }, [completed]);

  useEffect(() => {
    const onFocus = () => syncFromHabits();
    window.addEventListener("focus", onFocus);
    onFocus();
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleMoodClick = (idx) => {
    // Animate previous selected back to normal size
    if (selectedMood !== null && selectedMood !== idx) {
      gsap.to(`.mood-btn:nth-child(${selectedMood + 1})`, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  
    // Update selection
    setSelectedMood(idx);
    setMoodSaved(false);
  
    // Animate clicked emoji
    gsap.to(`.mood-btn:nth-child(${idx + 1})`, {
      scale: 1.5,
      duration: 0.3,
      ease: "back.out(1.7)",
    });
  };
  const handleSaveMood = () => {
    if (selectedMood === null) return;
    try {
      localStorage.setItem(LS_KEYS.mood, JSON.stringify({ date: todayStr, value: selectedMood }));
      window.dispatchEvent(new Event("moodUpdated"));
      setMoodSaved(true);
  
      // Show animated feedback
      setSaveFeedback("Mood saved for today");
      gsap.fromTo(
        ".mood-save-feedback",
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );
  
      // Hide after 1.5s with animation
      setTimeout(() => {
        gsap.to(".mood-save-feedback", { y: -10, opacity: 0, duration: 0.5, ease: "power2.in" });
        setTimeout(() => setSaveFeedback(""), 500);
      }, 1500);
  
    } catch (_) {
      console.error("Failed to save mood");
    }
  };
  
  

  const makeCardInteractive = (onActivate) => ({
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") onActivate();
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
                const hour = new Date().getHours();
                const greeting =
                  hour < 12 ? "Good morning" :
                  hour < 18 ? "Good afternoon" : "Good evening";
                const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "User";
                return `${greeting}, ${displayName}! 🌸`;
              })()}
            </h1>
            <p>You’ve completed {completedHabits} of {totalHabits} tasks today.</p>
          </div>
        </header>

        <section className="home-grid">
          <div className="left-col" ref={leftColRef}>
            <div className="progress-card" {...makeCardInteractive(() => navigate("/habits"))}>
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
          </div>

          <div className="right-col" ref={rightColRef}>
            <div className="streak-card" {...makeCardInteractive(() => navigate("/reports"))}>
              <h3>Streak</h3>
              <div className="streak-number">{overallStreak}</div>
              <p className="streak-sub"> Days Active 🔥</p>
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
                  <button
                    className="save-btn"
                    onClick={handleSaveMood}
                    disabled={moodSaved}
                  >
                    {moodSaved ? "Saved" : "Save Mood"}
                  </button>
                  <div aria-live="polite" className="mood-save-feedback">{saveFeedback}</div>
                </div>
              )}
            </div>

            <div className="gratitude-card" {...makeCardInteractive(() => navigate("/gratitude"))}>
              <h3>Today's Gratitude 🙏</h3>
              <p>"{randomGratitude || 'Take a moment to feel grateful today.'}"</p>
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
