import React, { useEffect, useMemo, useRef, useState } from "react";
import {Plus, Pencil, Trash2, ChevronDown, Filter, Trophy, CheckCircle2, Sun, DownloadCloud} 
  from "lucide-react";
import "./style/Habits.css";
import EmojiPicker from "emoji-picker-react";


const USE_API_DEFAULT = true;
const BASE_URL = import.meta?.env?.VITE_API_URL || "http://localhost:3000";
const AUTH_TOKEN = import.meta?.env?.VITE_API_TOKEN || "";
const LS_KEY = "habit-tracker@hybrid";
const DURATIONS = ["15 mins", "30 mins", "45 mins", "1 hour", "1.5 hours", "2 hours", "3 hours"];
const CATS_LS = "habit-tracker@categories";
// const DEFAULT_CATEGORIES = ["General", "Study", "Health", "Mind"];
const PASTELS = [
  "#ff99c8",
  "#ffac81",
  "#fcf6bd",
  "#d0f4de",
  "#a9def9",
  "#e4c1f9",
];

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

const uid = () =>
  Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3);

const normalizeHabit = (h) => ({
  id: h.id ?? uid(),
  name: h.name ?? "",
  category: h.category ?? "General",
  icon: h.icon ?? "📚",
  duration: h.duration ?? 30,
  color: h.color ?? "#ede9ff",
  history: h.history ?? {},
});

