import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./style/Home.css";
import Jar from '../components/Jar';

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
const getTodayString = () => {
  // Get current time in Bangkok timezone
  const bangkokTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  return new Date(bangkokTime).toISOString().slice(0, 10);
};

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
          // Mark as complete
          raw[index].history[todayStr] = true;
        } else {
          // Unmark as complete
          delete raw[index].history[todayStr];
        }
  
        localStorage.setItem(LS_KEY, JSON.stringify(raw));
  
        // Update streaks per habit
        const updatedHabits = [...habits];
        updatedHabits[index] = {
          ...updatedHabits[index],
          streak: calculateStreak(raw[index]),
        };
        setHabits(updatedHabits);
  
        // Check if all habits are unchecked → reset streak
        const anyCompleted = newCompleted.some(Boolean);
        if (!anyCompleted) {
          const userKey = `home.streak.${user?.email || "default"}`;
          const reset = { count: 0, lastActiveDate: null };
          localStorage.setItem(userKey, JSON.stringify(reset));
          setOverallStreak(0);
        }
      }
    } catch (error) {
      console.error("Failed to toggle habit:", error);
    }
  }, [completed, habits, todayStr, user]);
  

  // Mood handlers
  const handleMoodClick = useCallback((moodIndex) => {
    setSelectedMood(moodIndex);
    setMoodSaved(false);
  }, []);

  const handleSaveMood = useCallback(async () => {
    if (selectedMood === null) return;

    try {
      // Save to localStorage first
      localStorage.setItem(
        "home.mood",
        JSON.stringify({ 
          date: todayStr, 
          value: selectedMood,
          user: user?.email || "default"
        })
      );

      // Convert emoji index (0-4) to mood score (1-5)
      const moodScore = selectedMood + 1;

      // Save to database
      const token = localStorage.getItem("token");
      const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API}/mood/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mood_score: moodScore,
          logged_on: todayStr,
          note: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // If mood already exists for today, update it instead
        if (response.status === 400 && errorData.detail?.includes("already exists")) {
          console.log("Mood already exists, updating instead");
          // Get today's mood to find its ID
          const todayResponse = await fetch(`${API}/mood/today`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (todayResponse.ok) {
            const todayMood = await todayResponse.json();
            if (todayMood) {
              // Update existing mood
              const updateResponse = await fetch(`${API}/mood/${todayMood.mood_id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                  mood_score: moodScore,
                  note: null
                })
              });
              
              if (!updateResponse.ok) {
                throw new Error("Failed to update mood");
              }
            }
          }
        } else {
          throw new Error(errorData.detail || "Failed to save mood");
        }
      }

      // Dispatch event to notify Calendar component
      window.dispatchEvent(new CustomEvent("moodUpdated"));

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
      setSaveFeedback("Failed to save mood");
      
      setTimeout(() => {
        setSaveFeedback("");
      }, 2000);
    }
  }, [selectedMood, todayStr, user]);

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

  // Check and reset mood based on user and date
  const checkAndResetMood = useCallback(async () => {
    const storedMood = JSON.parse(localStorage.getItem("home.mood") || "null");
    const currentUserEmail = user?.email || "default";
    
    // Reset mood if it's a different user or a different day
    if (storedMood?.user !== currentUserEmail || storedMood?.date !== todayStr) {
      setSelectedMood(null);
      setMoodSaved(false);
      localStorage.removeItem("home.mood");
      
      // Try to load mood from database for today
      try {
        const token = localStorage.getItem("token");
        const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
        
        const response = await fetch(`${API}/mood/today`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const todayMood = await response.json();
          if (todayMood && todayMood.logged_on === todayStr) {
            // Convert mood score (1-5) back to emoji index (0-4)
            const emojiIndex = Math.max(0, Math.min(4, todayMood.mood_score - 1));
            setSelectedMood(emojiIndex);
            setMoodSaved(true);
            
            // Update localStorage
            localStorage.setItem(
              "home.mood",
              JSON.stringify({ 
                date: todayStr, 
                value: emojiIndex,
                user: currentUserEmail
              })
            );
          }
        }
      } catch (error) {
        console.error("Failed to load mood from database:", error);
      }
    } else if (storedMood?.value !== undefined) {
      setSelectedMood(storedMood.value);
      setMoodSaved(true);
    }
  }, [todayStr, user]);

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

  useEffect(() => {
    if (!user?.email) return;

    const userKey = `home.streak.${user.email}`;
    const stored = JSON.parse(localStorage.getItem(userKey) || "null");

    if (!stored) {
      const initialStreak = { count: 0, lastActiveDate: null };
      localStorage.setItem(userKey, JSON.stringify(initialStreak));
      setOverallStreak(0);
    } else {
      setOverallStreak(stored.count || 0);
    }
  }, [user]);

  // Initialize data on mount
  useEffect(() => {
    try {
      syncFromHabits();

      // Check and reset mood based on user and date
      checkAndResetMood();
      
      const userKey = `home.streak.${user?.email || "default"}`;
      const stored = JSON.parse(localStorage.getItem(userKey) || "null");
      if (stored?.count) {
        setOverallStreak(stored.count);
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
    const handleFocus = () => {
      syncFromHabits();
      checkAndResetMood();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [syncFromHabits, todayStr, checkAndResetMood]);

  // Initial animations
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".left-col > div", ".right-col > div"], { opacity: 1 });
    
    tl.from(headerRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".left-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, [user?.email]);

  // Animate progress bar when percentage changes
  useEffect(() => {
    animateProgressBar(progressPercentage);
  }, [progressPercentage, animateProgressBar]);

  // Calculate streak
  useEffect(() => {
    if (!completed.some(Boolean)) return;

    try {
      const userKey = `home.streak.${user?.email || "default"}`;
      const stored = JSON.parse(localStorage.getItem(userKey) || "null");
      const lastActiveDate = stored?.lastActiveDate;

      if (lastActiveDate === todayStr) return;

      let count = stored?.count || 0;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      count = lastActiveDate === yesterdayStr ? count + 1 : 1;

      localStorage.setItem(userKey, JSON.stringify({ count, lastActiveDate: todayStr }));
      setOverallStreak(count);

    } catch (error) {
      console.error("Streak calculation error:", error);
    }
  }, [completed, todayStr, user]);

  // Sort habits (completed last)
  const sortedHabits = habits
    .map((habit, index) => ({ ...habit, index, done: completed[index] }))
    .sort((a, b) => a.done - b.done);

  return (
    <div className="home-layout">
      <Jar />
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