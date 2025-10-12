import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./style/Home.css";

// Constants
const LS_KEYS = {
  habits: "home.habits",
  completed: "home.completed",
  mood: "home.mood",
  streak: "home.streak",
  dailyQuote: "home.dailyQuote",
};

const MOTIVATION_QUOTES = [
  "Small steps every day lead to big changes every year.",
  "Progress, not perfection, is the goal.",
  "You are capable of amazing things.",
  "Every day is a new opportunity to grow.",
  "Consistency is the mother of mastery.",
];

const MOOD_EMOJIS = ["😭", "😐", "🙂", "😊", "😁"];

// Helper functions
const getTodayString = () => new Date().toISOString().slice(0, 10);
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const calculateStreak = (habit) => {
  let streak = 0;
  for (let i = 0; ; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().slice(0, 10);
    if (habit.history?.[dateKey]) streak++;
    else break;
  }
  return streak;
};

export default function Home({ user }) {
  const navigate = useNavigate();
  const todayStr = getTodayString();

  // Refs
  const headerRef = useRef(null);
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);
  const progressFillRef = useRef(null);

  // State
  const [completed, setCompleted] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [overallStreak, setOverallStreak] = useState(0);
  const [moodSaved, setMoodSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [randomGratitude, setRandomGratitude] = useState(null);
  const [habits, setHabits] = useState([]);

  // Derived state
  const completedHabits = completed.filter(Boolean).length;
  const totalHabits = habits.length;
  const progressPercentage = totalHabits ? (completedHabits / totalHabits) * 100 : 0;
  const randomQuote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "User";

  // Data synchronization
  const syncFromHabits = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("habit-tracker@v3") || "null") || [];
      
      if (Array.isArray(raw)) {
        const processedHabits = raw.map((habit) => ({
          name: habit.name,
          description: "",
          tag: (habit.category || "general").replace(/^./, (c) => c.toUpperCase()),
          streak: calculateStreak(habit),
        }));

        setHabits(processedHabits);
        setCompleted(raw.map((habit) => !!habit.history?.[todayStr]));
      } else {
        setHabits([]);
        setCompleted([]);
      }
    } catch {
      setHabits([]);
      setCompleted([]);
    }
  }, [todayStr]);

  // Simplified toggleHabit without bounce animation
  const toggleHabit = useCallback((index) => {
    const newCompleted = [...completed];
    newCompleted[index] = !newCompleted[index];
    setCompleted(newCompleted);

    try {
      const raw = JSON.parse(localStorage.getItem("habit-tracker@v3") || "null") || [];
      if (Array.isArray(raw) && raw[index]) {
        const todayKey = getTodayString();
        raw[index].history = { 
          ...(raw[index].history || {}), 
          [todayKey]: newCompleted[index] 
        };
        localStorage.setItem("habit-tracker@v3", JSON.stringify(raw));
        
        const updatedHabits = [...habits];
        updatedHabits[index] = {
          ...updatedHabits[index],
          streak: calculateStreak(raw[index]),
        };
        setHabits(updatedHabits);
      }
    } catch (error) {
      console.error("Failed to toggle habit:", error);
    }
  }, [completed, habits]);

  // Mood handlers
  const handleMoodClick = useCallback((moodIndex) => {
    setSelectedMood(moodIndex);
    setMoodSaved(false);
  }, []);

  const handleSaveMood = useCallback(() => {
    if (selectedMood === null) return;

    try {
      localStorage.setItem(
        LS_KEYS.mood,
        JSON.stringify({ date: todayStr, value: selectedMood })
      );
      window.dispatchEvent(new Event("moodUpdated"));
      setMoodSaved(true);

      setSaveFeedback("Mood saved for today");
      gsap.fromTo(
        ".mood-save-feedback",
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );

      setTimeout(() => {
        gsap.to(".mood-save-feedback", {
          y: -10,
          opacity: 0,
          duration: 0.5,
          ease: "power2.in",
        });
        setTimeout(() => setSaveFeedback(""), 500);
      }, 1500);
    } catch (error) {
      console.error("Failed to save mood:", error);
    }
  }, [selectedMood, todayStr]);

  // UI helpers
  const makeCardInteractive = useCallback((onActivate) => ({
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") onActivate();
    },
    style: { cursor: "pointer" },
  }), []);

  const animateProgressBar = useCallback((targetWidth, duration = 1.2) => {
    if (!progressFillRef.current) return;

    gsap.to(progressFillRef.current, {
      width: `${targetWidth}%`,
      duration: duration,
      ease: "power2.inOut"
    });
  }, []);

  // Effects
  useEffect(() => {
    // Clean up overlays and filters
    document.querySelectorAll(".overlay, .backdrop, .filter").forEach((el) => el.remove());
    ["body", "#root", ".home-layout", ".home-main", ".home-grid"].forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.opacity = "1";
        el.style.filter = "none";
        el.style.transition = "none";
        el.style.backdropFilter = "none";
      });
    });
  }, []);

  useEffect(() => {
    // Initial data load
    try {
      syncFromHabits();

      const storedMood = JSON.parse(localStorage.getItem(LS_KEYS.mood) || "null");
      const storedStreak = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      
      // Load random gratitude
      try {
        const allEntries = JSON.parse(localStorage.getItem("gratitudeEntries") || "[]");
        const gratitudeText =
          allEntries.length > 0
            ? allEntries[Math.floor(Math.random() * allEntries.length)].text
            : "Take a moment to feel grateful today.";
        setRandomGratitude(gratitudeText);
      } catch {
        setRandomGratitude("Take a moment to feel grateful today.");
      }

      // Set mood if saved today
      if (storedMood && storedMood.date === todayStr) {
        setMoodSaved(true);
      }

      // Set streak
      if (storedStreak && typeof storedStreak.count === "number") {
        setOverallStreak(storedStreak.count);
      }

      // Set daily quote
      const storedDailyQuote = JSON.parse(localStorage.getItem(LS_KEYS.dailyQuote) || "null");
      if (!storedDailyQuote || storedDailyQuote.date !== todayStr) {
        const text = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
        localStorage.setItem(
          LS_KEYS.dailyQuote,
          JSON.stringify({ date: todayStr, text })
        );
      }
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }, [syncFromHabits, todayStr]);

  useEffect(() => {
    // Initial animations without bounce
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".left-col > div", ".right-col > div"], { opacity: 1 });
    
    tl.from(headerRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".left-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, []);

  // Progress bar effect - Set initial width immediately, then animate changes
  useEffect(() => {
    // Set the initial width immediately on component mount
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${progressPercentage}%`;
    }
  }, []);

  useEffect(() => {
    // Animate progress bar when progress changes
    const duration = 0.8;
    animateProgressBar(progressPercentage, duration);
  }, [progressPercentage, animateProgressBar]);

  useEffect(() => {
    // Streak calculation
    try {
      localStorage.setItem(LS_KEYS.completed, JSON.stringify(completed));
      const hasProgressToday = completed.some(Boolean);
      const stored = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      const lastActiveDate = stored?.lastActiveDate;
      let count = stored?.count || 0;

      if (hasProgressToday && lastActiveDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        count = lastActiveDate === yesterdayStr ? count + 1 : 1;
        
        localStorage.setItem(
          LS_KEYS.streak,
          JSON.stringify({ count, lastActiveDate: todayStr })
        );
        setOverallStreak(count);
      }
    } catch (error) {
      console.error("Streak calculation error:", error);
    }
  }, [completed, todayStr]);

  useEffect(() => {
    // Sync habits on focus
    const handleFocus = () => syncFromHabits();
    window.addEventListener("focus", handleFocus);
    handleFocus();
    
    return () => window.removeEventListener("focus", handleFocus);
  }, [syncFromHabits]);

  // Sorted habits for display
  const sortedHabits = habits
    .map((habit, index) => ({ ...habit, index, done: completed[index] }))
    .sort((a, b) => a.done - b.done);

  // Get daily quote
  const dailyQuote = (() => {
    try {
      const quote = JSON.parse(localStorage.getItem(LS_KEYS.dailyQuote) || "null");
      return quote?.date === todayStr ? quote.text : randomQuote;
    } catch {
      return randomQuote;
    }
  })();

  return (
    <div className="home-layout">
      <main className="home-main">
        <header className="home-header" ref={headerRef}>
          <div className="header-left">
            <h1>{`${getGreeting()}, ${displayName}! 🌸`}</h1>
            <p>
              You've completed {completedHabits} of {totalHabits}{" "}
              {totalHabits === 1 ? "task" : "tasks"} today.
            </p>
          </div>
        </header>

        <section className="home-grid">
          <div className="left-col" ref={leftColRef}>
            <div
              className="progress-card"
              {...makeCardInteractive(() => navigate("/habits"))}
            >
              <div className="progress-info">
                <span>Today's Progress</span>
                <span>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    ref={progressFillRef}
                  />
                </div>
              </div>
            </div>

            {sortedHabits.map((habit) => (
              <div
                className={`habit-card ${habit.done ? "done" : ""}`}
                key={habit.index}
              >
                <button
                  className="habit-check"
                  onClick={() => toggleHabit(habit.index)}
                  aria-pressed={habit.done}
                >
                  {habit.done ? "✓" : ""}
                </button>
                <div className="habit-info">
                  <h3>{habit.name}</h3>
                  <p>{habit.description}</p>
                  <div className="habit-meta">
                    <span className={`tag ${habit.tag.toLowerCase()}`}>
                      {habit.tag}
                    </span>
                    <span className="streak">
                      🔥 {habit.streak} {habit.streak === 1 ? "day" : "days"} streak
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="right-col" ref={rightColRef}>
            
            <div
              className="streak-card"
              {...makeCardInteractive(() => navigate("/reports"))}
            >
              <h3>Streak</h3>
              <div className="streak-number">{overallStreak}</div>
              <p className="streak-sub">
                {overallStreak === 1 ? "Day Active 🔥" : "Days Active 🔥"}
              </p>
            </div>

            <div className="mood-card">
              <h3>How are you feeling?</h3>
              <div className="mood-list">
                {MOOD_EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleMoodClick(index)}
                    className={`mood-btn ${selectedMood === index ? "selected" : ""}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {(selectedMood !== null || moodSaved) && (
                <div className="mood-save">
                  <p>You're feeling {MOOD_EMOJIS[selectedMood]}</p>
                  <button
                    className="save-btn"
                    onClick={handleSaveMood}
                    disabled={moodSaved}
                  >
                    {moodSaved ? "Saved" : "Save Mood"}
                  </button>
                  <div aria-live="polite" className="mood-save-feedback">
                    {saveFeedback}
                  </div>
                </div>
              )}
            </div>
            
            <div
              className="gratitude-card"
              {...makeCardInteractive(() => navigate("/gratitude"))}
            >
              <h3>Today's Gratitude 🙏</h3>
              <p>"{randomGratitude || "Take a moment to feel grateful today."}"</p>
            </div>

            <div className="quote-card">
              <h3>Daily Motivation</h3>
              <blockquote>"{dailyQuote}"</blockquote>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}