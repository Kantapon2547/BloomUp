import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./style/Home.css";
import Jar from '../components/Jar';

// Home Component Constants
const HOME_LS_KEY = "habit-tracker@hybrid";
const HOME_MOOD_EMOJIS = ["😭", "😐", "🙂", "😊", "😁"];

// Home Helper functions
const getHomeTodayString = () => {
  const bangkokTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  return new Date(bangkokTime).toISOString().slice(0, 10);
};

const getHomeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const calculateHomeStreak = (habit) => {
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

const getCategoryColor = (categoryName) => {
  const defaultCategories = {
    'General': '#ede9ff',
    'Study': '#fff4cc', 
    'Health': '#e9fcef',
    'Mind': '#fbefff',
    'Personal': '#e6e6f9'
  };
  
  try {
    const storedCats = JSON.parse(localStorage.getItem("habit-tracker@categories"));
    if (storedCats && Array.isArray(storedCats)) {
      const foundCat = storedCats.find(cat => 
        typeof cat === 'object' ? cat.name === categoryName : cat === categoryName
      );
      if (foundCat) {
        return typeof foundCat === 'object' ? foundCat.color : defaultCategories[categoryName];
      }
    }
  } catch (error) {
    console.warn('Failed to load categories from storage:', error);
  }
  
  return defaultCategories[categoryName] || '#e6e6f9';
};

const FEEDBACK_TEMPLATES = {
  0: {
    baseMessages: [
      "You are capable of amazing things.",
      "Every journey begins with a single step.",
      "Ready to begin? Just click and you'll immediately beat 0%.",
      "Every 100% success starts here. Take your first step",
      "Every big goal starts with a small step — you've got this!"
    ],
  },
  25: {
    baseMessages: [
      "Every journey starts with a single step! You've officially begun.",
      "Great start! Keep that streak going!",
      "Keep going! The hardest part is starting, and you've already done that. 25% complete!",
      "Good progress! you're already a quarter of the way there!"
    ],
  },
  50: {
    baseMessages: [
      "Halfway there! You're doing great! ",
      "50% complete today. Keep going!",
      "Halfway there! The goal is closer than the start.",
    ],
  },
  75: {
    baseMessages: [
      "Almost there! You're unstoppable! ",
      "75% complete! One more push!",
      "You've come so far. just a little more effort to go!"
    ],
  },
  100: {
    baseMessages: [
      "Perfect day! You're a champion!!",
      "100% complete! Crushed your goals!",
      "Amazing finish! Keep the streak going — tomorrow's a new opportunity.",
      "Congratulations! You did it!"
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

export default function Home({ user }) {
  const navigate = useNavigate();
  const homeTodayStr = getHomeTodayString();

  // Refs
  const homeHeaderRef = useRef(null);
  const homeProgressFillRef = useRef(null);

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

  // Derived state
  const homeCompletedHabits = homeCompleted.filter(Boolean).length;
  const homeTotalHabits = homeHabits.length;
  const homeProgressPercentage = homeTotalHabits ? (homeCompletedHabits / homeTotalHabits) * 100 : 0;
  const homeDisplayName = homeUserName || user?.name?.trim() || user?.email?.split("@")[0] || "User";

  // Fetch user data from backend
  const fetchHomeUserData = useCallback(async () => {
    try {
      const getToken = () => {
        const token = localStorage.getItem("token");
        console.log("Home.js Token:", token ? token.substring(0, 20) + "..." : "null");
        
        if (!token || token === "null" || token === "undefined") {
          return null;
        }
        
        if (token.startsWith("eyJ") && !token.startsWith("Bearer ")) {
          return `Bearer ${token}`;
        }
        
        return token;
      };

      // Then use it:
      const token = getToken();
      if (!token) {
        console.warn("No token found, using fallback user data");
        return;
      }

      const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${API}/users/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.name) {
          setHomeUserName(userData.name);
        }
      } else {
        console.warn("Failed to fetch user data, using fallback");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  // Home Data synchronization
  const homeSyncFromHabits = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(HOME_LS_KEY) || "[]");
      
      if (Array.isArray(raw)) {
        const processedHabits = raw.map((habit) => ({
          id: habit.id,
          name: habit.name,
          category: habit.category || "General",
          streak: calculateHomeStreak(habit),
        }));

        setHomeHabits(processedHabits);
        setHomeCompleted(raw.map((habit) => !!habit.history?.[homeTodayStr]));
      } else {
        setHomeHabits([]);
        setHomeCompleted([]);
      }
    } catch (error) {
      console.error("Failed to sync habits:", error);
      setHomeHabits([]);
      setHomeCompleted([]);
    }
  }, [homeTodayStr]);

  // Toggle habit completion
  const homeToggleHabit = useCallback((index) => {
    const newCompleted = [...homeCompleted];
    newCompleted[index] = !newCompleted[index];
    setHomeCompleted(newCompleted);
  
    try {
      const raw = JSON.parse(localStorage.getItem(HOME_LS_KEY) || "[]");
      if (Array.isArray(raw) && raw[index]) {
        raw[index].history = raw[index].history || {};
        
        if (newCompleted[index]) {
          raw[index].history[homeTodayStr] = true;
        } else {
          delete raw[index].history[homeTodayStr];
        }
  
        localStorage.setItem(HOME_LS_KEY, JSON.stringify(raw));
  
        const updatedHabits = [...homeHabits];
        updatedHabits[index] = {
          ...updatedHabits[index],
          streak: calculateHomeStreak(raw[index]),
        };
        setHomeHabits(updatedHabits);
  
        const anyCompleted = newCompleted.some(Boolean);
        if (!anyCompleted) {
          const homeUserStreakKey = `home.streak.${user?.email || "default"}`;
          const reset = { count: 0, lastActiveDate: null };
          localStorage.setItem(homeUserStreakKey, JSON.stringify(reset));
          setHomeOverallStreak(0);
        }
      }
    } catch (error) {
      console.error("Failed to toggle habit:", error);
    }
  }, [homeCompleted, homeHabits, homeTodayStr, user]);
  

  // Home Mood handlers
  const handleHomeMoodClick = useCallback((moodIndex) => {
    setHomeSelectedMood(moodIndex);
    setHomeMoodSaved(false);
  }, []);

  const handleHomeSaveMood = useCallback(async () => {
    if (homeSelectedMood === null) return;

    try {
      localStorage.setItem(
        "home.mood",
        JSON.stringify({ 
          date: homeTodayStr, 
          value: homeSelectedMood,
          user: user?.email || "default"
        })
      );

      const homeMoodScore = homeSelectedMood + 1;
      const token = localStorage.getItem("token");
      const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API}/mood/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          mood_score: homeMoodScore,
          logged_on: homeTodayStr,
          note: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.detail?.includes("already exists")) {
          console.log("Mood already exists, updating instead");
          const todayResponse = await fetch(`${API}/mood/today`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (todayResponse.ok) {
            const todayMood = await todayResponse.json();
            if (todayMood) {
              const updateResponse = await fetch(`${API}/mood/${todayMood.mood_id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                  mood_score: homeMoodScore,
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

      window.dispatchEvent(new CustomEvent("moodUpdated"));

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
    } catch (error) {
      console.error("Failed to save mood:", error);
      setHomeSaveFeedback("Failed to save mood");
      
      setTimeout(() => {
        setHomeSaveFeedback("");
      }, 2000);
    }
  }, [homeSelectedMood, homeTodayStr, user]);

  // Animate progress bar
  const animateHomeProgressBar = useCallback((targetWidth) => {
    if (!homeProgressFillRef.current) return;
    gsap.to(homeProgressFillRef.current, {
      width: `${targetWidth}%`,
      duration: 0.8,
      ease: "power2.inOut"
    });
  }, []);

  // Create interactive card props
  const makeHomeCardInteractive = useCallback((onActivate) => ({
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
  const checkAndResetHomeMood = useCallback(async () => {
    const storedMood = JSON.parse(localStorage.getItem("home.mood") || "null");
    const currentUserEmail = user?.email || "default";
    
    if (storedMood?.user !== currentUserEmail || storedMood?.date !== homeTodayStr) {
      setHomeSelectedMood(null);
      setHomeMoodSaved(false);
      localStorage.removeItem("home.mood");
      
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
          if (todayMood && todayMood.logged_on === homeTodayStr) {
            const emojiIndex = Math.max(0, Math.min(4, todayMood.mood_score - 1));
            setHomeSelectedMood(emojiIndex);
            setHomeMoodSaved(true);
            
            localStorage.setItem(
              "home.mood",
              JSON.stringify({ 
                date: homeTodayStr, 
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
      setHomeSelectedMood(storedMood.value);
      setHomeMoodSaved(true);
    }
  }, [homeTodayStr, user]);

  // Fetch gratitude data from backend
  const fetchHomeGratitude = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setHomeRandomGratitude("Take a moment to feel grateful today.");
        return;
      }

      const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${API}/gratitude/`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch gratitude: ${response.status}`);
      }

      const data = await response.json();
      
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

  useEffect(() => {
    fetchHomeGratitude();
  }, [fetchHomeGratitude]);

  // Calculate weekly progress and improvement
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(HOME_LS_KEY) || "[]");

      if (Array.isArray(raw)) {
        // Calculate last 7 days progress
        const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().slice(0, 10);
        });

        const weeklyTotal = lastSevenDays.reduce((sum, date) => {
          return sum + raw.filter((habit) => !!habit.history?.[date]).length;
        }, 0);

        const weekly = homeTotalHabits ? Math.round((weeklyTotal / (homeTotalHabits * 7)) * 100) : 0;
        setHomeWeeklyProgress(weekly);

        // Calculate previous week progress
        const prevWeekDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i + 7));
          return date.toISOString().slice(0, 10);
        });

        const prevWeekTotal = prevWeekDays.reduce((sum, date) => {
          return sum + raw.filter((habit) => !!habit.history?.[date]).length;
        }, 0);

        const prevWeekly = homeTotalHabits ? Math.round((prevWeekTotal / (homeTotalHabits * 7)) * 100) : 0;
        const diff = weekly - prevWeekly;
        setHomeImprovement(diff);
      }
    } catch (error) {
      console.error("Failed to calculate progress:", error);
    }
  }, [homeTotalHabits, homeCompletedHabits]);

  useEffect(() => {
    if (!user?.email) return;

    const homeUserStreakKey = `home.streak.${user.email}`;
    const stored = JSON.parse(localStorage.getItem(homeUserStreakKey) || "null");

    if (!stored) {
      const initialStreak = { count: 0, lastActiveDate: null };
      localStorage.setItem(homeUserStreakKey, JSON.stringify(initialStreak));
      setHomeOverallStreak(0);
    } else {
      setHomeOverallStreak(stored.count || 0);
    }
  }, [user]);

  // Initialize data on mount
  useEffect(() => {
    try {
      homeSyncFromHabits();
      fetchHomeUserData();
      checkAndResetHomeMood();
      
      const homeUserStreakKey = `home.streak.${user?.email || "default"}`;
      const stored = JSON.parse(localStorage.getItem(homeUserStreakKey) || "null");
      if (stored?.count) {
        setHomeOverallStreak(stored.count);
      }

    } catch (error) {
      console.error("Home initialization error:", error);
    }

    const handleHomeFocus = () => {
      homeSyncFromHabits();
      checkAndResetHomeMood();
    };
    window.addEventListener("focus", handleHomeFocus);
    return () => window.removeEventListener("focus", handleHomeFocus);
  }, [homeSyncFromHabits, homeTodayStr, checkAndResetHomeMood, fetchHomeUserData]);

  // Initial animations
  useEffect(() => {
    const homeTl = gsap.timeline({ defaults: { ease: "power2.out" } });
    gsap.set([".home-header", ".combined-progress-card", ".habit-card", ".right-col > div"], { opacity: 1 });

    homeTl.from(homeHeaderRef.current, { y: -50, opacity: 0, duration: 0.8 })
      .from(".combined-progress-card", { y: 30, opacity: 0, duration: 0.6 }, "-=0.5")
      .from(".habit-card", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.5")
      .from(".right-col > div", { y: 30, opacity: 0, stagger: 0.15, duration: 0.6 }, "-=0.7");
  }, [user?.email]);

  // Animate progress bar when percentage changes
  useEffect(() => {
    animateHomeProgressBar(homeProgressPercentage);
  }, [homeProgressPercentage, animateHomeProgressBar]);

  // Calculate streak
  useEffect(() => {
    if (!homeCompleted.some(Boolean)) return;

    try {
      const homeUserStreakKey = `home.streak.${user?.email || "default"}`;
      const stored = JSON.parse(localStorage.getItem(homeUserStreakKey) || "null");
      const lastActiveDate = stored?.lastActiveDate;

      if (lastActiveDate === homeTodayStr) return;

      let count = stored?.count || 0;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      count = lastActiveDate === yesterdayStr ? count + 1 : 1;

      localStorage.setItem(homeUserStreakKey, JSON.stringify({ count, lastActiveDate: homeTodayStr }));
      setHomeOverallStreak(count);

    } catch (error) {
      console.error("Home streak calculation error:", error);
    }
  }, [homeCompleted, homeTodayStr, user]);

  // Sort habits (completed last)
  const homeSortedHabits = homeHabits
    .map((habit, index) => ({ ...habit, index, done: homeCompleted[index] }))
    .sort((a, b) => a.done - b.done);

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
            {/* COMBINED PROGRESS & MOTIVATION CARD WITH HABITS */}
            <div className="combined-progress-card">
              <div className="combined-card-header">
                <h2 className="combined-card-title">Today's Habits</h2>
                <p className="combined-card-subtitle">
                  {getMotivationMessage(homeCompletedHabits, homeTotalHabits, homeWeeklyProgress, homeImprovement)}
                </p>
              </div>

              {/* Progress Bar */}
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

              {/* Individual Habit Cards Inside Combined Card */}
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
            <div className="streak-card" {...makeHomeCardInteractive(() => navigate("/reports"))}>
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

              {homeMoodSaved}
            </div>
            
            <div className="gratitude-card" {...makeHomeCardInteractive(() => navigate("/gratitude"))}>
              <h3>Today's Gratitude 🙏</h3>
              <p>"{homeRandomGratitude || "Take a moment to feel grateful today."}"</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}