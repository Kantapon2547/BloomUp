import React, { useEffect, useMemo, useRef, useState } from "react";
import {Plus, Pencil, Trash2, ChevronDown, Filter, Trophy, CheckCircle2, Sun,} 
  from "lucide-react";
import "./style/Habits.css";

const USE_API_DEFAULT = true;
const BASE_URL = import.meta?.env?.VITE_API_URL || "http://localhost:3000";
const AUTH_TOKEN = import.meta?.env?.VITE_API_TOKEN || "";
const LS_KEY = "habit-tracker@hybrid";
const CATEGORIES = ["General", "Study", "Health", "Mindfulness"];

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
  history: h.history ?? {},
});

function createStorage() {
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

const weekOf = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  start.setHours(0, 0, 0, 0);
  return [...Array(7)].map((_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x.toISOString().slice(0, 10);
  });
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const thisWeek = () => weekOf(new Date());
const pct = (n) => Math.round(n * 100);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

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

function HabitModal({ open, onClose, onSubmit, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "General");
  const [icon, setIcon] = useState(initial?.icon || "📚");

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setCategory(initial?.category || "General");
      setIcon(initial?.icon || "📚");
    }
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <h3>Habit Name</h3>
          <input
            className="input"
            placeholder="e.g., Study for 2 hours"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <h3>Category</h3>
          <Dropdown
            value={category}
            items={CATEGORIES}
            onChange={setCategory}
          />
          <h3>Choose Icon</h3>
          <div className="icon-grid pretty">
            {["📚", "✏️", "📖", "🎓", "💻", "💪", "🧠", "🧘", "🥗", "🚰", "💖", "🛏️"].map(
              (i) => (
                <div
                  key={i}
                  className={`icon-tile ${icon === i ? "active" : ""}`}
                  onClick={() => setIcon(i)}
                >
                  <span className="icon-emoji">{i}</span>
                </div>
              )
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn confirm"
            onClick={() => {
              if (!name.trim()) return;
              onSubmit({ name: name.trim(), category, icon });
            }}
          >
            {initial ? "Save Changes" : "Add Habit"}
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
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

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
    const completion = total === 0 ? 0 : Math.round((doneToday / total) * 100);
    const best = Math.max(...habits.map((h) => bestStreak(h.history || {})), 0);
    return { total, doneToday, completion, best };
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
      return true;
    });
  }, [habits, catFilter, rateFilter, streakFilter]);

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
    if (!window.confirm("Delete this habit?")) return;
    await storage.remove(id);
    setHabits((x) => x.filter((h) => h.id !== id));
  };

  const toggle = async (id, date, newDone) => {
    await storage.toggleHistory(id, date, newDone);
    setHabits((list) =>
      list.map((h) =>
        h.id !== id
          ? h
          : {
              ...h,
              history: {
                ...(h.history || {}),
                ...(newDone ? { [date]: true } : (() => { delete h.history[date]; return h.history; })()),
              },
            }
      )
    );
  };

  return (
    <div className="habits-container">
      <div className="top-row">
        <h1 className="brand-title">My Habits</h1>
        <button className="add-top-btn" onClick={() => setOpenModal(true)}>
          <Plus size={18} style={{ marginRight: 8 }} /> Add Habit
        </button>
      </div>
      <p className="brand-sub">
        Build consistent routines for academic and personal growth
      </p>

      <section className="summary-section">
        <div className="summary-title">Today's Progress</div>
        <div className="progress-wrap" style={{ marginBottom: 16 }}>
          <span className="progress__pct">{totals.completion}%</span>
          <div className="progress">
            <div
              className="progress__bar"
              style={{ width: `${totals.completion}%` }}
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
            <div className="stat-sub">completion rate</div>
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
            items={["All Categories", ...CATEGORIES]}
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
        </div>
      </section>

      {loading ? (
        <p>Loading…</p>
      ) : grouped.length === 0 ? (
        <p>No habits match your filters.</p>
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} className="group-section">
            <div className="group-head">
              <div className="group-title">{cat}</div>
              <div className="group-count">
                {list.length} {list.length === 1 ? "habit" : "habits"}
              </div>
            </div>
            {list.map((h) => {
              const rate = weekRate(h);
              const streak = bestStreak(h.history || {});
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
                      <div className={`habit-name ${h.history?.[today] ? "is-done" : ""}`}>
                        {h.name}
                      </div>
                      <div className="habit-tags">
                        <span className={`chip ${h.category.toLowerCase()}`}>{h.category}</span>
                        <span className="chip chip-daily">daily</span>
                      </div>
                    </div>
                  </div>
                  <div className="hl-middle">
                    <div className="week-chips">
                      {week.map((d, i) => {
                        const done = !!h.history?.[d];
                        const big = "SSMTWTF"[i];
                        const small = new Date(d).toLocaleDateString(undefined, {
                          weekday: "short",
                        });
                        return (
                          <button
                            key={d}
                            type="button"
                            className={`week-chip ${done ? "is-done" : ""}`}
                            onClick={() => toggle(h.id, d, !done)}
                            title={new Date(d).toLocaleDateString(undefined, {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          >
                            <span className="wk-big">{big}</span>
                            <span className="wk-small">{small}</span>
                          </button>
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
      />
      <HabitModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing || undefined}
        onSubmit={(payload) => editHabit(editing.id, payload)}
      />
    </div>
  );
}