import React, { useMemo, useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./style/Calendar.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabel = (y, m) =>
  new Date(y, m, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
const dateKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const LEGEND = [
  ["😭", "Tough"],
  ["😕", "Okay"],
  ["🙂", "Good"],
  ["😊", "Great"],
  ["😄", "Amazing"],
];

const MOOD_COLORS = {
  "😭": "#ef4444",
  "😕": "#fbbf24",
  "🙂": "#10b981",
  "😊": "#6366f1",
  "😄": "#f97316",
};

const API = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  console.log("🔐 authHeaders called");
  console.log("   Token exists:", !!token);
  console.log("   Token prefix:", token ? token.substring(0, 20) + "..." : "none");
  
  const headers = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log("   Authorization header set: Bearer " + token.substring(0, 20) + "...");
  } else {
    console.log("   ⚠️  No token found in localStorage!");
  }
  
  return headers;
};

const scoreToEmoji = (score) => {
  const emojis = ["😭", "😕", "🙂", "😊", "😄"];
  return emojis[Math.max(0, Math.min(4, score - 1))];
};

export default function Calendar() {
  const today = new Date();
  const [date, setDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [moods, setMoods] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const cells = useMemo(() => buildMonthGrid(date.year, date.month), [date]);
  const daysInMonth = new Date(date.year, date.month + 1, 0).getDate();

  const calRef = useRef(null);
  const monthRef = useRef(null);
  const cardRefs = useRef([]);

  // Load moods from backend
  const loadMoods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("token");
      console.log("Token in storage:", token ? "✔ Found" : "✘ Missing");
      console.log("Auth headers:", authHeaders());
      console.log("Fetching moods from:", `${API}/mood/?limit=365`);
      
      const res = await fetch(`${API}/mood/?limit=365`, { headers: authHeaders() });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch moods: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Moods data received:", data);
      
      const moodMap = {};
      data.forEach(m => {
        const emoji = scoreToEmoji(m.mood_score);
        moodMap[m.logged_on] = emoji;
        console.log(`Date: ${m.logged_on}, Score: ${m.mood_score}, Emoji: ${emoji}`);
      });
      
      console.log("Mood map:", moodMap);
      setMoods(moodMap);
    } catch (e) {
      console.error("Failed to load moods:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadMoods();
  }, []);

  // Listen for mood updates from Mood.js
  useEffect(() => {
    const handleMoodUpdate = () => {
      console.log("Mood updated event detected, reloading...");
      loadMoods();
    };
    
    window.addEventListener("moodUpdated", handleMoodUpdate);
    return () => window.removeEventListener("moodUpdated", handleMoodUpdate);
  }, []);

  // Animations
  useEffect(() => {
    if (!calRef.current) return;
    gsap.set(calRef.current, { opacity: 1, visibility: "visible" });
    
    const validRefs = cardRefs.current.filter(Boolean);
    if (validRefs.length > 0) {
      gsap.fromTo(
        validRefs,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.15,
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!monthRef.current) return;
    gsap.set(monthRef.current, { opacity: 1, y: 0 });
    gsap.fromTo(
      monthRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }, [date]);

  // Calculate mood statistics
  const moodCounts = useMemo(() => {
    const counts = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const emo = moods[dateKey(date.year, date.month, d)];
      if (emo) counts[emo] = (counts[emo] || 0) + 1;
    }
    return counts;
  }, [date, daysInMonth, moods]);

  const totalTracked = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const positiveEmos = new Set(["🙂", "😊", "😄"]);
  const positiveCount = Object.entries(moodCounts)
    .filter(([emo]) => positiveEmos.has(emo))
    .reduce((acc, [, c]) => acc + c, 0);
  const positivePct = totalTracked ? Math.round((positiveCount / totalTracked) * 100) : 0;

  // Sort legend by percentage (descending)
  const sortedLegend = useMemo(() => {
    return [...LEGEND].sort((a, b) => {
      const countA = moodCounts[a[0]] || 0;
      const countB = moodCounts[b[0]] || 0;
      const pctA = totalTracked ? (countA / totalTracked) * 100 : 0;
      const pctB = totalTracked ? (countB / totalTracked) * 100 : 0;
      return pctB - pctA;
    });
  }, [moodCounts, totalTracked]);

  const onPrev = () => setDate(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  
  const onNext = () => {
    const nextMonth = date.month === 11 ? { year: date.year + 1, month: 0 } : { year: date.year, month: date.month + 1 };
    // Don't allow navigation to future months
    if (nextMonth.year < today.getFullYear() || (nextMonth.year === today.getFullYear() && nextMonth.month <= today.getMonth())) {
      setDate(nextMonth);
    }
  };
  
  const isNextDisabled = () => {
    const nextMonth = date.month === 11 ? { year: date.year + 1, month: 0 } : { year: date.year, month: date.month + 1 };
    return nextMonth.year > today.getFullYear() || (nextMonth.year === today.getFullYear() && nextMonth.month > today.getMonth());
  };

  if (loading) {
    return (
      <div className="cal-page" ref={calRef}>
        <div className="cal-content">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2>Loading mood calendar...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cal-page" ref={calRef}>
        <div className="cal-content">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Error: {error}</h2>
            <button 
              onClick={loadMoods}
              style={{
                padding: '10px 20px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-page" ref={calRef}>
      <div className="cal-content">

        <section className="card calendar-card" ref={el => (cardRefs.current[0] = el)}>
          <div className="card-head" ref={monthRef}>
            <button className="icon-btn" onClick={onPrev}>‹</button>
            <h2 className="card-title">{monthLabel(date.year, date.month)}</h2>
            <button className="icon-btn" onClick={onNext} disabled={isNextDisabled()}>›</button>
          </div>

          <div className="card-body">
            <div className="week-header">
              {WEEK_DAYS.map(d => <div key={d} className="week-name">{d}</div>)}
            </div>

            <div className="cal-grid">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} className="day-cell day-empty" />;

                const emo = moods[dateKey(date.year, date.month, day)];
                const isToday =
                  day === today.getDate() &&
                  date.month === today.getMonth() &&
                  date.year === today.getFullYear();

                return (
                  <div
                    key={`d-${idx}`}
                    className={`day-cell ${isToday ? "day-today" : ""}`}
                    style={emo ? { "--mood-color": MOOD_COLORS[emo] } : {}}
                    onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.2 })}
                    onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}
                  >
                    <div className="day-number">{day}</div>
                    {emo && <div className="day-emoji">{emo}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid-2">
          <div className="card summary-card" ref={el => (cardRefs.current[1] = el)}>
            <div className="card-head-only"><h3 className="card-title">Mood Summary</h3></div>
            <div className="card-body">
              {sortedLegend.map(([emoji, label]) => {
                const count = moodCounts[emoji] || 0;
                const pct = totalTracked ? Math.round((count / totalTracked) * 100) : 0;
                const dayLabel = count <= 1 ? 'day' : 'days';
                return (
                  <div key={emoji} className="summary-row">
                    <div className="summary-left">
                      <span className="summary-emoji">{emoji}</span>
                      <div className="summary-text">
                        <span className="summary-label">{label}</span>
                        <span className="summary-count">{count} {dayLabel}</span>
                      </div>
                    </div>
                    <div className="progress-row">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: MOOD_COLORS[emoji]
                          }}
                        />
                      </div>
                      <div className="progress-percentage">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card insights-card" ref={el => (cardRefs.current[2] = el)}>
            <div className="card-head-only"><h3 className="card-title">Monthly Insights</h3></div>
            <div className="card-body">
              <div className="insight-positive">
                <div className="insight-number">{positivePct}%</div>
                <div className="insight-label">Positive mood days</div>
              </div>
              <div className="kv">
                <span className="kv-key">Most common mood:</span>
                <span className="kv-val">
                  {Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "–"}
                </span>
              </div>
              <div className="kv">
                <span className="kv-key">Days tracked:</span>
                <span className="kv-val">{totalTracked} / {daysInMonth}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
