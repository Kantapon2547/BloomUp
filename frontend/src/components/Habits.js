import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Trash2, Search, Trophy, Sun, CheckCircle2 } from "lucide-react";
import Sidebar from "../components/Sidebar"; 
import "./Habits.css";

/* -------------------- utils -------------------- */
const fmt = (d) => d.toISOString().slice(0, 10);            // YYYY-MM-DD
const todayKey = () => fmt(new Date());
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
};

export default function Habits() {
  /* -------------------- state -------------------- */
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [query, setQuery] = useState("");
  const [bursts, setBursts] = useState([]);

  /* -------------------- persistence -------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("habit-tracker@v3");
      if (raw) setHabits(JSON.parse(raw));
      else {
        setHabits([
          { name: "drink water", category: "health", history: {}, createdAt: todayKey(), bestStreak: 0 },
          { name: "study",       category: "study",  history: {}, createdAt: todayKey(), bestStreak: 0 },
        ]);
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("habit-tracker@v3", JSON.stringify(habits));
  }, [habits]);

  /* -------------------- helpers -------------------- */
  const weekDates = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const day = now.getDay(); // 0 Sun
    start.setDate(now.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return fmt(d);
    });
  }, []);

  const calcStreak = (h) => {
    let s = 0;
    for (let i = 0; ; i++) {
      const key = daysAgo(i);
      if (h.history[key]) s++;
      else break;
    }
    return s;
  };

  const setDone = (idx, key, value) => {
    setHabits((prev) => {
      const copy = [...prev];
      const h = { ...copy[idx] };
      const hist = { ...h.history, [key]: value };
      const after = { ...h, history: hist };
      const streak = calcStreak(after);
      const best = Math.max(h.bestStreak || 0, streak);
      copy[idx] = { ...after, bestStreak: best };
      return copy;
    });
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    setHabits((h) => [
      { name: newHabit.trim(), category: newCategory, history: {}, createdAt: todayKey(), bestStreak: 0 },
      ...h,
    ]);
    setNewHabit("");
    setNewCategory("general");
  };

  const removeHabit = (index) => setHabits((h) => h.filter((_, i) => i !== index));

  /* -------------------- stats -------------------- */
  const filtered = habits.filter((h) => h.name.toLowerCase().includes(query.toLowerCase()));
  const completedToday = habits.filter((h) => h.history[todayKey()]).length;
  const completionRate = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;
  const longestStreak = habits.reduce((m, h) => Math.max(m, calcStreak(h)), 0);

  /* -------------------- groups -------------------- */
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((h) => {
      const key = h.category || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });
    return Array.from(map.entries());
  }, [filtered]);

  /* -------------------- tiny confetti -------------------- */
  const triggerConfetti = () => {
    setBursts((b) => [...b, Date.now()]);
    setTimeout(() => setBursts((b) => b.slice(1)), 800);
  };

  /* -------------------- render -------------------- */
  return (
    <div className="habits-root">
      <div className="habits-grid">
        {/* LEFT: Sidebar */}
        <Sidebar />

        {/* RIGHT: Content */}
        <div className="habits-content">
          {/* Header */}
          <header className="habits-header">
            <div className="brand">
              <div className="brand-circle">B</div>
              <div>
                <h1 className="brand-title">My Habits</h1>
                <p className="brand-sub">Build consistent routines for academic and personal growth</p>
              </div>
            </div>
          </header>

          {/* Controls */}
          <section className="card card--violet controls">
            <div className="controls-row">
              <div className="search-wrap">
                <input
                  className="input search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search habits"
                />
                <Search size={16} className="search-icon" />
              </div>

              <div className="add-wrap">
                <input
                  className="input"
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                  placeholder="Add a habit"
                />
                <select
                  className="select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="general">general</option>
                  <option value="study">study</option>
                  <option value="health">health</option>
                  <option value="mind">mind</option>
                </select>
                <button className="btn" onClick={addHabit}>
                  <PlusCircle size={16} />
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Summary */}
          <section className="card card--violet summary">
            <div className="summary-head">
              <div className="summary-title">Today's Progress</div>
              <div className="summary-sub">
                {completedToday} of {habits.length} completed
              </div>
            </div>
            <div className="summary-rate">{completionRate}%</div>
            <div className="progress">
              <div className="progress__bar" style={{ width: `${completionRate}%` }} />
            </div>

            <div className="summary-stats">
              {[
                { label: "Today", value: completedToday, Icon: Sun },
                { label: "Completion", value: `${completionRate}%`, Icon: CheckCircle2 },
                { label: "Longest", value: `${longestStreak}d`, Icon: Trophy },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="stat-card">
                  <div className="stat-head">
                    <Icon size={14} />
                    <span>{label}</span>
                  </div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Groups */}
          <section className="groups">
            {groups.map(([cat, list]) => (
              <div key={cat} className="group">
                <div className="group-chip">
                  <span className="cap">{cat} Habits</span>
                  <span className="count">{list.length}/{list.length}</span>
                </div>

                <div className="group-list">
                  {list.map((habit) => {
                    const idx = habits.findIndex((h) => h === habit);
                    const current = calcStreak(habit);
                    const best = habit.bestStreak || 0;
                    const isTodayDone = !!habit.history[todayKey()];
                    return (
                      <div key={habit.name + idx} className="card card--violet habit-card">
                        <div className="habit-top">
                          <div className="habit-left">
                            <input
                              type="checkbox"
                              checked={isTodayDone}
                              onChange={() => {
                                setDone(idx, todayKey(), !isTodayDone);
                                triggerConfetti();
                              }}
                              className="checkbox"
                            />
                            <h3 className={`habit-name ${isTodayDone ? "is-done" : ""}`}>{habit.name}</h3>
                            <span className="streak">🔥 {current}</span>
                          </div>
                          <div className="habit-right">
                            <div className="best">Best: {best} days</div>
                            <button className="ghost" title="Delete" onClick={() => removeHabit(idx)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="habit-tags">
                          <span className="chip">{cat}</span>
                          <span className="chip">daily</span>
                        </div>

                        <div className="habit-week">
                          {weekDates.map((d, i) => {
                            const isDone = !!habit.history[d];
                            return (
                              <button
                                key={d}
                                onClick={() => setDone(idx, d, !isDone)}
                                className={`week-btn ${isDone ? "is-done" : ""}`}
                                title={new Date(d).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              >
                                {"SMTWTFS"[i]}
                              </button>
                            );
                          })}
                          <div className="current">Current: {current} days</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* Confetti */}
          <AnimatePresence>
            {bursts.map((id) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.8, y: 0 }}
                animate={{ opacity: 1, scale: 1, y: -20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="sparkle"
              >
                ✨
              </motion.div>
            ))}
          </AnimatePresence>

          <footer className="footer">draff✨</footer>
        </div>
      </div>
    </div>
  );
}
