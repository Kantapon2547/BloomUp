import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Trash2, Trophy, Sun, CheckCircle2 } from "lucide-react";
import "./style/Habits.css";

const fmt = (d) => d.toISOString().slice(0, 10);
const todayKey = () => fmt(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

function Dropdown({ label, value, onChange, options, placeholder="Select", className="" }) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) { setOpen(false); setQuery(""); setHoverIdx(-1); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = options;

  const current = options.find(o => o.value === value);

  const onKeyDown = (e) => {
    if (!open && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;

    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[Math.max(0, hoverIdx)];
      if (pick) { onChange(pick.value); setOpen(false); setQuery(""); }
    }
  };

  return (
    <div ref={wrapRef} className={`dd ${className}`} data-open={open ? "true" : "false"}>
      {label && <div className="dd-label">{label}</div>}

      <button
        ref={btnRef}
        type="button"
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setHoverIdx(-1); }}
        onKeyDown={onKeyDown}
      >
        <span className={`dd-value ${current ? "" : "is-placeholder"}`}>
          {current ? current.label : placeholder}
        </span>
        <svg className="dd-caret" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="dd-pop">
          <ul className="dd-list" role="listbox">
            {filtered.length === 0 && <li className="dd-empty">No results</li>}
            {filtered.map((opt, i) => {
              const active = opt.value === value;
              const hover  = i === hoverIdx;
              return (
                <li
                  key={opt.value}
                  className={`dd-item ${active ? "is-active":""} ${hover ? "is-hover":""}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={()=>setHoverIdx(i)}
                  onClick={()=>{ onChange(opt.value); setOpen(false); setQuery(""); }}
                >
                  <span className="dd-dot" aria-hidden="true" />
                  <span>{opt.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [bursts, setBursts] = useState([]);

  const [catFilter, setCatFilter] = useState("all");
  const [rateFilter, setRateFilter] = useState("all");
  const [streakFilter, setStreakFilter] = useState("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("habit-tracker@v3");
      if (raw) setHabits(JSON.parse(raw));
      else setHabits([
        { name: "drink water", category: "health", history: {}, createdAt: todayKey(), bestStreak: 0 },
        { name: "study",        category: "study",  history: {}, createdAt: todayKey(), bestStreak: 0 },
      ]);
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("habit-tracker@v3", JSON.stringify(habits)); }, [habits]);

  const weekDates = useMemo(() => {
    const now = new Date(); const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return fmt(d); });
  }, []);

  const calcStreak = (h) => { let s = 0; for (let i=0;;i++) { if (h.history[daysAgo(i)]) s++; else break; } return s; };

  const setDone = (idx, key, value) => {
    setHabits((prev) => {
      const copy = [...prev]; const h = { ...copy[idx] };
      copy[idx] = { ...h, history: { ...h.history, [key]: value }, bestStreak: Math.max(h.bestStreak || 0, calcStreak({...h, history: { ...h.history, [key]: value }})) };
      return copy;
    });
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    setHabits((h) => [{ name: newHabit.trim(), category: newCategory, history:{}, createdAt: todayKey(), bestStreak:0 }, ...h]);
    setNewHabit(""); setNewCategory("general");
  };

  const removeHabit = (index) => setHabits((h) => h.filter((_, i) => i !== index));

  const weekCompletionRate = (h) => { const done = weekDates.filter(d => !!h.history[d]).length; return weekDates.length ? Math.round(done / weekDates.length * 100) : 0; };

  const filtered = habits
    .filter(h => catFilter==="all" ? true : (h.category||"general")===catFilter)
    .filter(h => { if(rateFilter==="all") return true; const r = weekCompletionRate(h); if(rateFilter==="high") return r>=80; if(rateFilter==="medium") return r>=50 && r<80; if(rateFilter==="low") return r<50; return true; })
    .filter(h => { if(streakFilter==="all") return true; const s = calcStreak(h); if(streakFilter==="sHigh") return s>=10; if(streakFilter==="sMed") return s>=5 && s<10; if(streakFilter==="sLow") return s<5; return true; });

  const completedToday = habits.filter(h => h.history[todayKey()]).length;
  const completionRate = habits.length ? Math.round(completedToday / habits.length * 100) : 0;
  const longestStreak = habits.reduce((m,h)=>Math.max(m,calcStreak(h)),0);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach(h=>{ const key=h.category||"general"; if(!map.has(key)) map.set(key,[]); map.get(key).push(h); });
    return Array.from(map.entries());
  }, [filtered]);

  const triggerConfetti = () => { setBursts(b => [...b, Date.now()]); setTimeout(() => setBursts(b => b.slice(1)), 800); };

  return (
    <div className="habits-root">
      <div className="habits-grid">
        <div className="habits-content">
          <header className="habits-header">
            <div className="brand">
              <div>
                <h1 className="brand-title">My Habits</h1>
                <p className="brand-sub">Build consistent routines for academic and personal growth</p>
              </div>
            </div>
          </header>

          <section className="filterbar card">
            <div className="filterbar-row">
              <div className="filter-group">
                <div className="filterbar-title"><span className="filter-icon">⚗️</span>Filters:</div>

                <Dropdown
                  value={catFilter}
                  onChange={setCatFilter}
                  options={[
                    { value: "all",     label: "All Categories" },
                    { value: "general", label: "General" },
                    { value: "study",   label: "Study" },
                    { value: "health",  label: "Health" },
                    { value: "mind",    label: "Mind" },
                  ]}
                  placeholder="All Categories"
                />

                <Dropdown
                  value={rateFilter}
                  onChange={setRateFilter}
                  options={[
                    { value: "all",    label: "All Rates" },
                    { value: "high",   label: "High (80%+)" },
                    { value: "medium", label: "Medium (50–79%)" },
                    { value: "low",    label: "Low (<50%)" },
                  ]}
                  placeholder="All Rates"
                />

                <Dropdown
                  value={streakFilter}
                  onChange={setStreakFilter}
                  options={[
                    { value: "all",   label: "All Streaks" },
                    { value: "sHigh", label: "High (10+ days)" },
                    { value: "sMed",  label: "Medium (5–9 days)" },
                    { value: "sLow",  label: "Low (<5 days)" },
                  ]}
                  placeholder="All Streaks"
                />
              </div>

              {/* Add Habit */}
              <div className="add-group">
                <input className="input add-input" value={newHabit} onChange={e=>setNewHabit(e.target.value)} placeholder="Add a habit" />

                <Dropdown
                  className="add-dd"
                  value={newCategory}
                  onChange={setNewCategory}
                  options={[
                    { value: "general", label: "general" },
                    { value: "study",   label: "study" },
                    { value: "health",  label: "health" },
                    { value: "mind",    label: "mind" },
                  ]}
                  placeholder="category"
                />

                <button className="btn add-btn" onClick={addHabit}><PlusCircle size={16}/>Add</button>
              </div>
            </div>
          </section>

          {/* ---------- Summary ---------- */}
          <section className="card card--violet summary">
            <div className="summary-head">
              <div className="summary-title">Today's Progress</div>
              <div className="summary-sub">{completedToday} of {habits.length} completed</div>
            </div>
            <div className="summary-rate">{completionRate}%</div>
            <div className="progress"><div className="progress__bar" style={{width:`${completionRate}%`}}/></div>

            <div className="summary-stats">
              {[{label:"Today", value:completedToday, Icon:Sun},{label:"Completion", value:`${completionRate}%`, Icon:CheckCircle2},{label:"Longest", value:`${longestStreak}d`, Icon:Trophy}].map(({label,value,Icon})=>(
                <div key={label} className="stat-card"><div className="stat-head"><Icon size={14}/><span>{label}</span></div><div className="stat-value">{value}</div></div>
              ))}
            </div>
          </section>

          <section className="groups">
            {groups.map(([cat,list])=>(
              <div key={cat} className="group">
                <div className="group-chip"><span className="cap">{cat} Habits</span><span className="count">{list.length}/{list.length}</span></div>
                <div className="group-list">
                  {list.map(habit=>{
                    const idx=habits.findIndex(h=>h===habit); 
                    const current = calcStreak(habit);
                    const best = habit.bestStreak||0;
                    const isTodayDone = !!habit.history[todayKey()];
                    return (
                      <div key={habit.name+idx} className="card card--violet habit-card">
                        <div className="habit-top">
                          <div className="habit-left">
                            <input type="checkbox" checked={isTodayDone} onChange={()=>{setDone(idx,todayKey(),!isTodayDone); triggerConfetti();}} className="checkbox"/>
                            <h3 className={`habit-name ${isTodayDone?"is-done":""}`}>{habit.name}</h3>
                            <span className="streak">🔥 {current}</span>
                          </div>
                          <div className="habit-right">
                            <div className="best">Best: {best} days</div>
                            <button className="ghost" title="Delete" onClick={()=>removeHabit(idx)}><Trash2 size={16}/></button>
                          </div>
                        </div>

                        <div className="habit-tags">
                          <span className={`chip ${cat}`}>{cat}</span>
                          <span className="chip">daily</span>
                        </div>

                        <div className="habit-week">
                          {weekDates.map((d,i)=>{
                            const isDone=!!habit.history[d];
                            return (
                              <button key={d} onClick={()=>setDone(idx,d,!isDone)} className={`week-btn ${isDone?"is-done":""}`} title={new Date(d).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}>
                                {"SMTWTFS"[i]}
                              </button>
                            )
                          })}
                          <div className="current">Current: {current} days</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>

          <AnimatePresence>
            {bursts.map(id=>(
              <motion.div key={id} initial={{opacity:0,scale:0.8,y:0,x:Math.random()*50-25}} animate={{opacity:1,scale:1,y:-20}} exit={{opacity:0}} transition={{duration:0.8}} className="sparkle">✨</motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
