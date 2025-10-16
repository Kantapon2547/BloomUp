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

const MOOD_EMOJIS = ["😭", "😕", "🙂", "😊", "😄"];

// API config
const API = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Helper functions
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
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

// Convert mood index (0-4) to score (1-5)
const moodIndexToScore = (index) => index + 1;

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
  const [savingMood, setSavingMood] = useState(false);
  const [todayMoodId, setTodayMoodId] = useState(null);

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

  // Toggle habit
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

  const handleSaveMood = useCallback(async () => {
    if (selectedMood === null) return;

    setSavingMood(true);
    try {
      const moodScore = moodIndexToScore(selectedMood);
      const payload = {
        mood_score: moodScore,
        note: null,
        logged_on: todayStr,
      };

      console.log("Saving mood to backend:", payload);

      // If we already have today's mood ID, update it directly
      if (todayMoodId) {
        console.log("Updating existing mood:", todayMoodId);
        
        const updateRes = await fetch(`${API}/mood/${todayMoodId}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            mood_score: moodScore,
            note: null,
          }),
        });

        if (!updateRes.ok) {
          setSaveFeedback("Failed to update mood");
          console.error("Update failed:", updateRes.status);
          return;
        }

        console.log("Mood updated successfully");
        setSaveFeedback("Mood updated for today");
      } else {
        // Try to create new mood
        const res = await fetch(`${API}/mood/`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("API Error:", res.status, errorText);
          
          // If mood already exists, fetch it and update
          if (res.status === 400) {
            console.log("Mood already exists, fetching to update...");
            const listRes = await fetch(`${API}/mood/?limit=365`, { 
              headers: authHeaders() 
            });
            const moods = await listRes.json();
            const existingMood = moods.find(m => m.logged_on === todayStr);
            
            if (existingMood) {
              console.log("Found existing mood, updating:", existingMood.mood_id);
              setTodayMoodId(existingMood.mood_id);
              
              const updateRes = await fetch(`${API}/mood/${existingMood.mood_id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({
                  mood_score: moodScore,
                  note: null,
                }),
              });

              if (!updateRes.ok) {
                setSaveFeedback("Failed to update mood");
                return;
              }

              console.log("Mood updated successfully");
              setSaveFeedback("Mood updated for today");
            }
          } else {
            setSaveFeedback("Failed to save mood");
            return;
          }
        } else {
          const data = await res.json();
          console.log("Mood saved successfully:", data);
          setTodayMoodId(data.mood_id);
          setSaveFeedback("Mood saved for today");
        }
      }

      // Save to localStorage as backup
      localStorage.setItem(
        LS_KEYS.mood,
        JSON.stringify({ date: todayStr, value: selectedMood })
      );

      // Dispatch event so Calendar can refresh
      window.dispatchEvent(new Event("moodUpdated"));

      setMoodSaved(true);

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
      setSaveFeedback("Error saving mood");
    } finally {
      setSavingMood(false);
    }
  }, [selectedMood, todayStr, todayMoodId]);

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
    try {
      syncFromHabits();

      const storedMood = JSON.parse(localStorage.getItem(LS_KEYS.mood) || "null");
      const storedStreak = JSON.parse(localStorage.getItem(LS_KEYS.streak) || "null");
      
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

      // Fetch today's mood from backend to get its ID
      const fetchTodayMood = async () => {
        try {
          console.log("Fetching today's mood...");
          const res = await fetch(`${API}/mood/?limit=365&start_date=${todayStr}`, { headers: authHeaders() });
          if (res.ok) {
            const moods = await res.json();
            console.log("Moods fetched:", moods);
            
            // Find mood for today specifically
            const todayMood = moods.find(m => m.logged_on === todayStr);
            if (todayMood) {
              console.log("Found today's mood:", todayMood);
              setTodayMoodId(todayMood.mood_id);
              setSelectedMood(todayMood.mood_score - 1); // Convert score back to index
              setMoodSaved(true);
            } else {
              console.log("No mood found for today");
              setTodayMoodId(null);
            }
          }
        } catch (e) {
          console.log("Error fetching mood:", e);
          setTodayMoodId(null);
        }
      };
      fetchTodayMood();

      if (storedMood && storedMood.date === todayStr) {
        setMoodSaved(true);
      }

      if (storedStreak && typeof storedStreak.count === "number") {
        setOverallStreak(storedStreak.count);
      }

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
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".left-col > div", ".right-col > div"], { opacity: 1 });
    
    tl.from(headerRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".left-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, []);

  useEffect(() => {
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${progressPercentage}%`;
    }
  }, []);

  useEffect(() => {
    const duration = 0.8;
    animateProgressBar(progressPercentage, duration);
  }, [progressPercentage, animateProgressBar]);

  useEffect(() => {
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
                    disabled={moodSaved || savingMood}
                  >
                    {savingMood ? "Saving..." : moodSaved ? "Saved" : "Save Mood"}
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
