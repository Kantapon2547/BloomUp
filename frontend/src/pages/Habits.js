import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Trash2, Trophy, Sun, CheckCircle2, X, Filter, Pencil } from "lucide-react";
import "./style/Habits.css";

// Constants
const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "study", label: "Study" },
  { value: "health", label: "Health" },
  { value: "mind", label: "Mind" },
];

const STATS_CONFIG = [
  { label: "Today", value: "completedToday", Icon: Sun },
  { label: "Completion", value: "completionRate", Icon: CheckCircle2 },
  { label: "Longest", value: "longestStreak", Icon: Trophy },
];

const STORAGE_KEY = "habit-tracker@v3";

// Date helpers
const formatDate = (date) => date.toISOString().slice(0, 10);
const getTodayKey = () => formatDate(new Date());
const getDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
};
const pluralize = (count, singular, plural = `${singular}s`) => 
  `${count} ${count === 1 ? singular : plural}`;

// Dropdown Component
function Dropdown({ label, value, onChange, options, placeholder = "Select", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
        setHoverIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const currentOption = options.find(option => option.value === value);

  const handleKeyDown = (event) => {
    if (!isOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (event.key) {
      case "Escape":
        setIsOpen(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        setHoverIndex(index => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHoverIndex(index => Math.max(index - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        const selectedOption = options[Math.max(0, hoverIndex)];
        if (selectedOption) {
          onChange(selectedOption.value);
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div ref={wrapperRef} className={`dropdown ${className}`} data-open={isOpen}>
      {label && <div className="dropdown-label">{label}</div>}

      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => { setIsOpen(open => !open); setHoverIndex(-1); }}
        onKeyDown={handleKeyDown}
      >
        <span className={`dropdown-value ${!currentOption ? "is-placeholder" : ""}`}>
          {currentOption ? currentOption.label : placeholder}
        </span>
        <svg className="dropdown-caret" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <polyline 
            points="6 9 12 15 18 9" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-popover">
          <ul className="dropdown-list" role="listbox">
            {options.map((option, index) => {
              const isActive = option.value === value;
              const isHovered = index === hoverIndex;
              
              return (
                <li
                  key={option.value}
                  className={`dropdown-item ${isActive ? "is-active" : ""} ${isHovered ? "is-hover" : ""}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setHoverIndex(index)}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                >
                  <span>{option.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Modal Component
function HabitModal({ isOpen, onClose, mode, habit, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");

  React.useEffect(() => {
    if (habit) {
      setName(habit.name);
      setCategory(habit.category || "general");
    } else {
      setName("");
      setCategory("general");
    }
  }, [habit, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), category);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleSave();
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="modal-backdrop" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="modal" 
        initial={{ scale: 0.92, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.92, opacity: 0 }}
      >
        <div className="modal-header">
          <h3>{mode === "add" ? "Add New Habit" : "Edit Habit"}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20}/>
          </button>
        </div>
        
        <div className="modal-body">
          <input 
            className="input"
            placeholder="Habit name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Dropdown
            className="modal-dropdown"
            value={category}
            onChange={setCategory}
            options={CATEGORIES}
            placeholder="Select Category"
          />
        </div>
        
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>
            {mode === "add" ? "Add Habit" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Habit Card Component
function HabitCard({ habit, index, onToggle, onEdit, onDelete, onWeekDayToggle }) {
  const currentStreak = calculateStreak(habit);
  const bestStreak = habit.bestStreak || 0;
  const isTodayDone = !!habit.history[getTodayKey()];
  const category = habit.category || "general";

  const weekDates = useMemo(() => getWeekDates(), []);

  return (
    <div className="card habit-card">
      <div className="habit-main">
        <div className="habit-check-section">
          <input 
            type="checkbox" 
            checked={isTodayDone} 
            onChange={() => onToggle(index, getTodayKey(), !isTodayDone)} 
            className="checkbox"
            id={`habit-${index}`}
          />
          <label 
            htmlFor={`habit-${index}`} 
            className={`habit-name ${isTodayDone ? "is-done" : ""}`}
            title="Double-click to edit"
            onDoubleClick={() => onEdit(index)}
          >
            {habit.name}
          </label>
        </div>

        <div className="habit-meta">
          <div className="habit-tags">
            <span className={`chip ${category}`}>{category}</span>
            <span className="chip chip-daily">daily</span>
          </div>

          <div className="habit-stats">
            <div className="stat-item">
              <span className="stat-label">Current:</span>
              <span className="streak">🔥 {currentStreak}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Best:</span>
              <span className="best-streak">{pluralize(bestStreak, "day")}</span>
            </div>
          </div>

          <div className="habit-actions">
            <button 
              className="btn-edit" 
              title="Edit habit" 
              onClick={() => onEdit(index)}
              aria-label="Edit habit"
            >
              <Pencil size={16}/>
            </button>
            <button 
              className="btn-delete" 
              title="Delete habit" 
              onClick={() => onDelete(index)}
              aria-label="Delete habit"
            >
              <Trash2 size={18}/>
            </button>
          </div>
        </div>
      </div>

      <div className="habit-week">
        <div className="week-days">
          {weekDates.map((date, index) => {
            const isDone = !!habit.history[date];
            const dayLabel = new Date(date).toLocaleDateString(undefined, { weekday: "short" });
            
            return (
              <div 
                key={date} 
                className={`week-day ${isDone ? "is-done" : ""}`} 
                title={new Date(date).toLocaleDateString(undefined, { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric" 
                })}
                onClick={() => onWeekDayToggle(index, date, !isDone)}
              >
                <span className="week-day-letter">{"SMTWTFS"[index]}</span>
                <span className="week-day-label">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper functions
const calculateStreak = (habit) => {
  let streak = 0;
  for (let i = 0; ; i++) {
    if (habit.history[getDaysAgo(i)]) streak++;
    else break;
  }
  return streak;
};

const getWeekDates = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return formatDate(date);
  });
};

const calculateWeekCompletionRate = (habit, weekDates) => {
  const doneCount = weekDates.filter(date => !!habit.history[date]).length;
  return weekDates.length ? Math.round(doneCount / weekDates.length * 100) : 0;
};

// Main Component
export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: "add",
    editingIndex: -1,
  });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rateFilter, setRateFilter] = useState("all");
  const [streakFilter, setStreakFilter] = useState("all");

  // Load and save habits
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHabits(JSON.parse(stored));
      } else {
        // Default habits
        setHabits([
          { 
            name: "drink water", 
            category: "health", 
            history: {}, 
            createdAt: getTodayKey(), 
            bestStreak: 0 
          },
          { 
            name: "study", 
            category: "study", 
            history: {}, 
            createdAt: getTodayKey(), 
            bestStreak: 0 
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to load habits:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  // Calculations
  const weekDates = useMemo(getWeekDates, []);
  
  const completedToday = habits.filter(habit => 
    habit.history[getTodayKey()]
  ).length;
  
  const completionRate = habits.length ? 
    Math.round(completedToday / habits.length * 100) : 0;
  
  const longestStreak = habits.reduce((max, habit) => 
    Math.max(max, calculateStreak(habit)), 0
  );

  // Filter habits
  const filteredHabits = useMemo(() => {
    return habits.filter(habit => {
      const habitCategory = habit.category || "general";
      const weekRate = calculateWeekCompletionRate(habit, weekDates);
      const streak = calculateStreak(habit);

      // Category filter
      if (categoryFilter !== "all" && habitCategory !== categoryFilter) {
        return false;
      }

      // Rate filter
      if (rateFilter !== "all") {
        if (rateFilter === "high" && weekRate < 80) return false;
        if (rateFilter === "medium" && (weekRate < 50 || weekRate >= 80)) return false;
        if (rateFilter === "low" && weekRate >= 50) return false;
      }

      // Streak filter
      if (streakFilter !== "all") {
        if (streakFilter === "sHigh" && streak < 10) return false;
        if (streakFilter === "sMed" && (streak < 5 || streak >= 10)) return false;
        if (streakFilter === "sLow" && streak >= 5) return false;
      }

      return true;
    });
  }, [habits, categoryFilter, rateFilter, streakFilter, weekDates]);

  // Group habits by category
  const groupedHabits = useMemo(() => {
    const groups = new Map();
    filteredHabits.forEach(habit => {
      const category = habit.category || "general";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(habit);
    });
    return Array.from(groups.entries());
  }, [filteredHabits]);

  // Habit actions
  const toggleHabit = (index, date, value) => {
    setHabits(prev => {
      const updated = [...prev];
      const habit = { ...updated[index] };
      const history = { ...habit.history, [date]: value };
      const updatedHabit = { ...habit, history };
      
      const streak = calculateStreak(updatedHabit);
      const bestStreak = Math.max(habit.bestStreak || 0, streak);
      
      updated[index] = { ...updatedHabit, bestStreak };
      return updated;
    });
  };

  const addHabit = (name, category) => {
    const newHabit = {
      name,
      category,
      history: {},
      createdAt: getTodayKey(),
      bestStreak: 0,
    };
    setHabits(prev => [newHabit, ...prev]);
  };

  const editHabit = (index, name, category) => {
    setHabits(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name, category };
      return updated;
    });
  };

  const deleteHabit = async (index) => {
    const habit = habits[index];
    if (!habit) return;

    try {
      // Here you would typically call an API
      // await apiDeleteHabit(habit.id);
      setHabits(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Delete habit failed:", error);
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setModalState({ isOpen: true, mode: "add", editingIndex: -1 });
  };

  const openEditModal = (index) => {
    setModalState({ isOpen: true, mode: "edit", editingIndex: index });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: "add", editingIndex: -1 });
  };

  const handleSaveHabit = (name, category) => {
    if (modalState.mode === "add") {
      addHabit(name, category);
    } else {
      editHabit(modalState.editingIndex, name, category);
    }
  };

  const getEditingHabit = () => {
    return modalState.editingIndex >= 0 ? habits[modalState.editingIndex] : null;
  };

  return (
    <div className="habits-root">
      <div className="habits-container">
        {/* Header */}
        <header className="habits-header">
          <div className="brand">
            <h1 className="brand-title">My Habits</h1>
            <p className="brand-sub">Build consistent routines for academic and personal growth</p>
          </div>
          <button className="btn add-top-btn" onClick={openAddModal}>
            <PlusCircle size={18}/> 
            <span>Add Habit</span>
          </button>
        </header>
        
        {/* Summary Section */}
        <section className="card card--violet summary">
          <div className="summary-head">
            <div>
              <div className="summary-title">Today's Progress</div>
              <div className="summary-sub">
                {completedToday} of {habits.length} {pluralize(habits.length, 'habit')}
              </div>
            </div>
            <div className="summary-rate">{completionRate}%</div>
          </div>
          
          <div className="progress">
            <div 
              className="progress__bar" 
              style={{ width: `${completionRate}%` }}
            />
          </div>

          <div className="summary-stats">
            {STATS_CONFIG.map(({ label, value, Icon }) => (
              <div key={label} className="stat-card">
                <div className="stat-head">
                  <Icon size={14}/>
                  <span>{label}</span>
                </div>
                <div className="stat-value">
                  {label === "Completion" ? `${completionRate}%` : 
                   label === "Today" ? completedToday : 
                   `${longestStreak}d`}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Habits Groups */}
        <section className="groups">
          {groupedHabits.map(([category, habitList]) => (
            <div key={category} className="group">
              <div className="group-header">
                <h2 className="group-title">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h2>
                <span className="group-count">
                  {pluralize(habitList.length, 'habit')}
                </span>
              </div>
              
              <div className="group-list">
                {habitList.map((habit, index) => {
                  const globalIndex = habits.findIndex(h => h === habit);
                  
                  return (
                    <HabitCard
                      key={`${habit.name}-${globalIndex}`}
                      habit={habit}
                      index={globalIndex}
                      onToggle={toggleHabit}
                      onEdit={openEditModal}
                      onDelete={deleteHabit}
                      onWeekDayToggle={toggleHabit}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Modal */}
        <HabitModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          mode={modalState.mode}
          habit={getEditingHabit()}
          onSave={handleSaveHabit}
        />
      </div>
    </div>
  );
}