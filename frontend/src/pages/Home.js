import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import Jar from '../components/Jar';
import "./style/Home.css";

// Constants
const HOME_MOOD_EMOJIS = ["😭", "😕", "🙂", "😊", "😄"];
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Helper: Get Bangkok time today
const getHomeTodayString = () => {
  const bangkokTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  return new Date(bangkokTime).toISOString().slice(0, 10);
};

// Helper: Get greeting
const getHomeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// Helper: Calculate streak from history
const calculateHomeStreak = (history) => {
  const days = Object.keys(history || {}).sort();
  let current = 0;
  let prev = null;
  
  for (const d of days) {
    if (!history[d]) continue;
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

// Helper: Get category color
const getCategoryColor = (categoryName) => {
  const defaultCategories = {
    'General': '#ede9ff',
    'Study': '#fff4cc', 
    'Health': '#e9fcef',
    'Mind': '#fbefff',
    'Personal': '#e6e6f9'
  };
  return defaultCategories[categoryName] || '#e6e6f9';
};

// Motivation feedback templates
const FEEDBACK_TEMPLATES = {
  0: {
    baseMessages: [
      "You are capable of amazing things.",
      "Every journey begins with a single step.",
      "Ready to begin? Just click and you'll immediately beat 0%.",
    ],
  },
  25: {
    baseMessages: [
      "Every journey starts with a single step! You've officially begun.",
      "Great start! Keep that streak going!",
      "Good progress! You're already a quarter of the way there!"
    ],
  },
  50: {
    baseMessages: [
      "Halfway there! You're doing great!",
      "50% complete today. Keep going!",
      "Halfway there! The goal is closer than the start.",
    ],
  },
  75: {
    baseMessages: [
      "Almost there! You're unstoppable!",
      "75% complete! One more push!",
      "You've come so far. Just a little more effort to go!"
    ],
  },
  100: {
    baseMessages: [
      "Perfect day! You're a champion!!",
      "100% complete! Crushed your goals!",
      "Amazing finish! Keep the streak going — tomorrow's a new opportunity.",
    ],
  },
};

const getProgressTierValue = (percentage) => {
  if (percentage === 100) return 100;
  if (percentage >= 75) return 75;
  if (percentage >= 50) return 50;
  if (percentage >= 25) return 25;
  return 0;
};

const getMotivationMessage = (completed, total, weeklyProgress, improvement) => {
  const percentage = total ? (completed / total) * 100 : 0;
  const tier = getProgressTierValue(percentage);
  const templates = FEEDBACK_TEMPLATES[tier];
  
  const baseMessage = templates.baseMessages[Math.floor(Math.random() * templates.baseMessages.length)];
  
  let finalMessage = baseMessage;
  if (improvement > 0) {
    finalMessage = `${baseMessage} Improved by ${improvement > 0 ? '+' : ''}${improvement}% from last week.`;
  } else if (weeklyProgress > 0) {
    finalMessage = `${baseMessage} Weekly progress: ${weeklyProgress}%.`;
  }

  return finalMessage;
};

// Helper: Get token
const getToken = () => {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") {
    return null;
  }
  if (token.startsWith("Bearer ")) {
    return token;
  }
  return `Bearer ${token}`;
};

// Helper: API fetch
async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error("No authentication token");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": token,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 204) {
    return null;
  }

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API Error ${res.status}: ${error}`);
  }

  return res.json();
}

// Add these helper functions at the top (after the constants)
const getHabitCompletion = () => {
  try {
    return JSON.parse(localStorage.getItem('habit-completion') || '{}');
  } catch {
    return {};
  }
};

const setHabitCompletion = (completionData) => {
  localStorage.setItem('habit-completion', JSON.stringify(completionData));
};

// Helper: Calculate time until midnight Bangkok time
const getTimeUntilMidnightBangkok = () => {
  const now = new Date();
  const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  
  const midnight = new Date(bangkokTime);
  midnight.setHours(24, 0, 0, 0);
  
  const timeUntil = midnight - bangkokTime;
  return Math.max(0, timeUntil);
};

export default function Home({ user, onNavigate }) {
  const homeTodayStr = getHomeTodayString();

  // Refs
  const homeHeaderRef = useRef(null);
  const homeProgressFillRef = useRef(null);
  const midnightRefreshTimeoutRef = useRef(null);

  // State
  const [homeHabits, setHomeHabits] = useState([]);
  const [homeCompleted, setHomeCompleted] = useState([]);
  const [homeSelectedMood, setHomeSelectedMood] = useState(null);
  const [homeMoodSaved, setHomeMoodSaved] = useState(false);
  const [homeSaveFeedback, setHomeSaveFeedback] = useState("");
  const [homeOverallStreak, setHomeOverallStreak] = useState(0);
  const [homeRandomGratitude, setHomeRandomGratitude] = useState(null);
  const [homeUserName, setHomeUserName] = useState("");
  const [homeWeeklyProgress, setHomeWeeklyProgress] = useState(0);
  const [homeImprovement, setHomeImprovement] = useState(0);
  const [homeLoading, setHomeLoading] = useState(true);

  // Derived state
  const homeCompletedHabits = homeCompleted.filter(Boolean).length;
  const homeTotalHabits = homeHabits.length;
  const homeProgressPercentage = homeTotalHabits ? (homeCompletedHabits / homeTotalHabits) * 100 : 0;
  const homeDisplayName = homeUserName || user?.name?.trim() || user?.email?.split("@")[0] || "User";

  // Add this useEffect to listen for changes from Habits page
  useEffect(() => {
    const handleHabitToggled = (event) => {
      const { habitId, completed, source } = event.detail;
      
      // Only process events from habits page to avoid loops
      if (source === 'habits') {
        const habitIndex = homeHabits.findIndex(h => h.id === habitId);
        if (habitIndex !== -1) {
          const newCompleted = [...homeCompleted];
          newCompleted[habitIndex] = completed;
          setHomeCompleted(newCompleted);
          
          // Update localStorage to stay in sync
          const completionData = getHabitCompletion();
          completionData[habitId] = completed;
          setHabitCompletion(completionData);
        }
      }
    };

    window.addEventListener('habitToggled', handleHabitToggled);
    return () => window.removeEventListener('habitToggled', handleHabitToggled);
  }, [homeHabits, homeCompleted]);

  // Fetch user data from backend
  const fetchHomeUserData = useCallback(async () => {
    try {
      const userData = await apiFetch("/users/me");
      if (userData && userData.name) {
        setHomeUserName(userData.name);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  // Fetch habits from database
  const fetchHomeHabitsFromDB = useCallback(async () => {
    try {
      setHomeLoading(true);
      const habitsData = await apiFetch("/habits");
      
      if (Array.isArray(habitsData)) {
        // Convert API response to internal format
        const processedHabits = habitsData.map((habit) => ({
          id: habit.habit_id,
          name: habit.habit_name,
          category: habit.category?.category_name || "General",
          emoji: habit.emoji,
          streak: calculateHomeStreak(habit.history),
          history: habit.history || {},
          duration_minutes: habit.duration_minutes,
        }));

        setHomeHabits(processedHabits);
        
        // Set completed from localStorage (for sync) or API history
        const completionData = getHabitCompletion();
        const completedToday = processedHabits.map(h => {
          // Prefer localStorage sync, fallback to API data
          return completionData[h.id] !== undefined ? completionData[h.id] : !!h.history[homeTodayStr];
        });
        setHomeCompleted(completedToday);
      }
    } catch (error) {
      console.error("Failed to fetch habits from database:", error);
      setHomeHabits([]);
      setHomeCompleted([]);
    } finally {
      setHomeLoading(false);
    }
  }, [homeTodayStr]);

  // Toggle habit completion
  const homeToggleHabit = useCallback((index) => {
    const habit = homeHabits[index];
    if (!habit) return;

    const isCurrentlyDone = homeCompleted[index];
    const newDone = !isCurrentlyDone;
    const habitId = habit.id;

    // Optimistic update
    const newCompleted = [...homeCompleted];
    newCompleted[index] = newDone;
    setHomeCompleted(newCompleted);

    // Update localStorage for sync with Habits page
    const completionData = getHabitCompletion();
    completionData[habitId] = newDone;
    setHabitCompletion(completionData);

    // Emit custom event for real-time sync
    window.dispatchEvent(new CustomEvent('habitToggled', { 
      detail: { habitId: habitId, completed: newDone, source: 'home' }
    }));

    // API call
    (async () => {
      try {
        const endpoint = `/habits/${habitId}/complete?on=${homeTodayStr}`;
        
        await apiFetch(endpoint, {
          method: newDone ? "POST" : "DELETE",
        });

        // Update habit history locally
        const updatedHabits = [...homeHabits];
        const newHistory = { ...updatedHabits[index].history };
        if (newDone) {
          newHistory[homeTodayStr] = true;
        } else {
          delete newHistory[homeTodayStr];
        }
        
        updatedHabits[index] = {
          ...updatedHabits[index],
          history: newHistory,
          streak: calculateHomeStreak(newHistory),
        };
        setHomeHabits(updatedHabits);
      } catch (error) {
        console.error("Failed to toggle habit:", error);
        // Revert optimistic update on error
        const revertedCompleted = [...homeCompleted];
        revertedCompleted[index] = isCurrentlyDone;
        setHomeCompleted(revertedCompleted);
        
        // Revert localStorage
        const completionData = getHabitCompletion();
        completionData[habitId] = isCurrentlyDone;
        setHabitCompletion(completionData);
        
        // Emit revert event
        window.dispatchEvent(new CustomEvent('habitToggled', { 
          detail: { habitId, completed: isCurrentlyDone, source: 'home' }
        }));
      }
    })();
  }, [homeCompleted, homeHabits, homeTodayStr]);

  // Mood handlers
  const handleHomeMoodClick = useCallback((moodIndex) => {
    setHomeSelectedMood(moodIndex);
    setHomeMoodSaved(false);
  }, []);

  const handleHomeSaveMood = useCallback(async () => {
    if (homeSelectedMood === null) return;

    try {
      const homeMoodScore = homeSelectedMood + 1;
      
      await apiFetch("/mood/", {
        method: "POST",
        body: JSON.stringify({
          mood_score: homeMoodScore,
          logged_on: homeTodayStr,
          note: null
        })
      });

      setHomeMoodSaved(true);
      setHomeSaveFeedback("Mood saved for today");
      
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
          onComplete: () => {
            setHomeSaveFeedback("");
            setHomeSelectedMood(null);
            setHomeMoodSaved(false);
          }
        });
      }, 1500);

      window.dispatchEvent(new CustomEvent("moodUpdated"));
    } catch (error) {
      console.error("Failed to save mood:", error);
      setHomeSaveFeedback("Failed to save mood");
      
      setTimeout(() => {
        setHomeSaveFeedback("");
      }, 2000);
    }
  }, [homeSelectedMood, homeTodayStr]);

  // Animate progress bar
  const animateHomeProgressBar = useCallback((targetWidth) => {
    if (!homeProgressFillRef.current) return;
    gsap.to(homeProgressFillRef.current, {
      width: `${targetWidth}%`,
      duration: 0.8,
      ease: "power2.inOut"
    });
  }, []);

  // Check and load mood
  const checkAndResetHomeMood = useCallback(async () => {
    try {
      const response = await apiFetch("/mood/today");
      
      if (response && response.logged_on === homeTodayStr) {
        const emojiIndex = Math.max(0, Math.min(4, response.mood_score - 1));
        setHomeSelectedMood(emojiIndex);
        setHomeMoodSaved(true);
      } else {
        setHomeSelectedMood(null);
        setHomeMoodSaved(false);
      }
    } catch (error) {
      console.log("No mood logged for today");
      setHomeSelectedMood(null);
      setHomeMoodSaved(false);
    }
  }, [homeTodayStr]);

  // Fetch gratitude
  const fetchHomeGratitude = useCallback(async () => {
    try {
      const data = await apiFetch("/gratitude/");
      
      if (Array.isArray(data) && data.length > 0) {
        const entriesWithText = data.filter(entry => entry.text && entry.text.trim());
        if (entriesWithText.length > 0) {
          const randomEntry = entriesWithText[Math.floor(Math.random() * entriesWithText.length)];
          setHomeRandomGratitude(randomEntry.text);
        } else {
          setHomeRandomGratitude("Take a moment to feel grateful today.");
        }
      } else {
        setHomeRandomGratitude("Take a moment to feel grateful today.");
      }
    } catch (error) {
      console.error("Error fetching gratitude:", error);
      setHomeRandomGratitude("Take a moment to feel grateful today.");
    }
  }, []);

  // Refresh all data at midnight Bangkok time
  const scheduleNextMidnightRefresh = useCallback(() => {
    // Clear any existing timeout
    if (midnightRefreshTimeoutRef.current) {
      clearTimeout(midnightRefreshTimeoutRef.current);
    }

    const timeUntilMidnight = getTimeUntilMidnightBangkok();
    console.log(`Next refresh scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);

    midnightRefreshTimeoutRef.current = setTimeout(() => {
      console.log("Midnight refresh triggered!");
      
      // Clear local completion data for new day
      setHabitCompletion({});
      
      // Refresh all data
      fetchHomeHabitsFromDB();
      checkAndResetHomeMood();
      fetchHomeGratitude();
      fetchHomeUserData();
      
      // Schedule next refresh
      scheduleNextMidnightRefresh();
    }, timeUntilMidnight);
  }, [fetchHomeHabitsFromDB, checkAndResetHomeMood, fetchHomeGratitude, fetchHomeUserData]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchHomeUserData();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchHomeUserData]);

  // Calculate weekly progress
  useEffect(() => {
    try {
      const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().slice(0, 10);
      });

      const weeklyTotal = lastSevenDays.reduce((sum, date) => {
        return sum + homeHabits.filter((h) => !!h.history?.[date]).length;
      }, 0);

      const weekly = homeTotalHabits ? Math.round((weeklyTotal / (homeTotalHabits * 7)) * 100) : 0;
      setHomeWeeklyProgress(weekly);

      const prevWeekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (i + 7));
        return date.toISOString().slice(0, 10);
      });

      const prevWeekTotal = prevWeekDays.reduce((sum, date) => {
        return sum + homeHabits.filter((h) => !!h.history?.[date]).length;
      }, 0);

      const prevWeekly = homeTotalHabits ? Math.round((prevWeekTotal / (homeTotalHabits * 7)) * 100) : 0;
      setHomeImprovement(weekly - prevWeekly);
    } catch (error) {
      console.error("Failed to calculate progress:", error);
    }
  }, [homeTotalHabits, homeHabits]);

  // Initialize on mount
  useEffect(() => {
    fetchHomeHabitsFromDB();
    fetchHomeUserData();
    checkAndResetHomeMood();
    fetchHomeGratitude();
    scheduleNextMidnightRefresh();

    const handleHomeFocus = () => {
      fetchHomeHabitsFromDB();
      checkAndResetHomeMood();
    };

    window.addEventListener("focus", handleHomeFocus);
    
    return () => {
      window.removeEventListener("focus", handleHomeFocus);
      if (midnightRefreshTimeoutRef.current) {
        clearTimeout(midnightRefreshTimeoutRef.current);
      }
    };
  }, [fetchHomeHabitsFromDB, fetchHomeUserData, checkAndResetHomeMood, fetchHomeGratitude, scheduleNextMidnightRefresh]);

  // Animations
  useEffect(() => {
    const homeTl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".combined-progress-card", ".habit-card", ".right-col > div"], { opacity: 1 });

    homeTl.from(homeHeaderRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".combined-progress-card", { y: 30, opacity: 0, duration: 0.6 }, "-=0.5")
      .from(".habit-card", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, []);

  // Animate progress bar
  useEffect(() => {
    animateHomeProgressBar(homeProgressPercentage);
  }, [homeProgressPercentage, animateHomeProgressBar]);

  // Calculate overall streak from habits (use best streak from all habits)
  useEffect(() => {
    try {
      // Find the maximum streak across all habits
      const maxStreak = Math.max(
        ...homeHabits.map(h => calculateHomeStreak(h.history || {})),
        0
      );
      setHomeOverallStreak(maxStreak);
    } catch (error) {
      console.error("Home streak calculation error:", error);
      setHomeOverallStreak(0);
    }
  }, [homeHabits]);

  // Sort habits (completed last)
  const homeSortedHabits = homeHabits
    .map((habit, index) => ({ ...habit, index, done: homeCompleted[index] }))
    .sort((a, b) => a.done - b.done);

  if (homeLoading) {
    return (
      <div className="home-layout">
        <main className="home-main">
          <p>Loading your habits...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home-layout">
      <Jar />
      <main className="home-main">
        <header className="home-header" ref={homeHeaderRef}>
          <div className="header-left">
            <h1>{`${getHomeGreeting()}, ${homeDisplayName}! 🌸`}</h1>
            <p>
              You've completed {homeCompletedHabits} of {homeTotalHabits}{" "}
              {homeTotalHabits === 1 ? "task" : "tasks"} today.
            </p>
          </div>
        </header>

        <section className="home-grid">
          <div className="left-col">
            <div className="combined-progress-card" style={{ marginTop: 0 }}>
              <div className="combined-card-header">
                <h2 className="combined-card-title">Today's Habits</h2>
                <p className="combined-card-subtitle">
                  {getMotivationMessage(homeCompletedHabits, homeTotalHabits, homeWeeklyProgress, homeImprovement)}
                </p>
              </div>

              <div className="progress-section">
                <div className="progress-info">
                  <span>Progress</span>
                  <span className="progress-percentage">{Math.round(homeProgressPercentage)}%</span>
                </div>
                <div className="home-progress-bar-container">
                  <div className="home-progress-bar">
                    <div className="home-progress-fill" ref={homeProgressFillRef} />
                  </div>
                </div>
              </div>

              {homeSortedHabits.map((habit) => (
                <div className={`habit-card ${habit.done ? "done" : ""}`} key={habit.index}>
                  <button
                    className="habit-check"
                    onClick={() => homeToggleHabit(habit.index)}
                    aria-pressed={habit.done}
                    aria-label={`Mark ${habit.name} as ${habit.done ? "incomplete" : "complete"}`}
                  >
                    {habit.done && <span className="material-symbols-outlined">check</span>}
                  </button>
                  <div className="habit-info">
                    <div className="habit-left">
                      <h3>{habit.name}</h3>
                      <span 
                        className="tag"
                        style={{ 
                          background: getCategoryColor(habit.category),
                          borderColor: getCategoryColor(habit.category)
                        }}
                      >
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
          </div>

          <div className="right-col">
            <div 
              className="streak-card"
              onClick={() => onNavigate?.("reports")}
              role="button"
              tabIndex="0"
              style={{ cursor: "pointer" }}
            >
              <h3>Streak</h3>
              <div className="streak-number">{homeOverallStreak}</div>
              <p className="streak-sub">
                {homeOverallStreak <= 1 ? "Day Active 🔥" : "Days Active 🔥"}
              </p>
            </div>

            <div className="mood-card">
              <h3>How are you feeling?</h3>
              <div className="mood-list">
                {HOME_MOOD_EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleHomeMoodClick(index)}
                    className={`mood-btn ${homeSelectedMood === index ? "selected" : ""}`}
                    aria-label={`Select mood ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              {homeSelectedMood !== null && !homeMoodSaved && (
                <div className="mood-save">
                  <p>You're feeling {HOME_MOOD_EMOJIS[homeSelectedMood]}</p>
                  <button
                    className="home-save-btn"
                    onClick={handleHomeSaveMood}
                    disabled={homeMoodSaved}
                  >
                    Save Mood
                  </button>
                  <div aria-live="polite" className="mood-save-feedback">
                    {homeSaveFeedback}
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className="gratitude-card"
              onClick={() => onNavigate?.("gratitude")}
              role="button"
              tabIndex="0"
              style={{ cursor: "pointer" }}
            >
              <h3>Today's Gratitude 🙏</h3>
              <p>"{homeRandomGratitude || "Take a moment to feel grateful today."}"</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}