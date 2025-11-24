import { authService } from './authService';

// Constants and Configuration
const USE_API_DEFAULT = true;
const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const LS_KEY = "habit-tracker@hybrid";

async function apiFetch(path, options = {}) {
  const token = authService.getToken();
  
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  
  if (res.status === 401) {
    authService.removeToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

const uid = () =>
  Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3);

/**
 * Normalize API habit response to client format
 * Maps backend fields to client-expected fields
 */
export const normalizeHabit = (h) => ({
  habit_id: h.habit_id ?? uid(),
  id: h.habit_id ?? uid(), // Keep both for compatibility
  name: h.habit_name ?? h.name ?? "",
  habit_name: h.habit_name ?? h.name ?? "",
  category: h.category?.category_name ?? h.category ?? "General",
  category_id: h.category_id,
  icon: h.emoji ?? h.icon ?? "📚",
  emoji: h.emoji ?? h.icon ?? "📚",
  duration_minutes: h.duration_minutes ?? h.duration ?? 30,
  duration: h.duration_minutes ?? h.duration ?? 30,
  color: h.category?.color ?? h.color ?? "#ede9ff",
  history: h.history ?? {},
  created_at: h.created_at ?? h.createdAt ?? new Date().toISOString(),
  createdAt: h.created_at ?? h.createdAt ?? new Date().toISOString(),
  best_streak: h.best_streak ?? 0,
  is_active: h.is_active ?? true,
  description: h.description ?? "",
  start_date: h.start_date,
  end_date: h.end_date,
  user_id: h.user_id,
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
      const body = {
        name: payload.name ?? payload.habit_name,
        emoji: payload.emoji ?? payload.icon ?? "📚",
        duration_minutes: payload.duration_minutes ?? payload.duration ?? 30,
        category_id: payload.category_id,
        description: payload.description,
        is_active: payload.is_active ?? true,
      };

      return safeApi(
        () => apiFetch("/habits", { 
          method: "POST", 
          body: JSON.stringify(body) 
        }).then(normalizeHabit),
        () => {
          const normalized = normalizeHabit(payload);
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          list.push(normalized);
          localStorage.setItem(LS_KEY, JSON.stringify(list));
          return normalized;
        }
      );
    },

    async update(id, patch) {
      const body = {
        habit_name: patch.name ?? patch.habit_name,
        emoji: patch.emoji ?? patch.icon,
        duration_minutes: patch.duration_minutes ?? patch.duration,
        category_id: patch.category_id,
        description: patch.description,
        is_active: patch.is_active,
      };

      // Remove undefined fields
      Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

      return safeApi(
        () => apiFetch(`/habits/${id}`, { 
          method: "PUT", 
          body: JSON.stringify(body) 
        }).then(normalizeHabit),
        () => {
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          const idx = list.findIndex((x) => x.id === id || x.habit_id === id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...patch };
            localStorage.setItem(LS_KEY, JSON.stringify(list));
            return normalizeHabit(list[idx]);
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
          const next = list.filter((x) => x.id !== id && x.habit_id !== id);
          localStorage.setItem(LS_KEY, JSON.stringify(next));
          return true;
        }
      );
    },

    async toggleHistory(id, date, done) {
      // The API uses /complete and /complete endpoints
      return safeApi(
        () => {
          if (done) {
            return apiFetch(`/habits/${id}/complete?on=${date}`, {
              method: "POST",
            });
          } else {
            return apiFetch(`/habits/${id}/complete?on=${date}`, {
              method: "DELETE",
            });
          }
        },
        () => {
          const list = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
          const idx = list.findIndex((x) => x.id === id || x.habit_id === id);
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

    async getWeeklyStats(id, targetDate = new Date()) {
      /**
       * Calculate weekly completion stats for a habit
       * Returns completion data for the current week (Sunday-Saturday)
       */
      try {
        const habit = await this.list().then(habits => 
          habits.find(h => h.habit_id === id || h.id === id)
        );

        if (!habit) return null;

        const today = new Date(targetDate);
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        let completedDays = 0;
        const daysInWeek = 7;
        const weekDates = [];

        for (let i = 0; i < daysInWeek; i++) {
          const checkDate = new Date(startOfWeek);
          checkDate.setDate(startOfWeek.getDate() + i);
          const dateStr = checkDate.toISOString().split('T')[0];
          weekDates.push(dateStr);

          if (habit.history[dateStr]) {
            completedDays++;
          }
        }

        const completionRate = Math.round((completedDays / daysInWeek) * 100);

        return {
          habit_id: id,
          habit_name: habit.habit_name,
          emoji: habit.emoji,
          completedDays,
          totalDays: daysInWeek,
          completionRate,
          weekDates,
          weekStart: startOfWeek.toISOString().split('T')[0],
          weekEnd: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      } catch (error) {
        console.error("Error calculating weekly stats:", error);
        return null;
      }
    },
  };
}