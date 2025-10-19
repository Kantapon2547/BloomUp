import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./style/Home.css";

// Constants
const LS_KEY = "habit-tracker@hybrid";
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
  const days = Object.keys(habit.history || {}).sort();
  let current = 0;
  let prev = null;
  
  for (const d of days) {
    if (!habit.history[d]) continue;
    if (!prev) {
      current = 1;
    } else {
      const nd = new Date(prev);
      nd.setDate(nd.getDate() + 1);
      const expected = nd.toISOString().slice(0, 10);
      current = expected === d ? current + 1 : 1;
    }
    prev = d;
  }
  return current;
};

export default function Home({ user }) {
  const navigate = useNavigate();
  const todayStr = getTodayString();

  // Refs
  const headerRef = useRef(null);
  const progressFillRef = useRef(null);

  // State
  const [habits, setHabits] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [overallStreak, setOverallStreak] = useState(0);
  const [randomGratitude, setRandomGratitude] = useState(null);
  const [dailyQuote, setDailyQuote] = useState("");

  // Derived state
  const completedHabits = completed.filter(Boolean).length;
  const totalHabits = habits.length;
  const progressPercentage = totalHabits ? (completedHabits / totalHabits) * 100 : 0;
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "User";

  // Data synchronization
  const syncFromHabits = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      
      if (Array.isArray(raw)) {
        const processedHabits = raw.map((habit) => ({
          id: habit.id,
          name: habit.name,
          category: habit.category || "General",
          streak: calculateStreak(habit),
        }));

        setHabits(processedHabits);
        setCompleted(raw.map((habit) => !!habit.history?.[todayStr]));
      } else {
        setHabits([]);
        setCompleted([]);
      }
    } catch (error) {
      console.error("Failed to sync habits:", error);
      setHabits([]);
      setCompleted([]);
    }
  }, [todayStr]);

  // Toggle habit completion
  const toggleHabit = useCallback((index) => {
    const newCompleted = [...completed];
    newCompleted[index] = !newCompleted[index];
    setCompleted(newCompleted);

    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(raw) && raw[index]) {
        raw[index].history = raw[index].history || {};
        
        if (newCompleted[index]) {
          raw[index].history[todayStr] = true;
        } else {
          delete raw[index].history[todayStr];
        }
        
        localStorage.setItem(LS_KEY, JSON.stringify(raw));
        
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
  }, [completed, habits, todayStr]);

  // Mood handlers
  const handleMoodClick = useCallback((moodIndex) => {
    setSelectedMood(moodIndex);
    setMoodSaved(false);
  }, []);

  const handleSaveMood = useCallback(() => {
    if (selectedMood === null) return;

    try {
      localStorage.setItem(
        "home.mood",
        JSON.stringify({ date: todayStr, value: selectedMood })
      );
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
          onComplete: () => setSaveFeedback("")
        });
      }, 1500);
    } catch (error) {
      console.error("Failed to save mood:", error);
    }
  }, [selectedMood, todayStr]);

  // Animate progress bar
  const animateProgressBar = useCallback((targetWidth) => {
    if (!progressFillRef.current) return;
    gsap.to(progressFillRef.current, {
      width: `${targetWidth}%`,
      duration: 0.8,
      ease: "power2.inOut"
    });
  }, []);

  // Create interactive card props
  const makeCardInteractive = useCallback((onActivate) => ({
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
    style: { cursor: "pointer" },
  }), []);

  // Fetch gratitude data
  useEffect(() => {
    const fetchGratitude = async () => {
      try {
        const res = await fetch("/gratitude/", {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to fetch gratitude");

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const randomEntry = data[Math.floor(Math.random() * data.length)];
          setRandomGratitude(randomEntry.text);
        } else {
          setRandomGratitude("Take a moment to feel grateful today.");
        }
      } catch (error) {
        console.error("Error fetching gratitude:", error);
        setRandomGratitude("Take a moment to feel grateful today.");
      }
    };

    fetchGratitude();
  }, []);

  // Initialize data on mount
  useEffect(() => {
    try {
      syncFromHabits();

      // Only set mood if it was saved today
      const storedMood = JSON.parse(localStorage.getItem("home.mood") || "null");
      if (storedMood?.date === todayStr && storedMood?.value !== undefined) {
        setSelectedMood(storedMood.value);
        setMoodSaved(true);
      } else {
        setSelectedMood(null);
        setMoodSaved(false);
      }

      const storedStreak = JSON.parse(localStorage.getItem("home.streak") || "null");
      if (storedStreak?.count) {
        setOverallStreak(storedStreak.count);
      }

      const storedDailyQuote = JSON.parse(localStorage.getItem("home.dailyQuote") || "null");
      if (!storedDailyQuote || storedDailyQuote.date !== todayStr) {
        const text = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
        localStorage.setItem("home.dailyQuote", JSON.stringify({ date: todayStr, text }));
        setDailyQuote(text);
      } else {
        setDailyQuote(storedDailyQuote.text);
      }
    } catch (error) {
      console.error("Initialization error:", error);
    }

    // Sync on window focus
    const handleFocus = () => syncFromHabits();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [syncFromHabits, todayStr]);

  // Initial animations
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".left-col > div", ".right-col > div"], { opacity: 1 });
    
    tl.from(headerRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".left-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, []);

  // Animate progress bar when percentage changes
  useEffect(() => {
    animateProgressBar(progressPercentage);
  }, [progressPercentage, animateProgressBar]);

  // Calculate streak
  useEffect(() => {
    if (!completed.some(Boolean)) return;

    try {
      const stored = JSON.parse(localStorage.getItem("home.streak") || "null");
      const lastActiveDate = stored?.lastActiveDate;
      
      if (lastActiveDate === todayStr) return;

      let count = stored?.count || 0;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      count = lastActiveDate === yesterdayStr ? count + 1 : 1;
      
      localStorage.setItem("home.streak", JSON.stringify({ count, lastActiveDate: todayStr }));
      setOverallStreak(count);
    } catch (error) {
      console.error("Streak calculation error:", error);
    }
  }, [completed, todayStr]);

  // Sort habits (completed last)
  const sortedHabits = habits
    .map((habit, index) => ({ ...habit, index, done: completed[index] }))
    .sort((a, b) => a.done - b.done);

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
          <div className="left-col">
            <div className="progress-card" {...makeCardInteractive(() => navigate("/habits"))}>
              <div className="progress-info">
                <span>Today's Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div className="progress-fill" ref={progressFillRef} />
                </div>
              </div>
            </div>

            {sortedHabits.map((habit) => (
              <div className={`habit-card ${habit.done ? "done" : ""}`} key={habit.index}>
                <button
                  className="habit-check"
                  onClick={() => toggleHabit(habit.index)}
                  aria-pressed={habit.done}
                  aria-label={`Mark ${habit.name} as ${habit.done ? "incomplete" : "complete"}`}
                >
                  {habit.done && <span className="material-symbols-outlined">check</span>}
                </button>
                <div className="habit-info">
                  <div className="habit-left">
                    <h3>{habit.name}</h3>
                    <span className={`tag ${habit.category.toLowerCase()}`}>
                      {habit.category}
                    </span>
                  </div>
                  <div className="habit-right">
                    <span className="streak">
                      🔥 {habit.streak} {habit.streak <= 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="right-col">
            <div className="streak-card" {...makeCardInteractive(() => navigate("/reports"))}>
              <h3>Streak</h3>
              <div className="streak-number">{overallStreak}</div>
              <p className="streak-sub">
                {overallStreak <= 1 ? "Day Active 🔥" : "Days Active 🔥"}
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
                    aria-label={`Select mood ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {selectedMood !== null && (
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
            
            <div className="gratitude-card" {...makeCardInteractive(() => navigate("/gratitude"))}>
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