import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Trash2, Trophy, Sun, CheckCircle2, X, Filter, Pencil } from "lucide-react";
import "./style/Habits.css";

/* ---------- date helpers ---------- */
const fmt = (d) => d.toISOString().slice(0, 10);
const todayKey = () => fmt(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const plural = (n, s, p = s + "s") => `${n} ${n === 1 ? s : p}`;

/* ---------- dropdown ---------- */
function Dropdown({ label, value, onChange, options, placeholder="Select", className="" }) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) { 
        setOpen(false); 
        setHoverIdx(-1); 
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find(o => o.value === value);

  const onKeyDown = (e) => {
    if (!open && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHoverIdx(i => Math.min(i + 1, options.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHoverIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = options[Math.max(0, hoverIdx)];
      if (pick) { onChange(pick.value); setOpen(false); }
    }
  };

  return (
    <div ref={wrapRef} className={`dd ${className}`} data-open={open ? "true" : "false"}>
      {label && <div className="dd-label">{label}</div>}

      <button
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
            {options.map((opt, i) => {
              const active = opt.value === value;
              const hover  = i === hoverIdx;
              return (
                <li
                  key={opt.value}
                  className={`dd-item ${active ? "is-active":""} ${hover ? "is-hover":""}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={()=>setHoverIdx(i)}
                  onClick={()=>{ onChange(opt.value); setOpen(false); }}
                >
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

/* ---------- main ---------- */
export default function Habits() {
  const [habits, setHabits] = useState([]);

  // modal reuse for add/edit
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); 
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newHabit, setNewHabit] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  // filters
  const [catFilter, setCatFilter] = useState("all");
  const [rateFilter, setRateFilter] = useState("all");
  const [streakFilter, setStreakFilter] = useState("all");

  /* storage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("habit-tracker@v3");
      if (raw) setHabits(JSON.parse(raw));
      else setHabits([
        { name: "Drink Water",  category: "health", history: {}, createdAt: todayKey(), bestStreak: 0 },
        { name: "Study Session", category: "study",  history: {}, createdAt: todayKey(), bestStreak: 0 },
      ]);
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("habit-tracker@v3", JSON.stringify(habits)); }, [habits]);

  /* week dates */
  const weekDates = useMemo(() => {
    const now = new Date(); 
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, i) => { 
      const d = new Date(start); 
      d.setDate(start.getDate() + i); 
      return fmt(d); 
    });
  }, []);

  /* streak helpers */
  const calcStreak = (h) => { 
    let s = 0; 
    for (let i=0;;i++) { if (h.history[daysAgo(i)]) s++; else break; } 
    return s; 
  };

  const setDone = (idx, key, value) => {
    setHabits((prev) => {
      const copy = [...prev]; 
      const h = { ...copy[idx] };
      const nextHistory = { ...h.history, [key]: value };
      copy[idx] = { 
        ...h, 
        history: nextHistory, 
        bestStreak: Math.max(h.bestStreak || 0, calcStreak({...h, history: nextHistory}))
      };
      return copy;
    });
  };

  /* add / edit / remove */
  const openAdd = () => {
    setModalMode("add");
    setEditingIndex(-1);
    setNewHabit("");
    setNewCategory("general");
    setShowModal(true);
  };

  const openEdit = (index) => {
    const h = habits[index];
    if (!h) return;
    setModalMode("edit");
    setEditingIndex(index);
    setNewHabit(h.name);
    setNewCategory(h.category || "general");
    setShowModal(true);
  };

  const saveHabit = () => {
    if (!newHabit.trim()) return;
    if (modalMode === "add") {
      setHabits((h) => [
        { name: newHabit.trim(), category: newCategory, history:{}, createdAt: todayKey(), bestStreak:0 }, 
        ...h
      ]);
    } else {
      setHabits((prev) => {
        const copy = [...prev];
        copy[editingIndex] = { ...copy[editingIndex], name: newHabit.trim(), category: newCategory };
        return copy;
      });
    }
    setShowModal(false);
  };

  const removeHabit = (index) => setHabits((h) => h.filter((_, i) => i !== index));

  /* filters */
  const weekCompletionRate = (h) => { 
    const done = weekDates.filter(d => !!h.history[d]).length; 
    return weekDates.length ? Math.round(done / weekDates.length * 100) : 0; 
  };

  const filtered = habits
    .filter(h => catFilter==="all" ? true : (h.category||"general")===catFilter)
    .filter(h => { 
      if(rateFilter==="all") return true; 
      const r = weekCompletionRate(h); 
      if(rateFilter==="high") return r>=80; 
      if(rateFilter==="medium") return r>=50 && r<80; 
      if(rateFilter==="low") return r<50; 
      return true; 
    })
    .filter(h => { 
      if(streakFilter==="all") return true; 
      const s = calcStreak(h); 
      if(streakFilter==="sHigh") return s>=10; 
      if(streakFilter==="sMed") return s>=5 && s<10; 
      if(streakFilter==="sLow") return s<5; 
      return true; 
    });

  /* summary */
  const completedToday = habits.filter(h => h.history[todayKey()]).length;
  const completionRate = habits.length ? Math.round(completedToday / habits.length * 100) : 0;
  const longestStreak = habits.reduce((m,h)=>Math.max(m,calcStreak(h)),0);

  /* groups */
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach(h=>{ 
      const key=h.category||"general"; 
      if(!map.has(key)) map.set(key,[]); 
      map.get(key).push(h); 
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="habits-root">
      <div className="habits-container">
        {/* Header */}
        <header className="habits-header">
          <div className="brand">
            <h1 className="brand-title">My Habits</h1>
            <p className="brand-sub">Build consistent routines for academic and personal growth</p>
          </div>
          <button className="btn add-top-btn" onClick={openAdd}>
            <PlusCircle size={18}/> <span>Add Habit</span>
          </button>
        </header>
        
        {/* Summary */}
        <section className="card card--violet summary">
          <div className="summary-head">
            <div>
              <div className="summary-title">Today's Progress</div>
              <div className="summary-sub">{completedToday} of {habits.length} {plural(habits.length,'habit')}</div>
            </div>
            <div className="summary-rate">{completionRate}%</div>
          </div>
          <div className="progress"><div className="progress__bar" style={{width:`${completionRate}%`}}/></div>

          <div className="summary-stats">
            {[
              {label:"Today", value:completedToday, Icon:Sun},
              {label:"Completion", value:`${completionRate}%`, Icon:CheckCircle2},
              {label:"Best Streak", value:plural(longestStreak,"day"), Icon:Trophy}
            ].map(({label,value,Icon})=>(
              <div key={label} className="stat-card">
                <div className="stat-head"><Icon size={16}/><span>{label}</span></div>
                <div className="stat-value">{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="filterbar card">
          <div className="filter-section">
            <div className="filter-label">
              <Filter size={18}/>
              <span>Filters</span>
            </div>
            <div className="filter-dropdowns">
              <Dropdown
                value={catFilter}
                onChange={setCatFilter}
                options={[
                  { value: "all", label: "All Categories" },
                  { value: "general", label: "General" },
                  { value: "study", label: "Study" },
                  { value: "health", label: "Health" },
                  { value: "mind", label: "Mind" },
                ]}
                placeholder="All Categories"
              />
              <Dropdown
                value={rateFilter}
                onChange={setRateFilter}
                options={[
                  { value: "all", label: "All Rates" },
                  { value: "high", label: "High (80%+)" },
                  { value: "medium", label: "Medium (50–79%)" },
                  { value: "low", label: "Low (<50%)" },
                ]}
                placeholder="All Rates"
              />
              <Dropdown
                value={streakFilter}
                onChange={setStreakFilter}
                options={[
                  { value: "all", label: "All Streaks" },
                  { value: "sHigh", label: "High (10+ days)" },
                  { value: "sMed", label: "Medium (5–9 days)" },
                  { value: "sLow", label: "Low (<5 days)" },
                ]}
                placeholder="All Streaks"
              />
            </div>
          </div>
        </section>

        {/* GROUPS + HABITS */}
        <section className="groups">
          {groups.map(([cat,list])=>(
            <div key={cat} className="group">
              <div className="group-header">
                <h2 className="group-title">{cat.charAt(0).toUpperCase()+cat.slice(1)}</h2>
                <span className="group-count">{plural(list.length,'habit')}</span>
              </div>
              
              <div className="group-list">
                {list.map(habit=>{
                  const idx=habits.findIndex(h=>h===habit); 
                  const current = calcStreak(habit);
                  const best = habit.bestStreak||0;
                  const isTodayDone = !!habit.history[todayKey()];
                  
                  return (
                    <div key={habit.name+idx} className="card habit-card">
                      <div className="habit-main">
                        <div className="habit-check-section">
                          <input 
                            type="checkbox" 
                            checked={isTodayDone} 
                            onChange={()=>setDone(idx,todayKey(),!isTodayDone)} 
                            className="checkbox"
                            id={`habit-${idx}`}
                          />
                          <label 
                            htmlFor={`habit-${idx}`} 
                            className={`habit-name ${isTodayDone?"is-done":""}`}
                            title="Double-click to edit"
                            onDoubleClick={()=>openEdit(idx)}
                          >
                            {habit.name}
                          </label>
                        </div>

                        <div className="habit-meta">
                          <div className="habit-tags">
                            <span className={`chip ${cat}`}>{cat}</span>
                            <span className="chip chip-daily">daily</span>
                          </div>

                          <div className="habit-stats">
                            <div className="stat-item">
                              <span className="stat-label">Current:</span>
                              <span className="streak">🔥 {current}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Best:</span>
                              <span className="best-streak">{plural(best,"day")}</span>
                            </div>
                          </div>

                          {/* Actions to the far right: EDIT then DELETE */}
                          <div className="habit-actions">
                            <button 
                              className="btn-edit" 
                              title="Edit habit" 
                              onClick={()=>openEdit(idx)}
                              aria-label="Edit habit"
                            >
                              <Pencil size={16}/>
                            </button>
                            <button 
                              className="btn-delete" 
                              title="Delete habit" 
                              onClick={()=>removeHabit(idx)}
                              aria-label="Delete habit"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Week row without the label */}
                      <div className="habit-week">
                        <div className="week-days">
                          {weekDates.map((d,i)=>{
                            const isDone=!!habit.history[d];
                            const dayLabel = new Date(d).toLocaleDateString(undefined,{weekday:"short"});
                            return (
                              <div 
                                key={d} 
                                className={`week-day ${isDone?"is-done":""}`} 
                                title={new Date(d).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}
                              >
                                <span className="week-day-letter">{"SMTWTFS"[i]}</span>
                                <span className="week-day-label">{dayLabel}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Reused Modal (Add/Edit) */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <motion.div className="modal" initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}>
                <div className="modal-header">
                  <h3>{modalMode === "add" ? "Add New Habit" : "Edit Habit"}</h3>
                  <button className="modal-close" onClick={()=>setShowModal(false)} aria-label="Close"><X size={20}/></button>
                </div>
                <div className="modal-body">
                  <input 
                    className="input"
                    placeholder="Habit name"
                    value={newHabit}
                    onChange={(e)=>setNewHabit(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==="Enter") saveHabit(); }}
                    autoFocus
                  />
                  <Dropdown
                    className="add-dd"
                    value={newCategory}
                    onChange={setNewCategory}
                    options={[
                      { value: "general", label: "General" },
                      { value: "study",   label: "Study" },
                      { value: "health",  label: "Health" },
                      { value: "mind",    label: "Mind" },
                    ]}
                    placeholder="Select Category"
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                  <button className="btn" onClick={saveHabit}>{modalMode === "add" ? "Add Habit" : "Save Changes"}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}