export function createStorage() {
  let useApi = USE_API_DEFAULT;

  async function safeApi(fn, fallback) {
    if (!useApi) return fallback();
    try {
      return await fn();
    } catch (e) {
      console.warn("[API error] -> fallback to localStorage:", e.message);
      useApi = false;
      return fallback();
    }
  }

  return {
    async list() {
      return safeApi(
        () => apiFetch("/habits").then((rows) => rows.map(normalizeHabit)),
        () => {
          const raw = localStorage.getItem(LS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          return list.map(normalizeHabit);
        }
      );
    },
    async create(payload) {
      const body = normalizeHabit(payload);
      return safeApi(
        () => apiFetch("/habits", { method: "POST", body: JSON.stringify(body) }),
        () => {
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          list.push(body);
          localStorage.setItem(LS_KEY, JSON.stringify(list));
          return body;
        }
      );
    },
    async update(id, patch) {
      return safeApi(
        () => apiFetch(`/habits/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
        () => {
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          const idx = list.findIndex((x) => x.id === id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...patch };
            localStorage.setItem(LS_KEY, JSON.stringify(list));
            return list[idx];
          }
          return null;
        }
      );
    },
    async remove(id) {
      return safeApi(
        () => apiFetch(`/habits/${id}`, { method: "DELETE" }),
        () => {
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          const next = list.filter((x) => x.id !== id);
          localStorage.setItem(LS_KEY, JSON.stringify(next));
          return true;
        }
      );
    },
    async toggleHistory(id, date, done) {
      return safeApi(
        () =>
          apiFetch(`/habits/${id}/history`, {
            method: "PATCH",
            body: JSON.stringify({ date, done }),
          }),
        () => {
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          const idx = list.findIndex((x) => x.id === id);
          if (idx >= 0) {
            const h = list[idx];
            h.history = h.history || {};
            if (done) h.history[date] = true;
            else delete h.history[date];
            list[idx] = h;
            localStorage.setItem(LS_KEY, JSON.stringify(list));
            return h;
          }
          return null;
        }
      );
    },
  };
}

const storage = createStorage();

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const weekOf = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); 
  const diff = (day === 0 ? -6 : 1) - day; 
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  return [...Array(7)].map((_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return formatLocalDate(x); 
  });
};

const todayKey = () => formatLocalDate(new Date());
const thisWeek = () => weekOf(new Date());
const pct = (n) => Math.round(n * 100);
const plural = (n, w) => `${n} ${w}${n > 1 ? "s" : ""}`;


function bestStreak(history = {}) {
  const days = Object.keys(history).sort();
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const d of days) {
    if (!history[d]) continue;
    if (!prev) {
      cur = 1;
    } else {
      const nd = new Date(prev);
      nd.setDate(nd.getDate() + 1);
      const expected = nd.toISOString().slice(0, 10);
      cur = expected === d ? cur + 1 : 1;
    }
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

function weekRate(h) {
  const week = thisWeek();
  const done = week.filter((d) => !!h.history?.[d]).length;
  return pct(done / 7);
}

function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, ref]);
}

function Dropdown({ value, items, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="dd" ref={ref}>
      {label && (
        <div className="dd-label">
          <Filter size={16} style={{ marginRight: 8 }} />
          {label}
        </div>
      )}
      <button
        className="dd-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="dd-pop">
          {items.map((it) => (
            <div
              key={it}
              className={`dd-item ${it === value ? "is-active" : ""}`}
              onClick={() => {
                onChange(it);
                setOpen(false);
              }}
            >
              {it}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySelector({ value, onChange, categories, onCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [showInput, setShowInput] = useState(false);
  const ref = useRef(null);
  
  useClickOutside(ref, () => {
    setIsOpen(false);
    setShowInput(false);
    setDraft("");
  });

  const handleSelect = (cat) => {
    onChange(cat);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    onChange(name);
    setDraft("");
    setShowInput(false);
    setIsOpen(false);
  };

  return (
    <div className="dd category-selector" ref={ref}>
      <button
        className="dd-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{value}</span>
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className="dd-pop">
          {!showInput ? (
            <>
              {categories.map((cat) => (
                <div
                  key={cat}
                  className={`dd-item ${cat === value ? "is-active" : ""}`}
                  onClick={() => handleSelect(cat)}
                >
                  {cat}
                </div>
              ))}
              <div className="dd-divider" />
              <div
                className="dd-item dd-item--add"
                onClick={() => setShowInput(true)}
              >
                <Plus size={16} />
                <span>Add new category</span>
              </div>
            </>
          ) : (
            <div className="dd-add-form">
              <input
                className="input"
                placeholder="e.g., Fitness, Work"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddNew();
                  if (e.key === "Escape") { setShowInput(false); setDraft(""); }
                }}
                autoFocus
              />
              <div className="dd-add-actions">
                <button
                  type="button"
                  className="btn btn-sm cancel"
                  onClick={() => { setShowInput(false); setDraft(""); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-sm confirm"
                  onClick={handleAddNew}
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// function DurationPickerModal({
//   current,
//   onSelect,
//   onClose,
// }) {
//   const OPTIONS = [
//     "15 mins",
//     "30 mins",
//     "45 mins",
//     "1 hour",
//     "1.5 hours",
//     "2 hours",
//     "3 hours",
//   ];

//   return (
//     <div className="sheet-backdrop" onClick={onClose}>
//       <div
//         className="floating-panel"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div className="floating-head">
//           <div className="floating-title">Select Duration</div>
//           <div className="floating-actions">
//             <button className="floating-back" onClick={onClose}>
//               Back
//             </button>
//           </div>
//         </div>

//         <div className="option-grid">
//           {OPTIONS.map((opt) => (
//             <button
//               key={opt}
//               className={
//                 "option-tile" +
//                 (opt === current ? " is-active" : "")
//               }
//               onClick={() => {
//                 onSelect(opt);
//                 onClose();
//               }}
//             >
//               <div className="option-tile-label">{opt}</div>
//             </button>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

function DurationPickerModal({
  current,
  onSelect,
  onClose,
}) {
  // current is minutes (number)
  const initHours = Math.floor(current / 60);
  const initMins = current % 60;

  const [hours, setHours] = useState(initHours);
  const [mins, setMins] = useState(initMins);

  // helper to clamp positive ints
  const safeNum = (val) => {
    const n = parseInt(val, 10);
    return isNaN(n) || n < 0 ? 0 : n;
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="floating-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="floating-head">
          <div className="floating-title">Set Duration</div>
          <div className="floating-actions">
            <button className="floating-back" onClick={onClose}>
              Back
            </button>
          </div>
        </div>

        <div className="duration-form">
          <div className="duration-field">
            <label className="duration-label">Hours</label>
            <input
              className="duration-input"
              type="number"
              min="0"
              value={hours}
              onChange={(e) => setHours(safeNum(e.target.value))}
            />
          </div>

          <div className="duration-field">
            <label className="duration-label">Minutes</label>
            <input
              className="duration-input"
              type="number"
              min="0"
              max="59"
              value={mins}
              onChange={(e) => {
                const v = safeNum(e.target.value);
                setMins(v > 59 ? 59 : v);
              }}
            />
          </div>
        </div>

        <div className="newcat-actions">
          <button
            className="newcat-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="newcat-add-btn"
            onClick={() => {
              const totalMins = hours * 60 + mins;
              // fallback: if hours=0 and mins=0, force at least 1 min
              const finalVal = totalMins === 0 ? 1 : totalMins;
              onSelect(finalVal);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function HabitModal({
  open,
  onClose,
  onSubmit,
  initial,
  categories,
  onCreateCategory,
  onApplyCategoryColor,
  onDeleteCategory,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "General");
  const [emoji, setEmoji] = useState(initial?.icon || "📚"); 
  // const [duration, setDuration] = useState(initial?.duration || "30 mins");
  const [duration, setDuration] = useState(
  typeof initial?.duration === "number" ? initial.duration : 30);
  const [error, setError] = useState("");
  // const PASTELS = [
  //   "#ff99c8", 
  //   "#ffac81", 
  //   "#fcf6bd", 
  //   "#d0f4de", 
  //   "#a9def9", 
  //   "#e4c1f9", 
  // ];

  const [color, setColor] = useState(initial?.color || PASTELS[0]);

  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  
  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setCategory(initial?.category || "General");
      setEmoji(initial?.icon || "📚");
      // setDuration(initial?.duration || "30 mins");
      setDuration(typeof initial?.duration === "number" ? initial.duration : 30);
      setColor(initial?.color || PASTELS[0]);
      setError("");
      setShowEmojiPicker(false);
      setShowCategoryPicker(false);
    }
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-task"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="task-header">
          <button
            className="task-emoji-btn"
            onClick={() => setShowEmojiPicker(true)}
          >
            <span className="task-emoji">{emoji}</span>
          </button>

          <div className="task-emoji-hint">Tap to change icon</div>

          <input
            className={`task-name-input ${error ? "is-invalid" : ""}`}
            placeholder="Enter habit name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
          {error && <div className="field-error">{error}</div>}
          {/* <div className="color-row-main">
            {PASTELS.map((c) => (
              <button
                key={c}
                className={`color-dot-main ${color === c ? "is-selected" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                />
                ))}
              </div> */}
        </div>

        <div className="task-fields">
          <button
            className="task-row-btn"
            onClick={() => setShowCategoryPicker(true)}
            type="button"
          >
            <div className="task-row-left">
              <div className="task-row-label">CATEGORY</div>
              <div className="task-row-value">{category}</div>
            </div>
            <div className="task-row-chevron">›</div>
          </button>

          <button 
            className="task-row-btn"
            onClick={() => setShowDurationPicker(true)}
            type="button"
          >
            <div className="task-row-left">
              <div className="task-row-label">DURATION</div>
              {/* <div className="task-row-value">{duration}</div> */}
              <div className="task-row-value">
                {duration < 60
                  ? `${duration} mins`
                  : duration % 60 === 0
                    ? `${duration / 60} hour${duration === 60 ? "" : "s"}`
                    : `${Math.floor(duration / 60)}h ${duration % 60}m`}
              </div>
            </div>
            <div className="task-row-chevron">›</div>
          </button>
        </div>

        <div className="habit-footer">
          <button className="footer-btn cancel" onClick={onClose}>
            Cancel
          </button>

          <button
            className="footer-btn confirm"
            onClick={() => {
              if (!name.trim()) {
                setError("Please enter a habit name.");
                return;
              }

              onApplyCategoryColor(category, color);

              onSubmit({
                name: name.trim(),
                category,
                icon: emoji,
                duration,
                color,
              });
            }}
          >
            Add Habit
          </button>
        </div>
      </div>

        {showEmojiPicker && (
          <EmojiPickerModal
            onClose={() => setShowEmojiPicker(false)}
            onSelect={(em) => {
              setEmoji(em);
              setShowEmojiPicker(false);
            }}
          />
        )}

        {showCategoryPicker && (
          <CategoryPickerModal
            categories={categories}
            current={category}
            onSelect={(catName) => {
              setCategory(catName);
              setShowCategoryPicker(false);
            }}
            onClose={() => setShowCategoryPicker(false)}
            onAddNewRequest={() => {
              setShowCategoryPicker(false);
              setShowAddCategory(true);  
            }}

            onDeleteCategory={(catNameToDelete) => {
              onDeleteCategory(catNameToDelete);
              if (category === catNameToDelete) {
                setCategory("General");
            }}}
          />
        )}
            
        {showAddCategory && (
          <NewCategoryModal
            onClose={() => setShowAddCategory(false)}
            onAdd={(newName) => {
              onCreateCategory(newName, color); 
              setCategory(newName);
            }}
          />
        )}

        {showDurationPicker && (
          <DurationPickerModal
            current={duration}
            onSelect={(val) => setDuration(val)}
            onClose={() => setShowDurationPicker(false)}
          />
        )}
      </div>
  );
}

function NewCategoryModal({
  onClose,
  onAdd,
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="floating-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="floating-head">
          <div className="floating-title">Select Category</div>
          <button className="floating-back" onClick={onClose}>
            Back
          </button>
        </div>

        <input
          className="newcat-input"
          placeholder="Category name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />

        <div className="newcat-actions">
          <button
            className="newcat-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="newcat-add-btn"
            onClick={() => {
              const name = draft.trim();
              if (!name) return;
              onAdd(name);
              onClose();
            }}
          >
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}


function EmojiPickerModal({ onClose, onSelect }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel emoji-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <div className="sheet-title">Choose Emoji</div>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="emoji-picker-wrap">
          <EmojiPicker
            theme="light"
            searchDisabled={false}
            skinTonesDisabled={false}
            onEmojiClick={(emojiData /* {emoji:'💧', ...} */) => {
              onSelect(emojiData.emoji);
            }}
            suggestedEmojisMode="recent"
            lazyLoadEmojis={true}
            previewConfig={{ showPreview: false }}
            width="100%"
            height={320}
          />
        </div>
      </div>
    </div>
  );
}

function CategoryPickerModal({
  categories,
  current,
  onSelect,
  onClose,
  onAddNewRequest,
  onDeleteCategory,
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="floating-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="floating-head">
          <div className="floating-title">Select Category</div>

          <div className="floating-actions">
            <button
              className="floating-edit-btn"
              onClick={() => setIsEditing((prev) => !prev)}
            >
              {isEditing ? "Done" : "Edit"}
            </button>

            <button
              className="floating-back"
              onClick={onClose}
            >
              Back
            </button>
          </div>
        </div>

        <div className="option-grid">
          {categories.map((cat) => {
            const selected = cat.name === current;
            const isProtected = cat.name === "General";

            return (
              <div
                key={cat.name}
                className={
                  "option-tile" +
                  (selected ? " is-active" : "") +
                  (isEditing ? " is-editing" : "")
                }
                onClick={() => {
                  if (isEditing) return;
                  onSelect(cat.name);
                  onClose();
                }}
              >
                <div className="option-tile-label">{cat.name}</div>
                {isEditing && !isProtected && (
                  <button
                    className="option-tile-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory(cat.name);
                    }}
                    title="Delete category"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            className="option-tile add-tile"
            onClick={onAddNewRequest}
          >
            <div className="add-tile-plus">＋</div>
            <div className="option-tile-label">Add Category</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("All Categories");
  const [rateFilter, setRateFilter] = useState("All Rates");
  const [streakFilter, setStreakFilter] = useState("All Streaks");
  const [durationFilter, setDurationFilter] = useState("All Durations");
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const DEFAULT_CATEGORIES = [
  { name: "General", color: "#ede9ff" },
  { name: "Study", color: "#fff4cc" },
  { name: "Health", color: "#e9fcef" },
  { name: "Mind", color: "#fbefff" },
];

const [categories, setCategories] = useState(() => {
  try {
    const raw = JSON.parse(localStorage.getItem(CATS_LS));
    if (Array.isArray(raw)) {
      if (typeof raw[0] === "string") {
        return raw.map((n) => ({ name: n, color: "#ede9ff" }));
      }
      return raw;
    }
    return DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
});

  const addCategoryGlobal = (name, color) => {
    if (!categories.some((c) => c.name === name)) {
      const next = [...categories, { name, color }];
      setCategories(next);
      localStorage.setItem(CATS_LS, JSON.stringify(next));
    }
  };

  const applyCategoryColor = (catName, pastel) => {
    setCategories(prev => {
      const exists = prev.find(c => c.name === catName);

      if (!exists) {
        const next = [...prev, { name: catName, color: pastel }];
        localStorage.setItem(CATS_LS, JSON.stringify(next));
        return next;
      }

      const next = prev.map(c =>
        c.name === catName ? { ...c, color: pastel } : c
      );
      localStorage.setItem(CATS_LS, JSON.stringify(next));
      return next;
    });
  };

  const deleteCategoryGlobal = (catName) => {
    setCategories(prev => {
      const next = prev.filter(c => c.name !== catName);
      localStorage.setItem(CATS_LS, JSON.stringify(next));
      return next;
    });

    setHabits(prev =>
      prev.map(h =>
        h.category === catName
          ? { ...h, category: "General" }
          : h
      )
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await storage.list();
      if (!mounted) return;
      setHabits(data);
      setLoading(false);
    })();
    return () => (mounted = false);
  }, []);

  const today = todayKey();
  const week = thisWeek();

  const totals = useMemo(() => {
    const total = habits.length || 0;
    const doneToday = habits.filter((h) => h.history?.[today]).length;
    
    const todayPct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

    let avgCompletion = 0;
    if (total > 0) {
      const totalRate = habits.reduce((sum, h) => sum + weekRate(h), 0);
      avgCompletion = Math.round(totalRate / total);
    }
    
    const best = Math.max(...habits.map((h) => bestStreak(h.history || {})), 0);
    return { total, doneToday,todayPct, completion: avgCompletion, best };
  }, [habits, today]);

  const filtered = useMemo(() => {
    return habits.filter((h) => {
      if (catFilter !== "All Categories" && h.category !== catFilter) {
        return false;
      }
      if (rateFilter !== "All Rates") {
        const r = weekRate(h);
        if (rateFilter === "0–25%" && !(r <= 25)) return false;
        if (rateFilter === "26–50%" && !(r > 25 && r <= 50)) return false;
        if (rateFilter === "51–75%" && !(r > 50 && r <= 75)) return false;
        if (rateFilter === "76–100%" && !(r > 75)) return false;
      }
      if (streakFilter !== "All Streaks") {
        const s = bestStreak(h.history);
        if (streakFilter === "0–3 days" && !(s <= 3)) return false;
        if (streakFilter === "4–7 days" && !(s >= 4 && s <= 7)) return false;
        if (streakFilter === "8+ days" && !(s >= 8)) return false;
      }
      if (durationFilter !== "All Durations" && h.duration !== durationFilter) {
        return false;
      }
      return true;
    });
  }, [habits, catFilter, rateFilter, streakFilter, durationFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((h) => {
      const key = h.category || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const addHabit = async (payload) => {
    const created = await storage.create(normalizeHabit(payload));
    setHabits((x) => [...x, created]);
    setOpenModal(false);
  };

  const editHabit = async (id, patch) => {
    await storage.update(id, patch);
    setHabits((x) => x.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    setEditing(null);
  };

  const removeHabit = async (id) => {
    await storage.remove(id);
    setHabits((x) => x.filter((h) => h.id !== id));
  };


  const toggle = async (id, date, newDone) => {
    await storage.toggleHistory(id, date, newDone);
    setHabits((list) =>
      list.map((h) =>{
        if (h.id !== id) return h;
        const nextHistory = { ...(h.history || {}) };

        if (newDone) {
          nextHistory[date] = true;
        } else {
          delete nextHistory[date];
        }

        return {
          ...h,
          history: nextHistory,
        };
      })
    );
  };

  return (
    <div className="habits-container">
      <div className="head-actions">
        <button
          type="button"
          className="fab-add"
          onClick={() => setOpenModal(true)}>
          <Plus size={22} />
        </button>
      </div>
  
      <section className="summary-section">
        <div className="summary-title">Today's Progress</div>
        <div className="progress-wrap" style={{ marginBottom: 16 }}>
          <span className="progress__pct">{totals.todayPct}%</span>
          <div className="progress">
            <div
              className="progress__bar"
              style={{ width: `${totals.todayPct}%` }}
            />
          </div>
        </div>
        <div className="summary-stats grid-3">
          <div className="stat-card stack">
            <div className="stat-title">
              <Sun size={18} style={{ marginRight: 8 }} />
              TODAY
            </div>
            <div className="stat-big">{totals.doneToday}</div>
            <div className="stat-sub">completed</div>
          </div>
          <div className="stat-card stack">
            <div className="stat-title">
              <CheckCircle2 size={18} style={{ marginRight: 8 }} />
              COMPLETION
            </div>
            <div className="stat-big">{totals.completion}%</div>
            <div className="stat-sub">avg this week</div>
          </div>
          <div className="stat-card stack">
            <div className="stat-title">
              <Trophy size={18} style={{ marginRight: 8 }} />
              BEST STREAK
            </div>
            <div className="stat-big">{plural(totals.best, "day")}</div>
            <div className="stat-sub">longest running</div>
          </div>
        </div>
      </section>

      <section className="card filters-row">
        <div className="filters-icon">
          <Filter size={18} />
          Filters
        </div>
        <div className="filter-dropdowns">
          <Dropdown
            value={catFilter}
            items={["All Categories", ...categories.map(c => c.name)]}
            onChange={setCatFilter}
          />
          <Dropdown
            value={rateFilter}
            items={["All Rates", "0–25%", "26–50%", "51–75%", "76–100%"]}
            onChange={setRateFilter}
          />
          <Dropdown
            value={streakFilter}
            items={["All Streaks", "0–3 days", "4–7 days", "8+ days"]}
            onChange={setStreakFilter}
          />
          <Dropdown
            value={durationFilter}
            items={[
              "All Durations",
              "1–30 mins",
              "30 mins–1 hr",
              "1–2 hrs",
              "2+ hrs",
            ]}
            onChange={setDurationFilter}
          />

          {/* <Dropdown
            value={durationFilter}
            items={["All Durations", ...DURATIONS]}
            onChange={setDurationFilter}
          /> */}
        </div>
      </section>

      {loading ? (
        <p>Loading…</p>
      ) : grouped.length === 0 ? (
        <p>No habits match your filters.</p>
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} className="group-section">
            {list.map((h) => {
              const rate = weekRate(h);
              const streak = bestStreak(h.history || {});
              const catData = categories.find(c => c.name === h.category);
              const bg = catData?.color || "#eef1ff";
              
              return (
                <div key={h.id} className="card habit-card habit-card--row">
                  <div className="hl-left">
                    <input
                      className="checkbox"
                      type="checkbox"
                      checked={!!h.history?.[today]}
                      onChange={(e) => toggle(h.id, today, e.target.checked)}
                    />
                    <div className="hl-avatar">
                      <span className="hl-emoji">{h.icon || "📚"}</span>
                    </div>
                    <div className="hl-title">
                      <div className={`habit-name ${h.history?.[today] ? "is-done" : ""}`} >
                        {h.name}
                      </div>
                      <div className="habit-tags">
                        <span className="chip" 
                              style={{ 
                                background: bg, 
                                borderColor: bg, 
                                color: "#1a1f35",}}
                              >{h.category}
                        </span>
                        <span className="chip chip-daily">{h.duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hl-middle">
                    <div className="week-chips">
                      {week.map((d, i) => {
                        const done = !!h.history?.[d];
                        const small = "SSMTWTF"[i];
                        const big = new Date(d).toLocaleDateString(undefined, {
                          weekday: "short",
                        });
                        return (
                          <div
                            key={d}
                            className={`week-chip ${done ? "is-done" : ""}`}
                            title={new Date(d).toLocaleDateString(undefined, {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                            style={{ cursor: 'default' }}
                          >
                            <span className="wk-big">{new Date(d).getDate()}</span>
                            <span className="wk-small">{new Date(d).toLocaleDateString(undefined, { weekday: "short" })}</span>
                            
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="hl-right">
                    <div className="hl-stats">
                      <span className="hl-fire">🔥</span>
                      <div className="hl-streak">
                        <div className="hl-days">{plural(streak, "day")}</div>
                        <div className="hl-percent">{rate}% this week</div>
                      </div>
                    </div>
                    <div className="hl-actions">
                      <button
                        className="icon-btn soft"
                        onClick={() => setEditing(h)}
                        aria-label="Edit habit"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        className="icon-btn soft"
                        onClick={() => removeHabit(h.id)}
                        aria-label="Delete habit"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ))
      )}

      <HabitModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={addHabit}
        categories={categories} 
        onCreateCategory={addCategoryGlobal}
        onApplyCategoryColor={applyCategoryColor}
        onDeleteCategory={deleteCategoryGlobal}
      />
      <HabitModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing || undefined}
        onSubmit={(payload) => editHabit(editing.id, payload)}
        categories={categories}
        onCreateCategory={addCategoryGlobal}
        onApplyCategoryColor={applyCategoryColor}
        onDeleteCategory={deleteCategoryGlobal}
      />
    </div>
  );
}