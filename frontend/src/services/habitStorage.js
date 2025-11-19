// --- Constants and Configuration ---
const USE_API_DEFAULT = true;
const BASE_URL = import.meta?.env?.VITE_API_URL || "http://localhost:3000";
const AUTH_TOKEN = import.meta?.env?.VITE_API_TOKEN || "";
const LS_KEY = "habit-tracker@hybrid";

// --- API Fetch Utility ---
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

// --- Helper Functions ---
const uid = () =>
  Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3);

export const normalizeHabit = (h) => ({
  id: h.id ?? uid(),
  name: h.name ?? "",
  category: h.category ?? "General",
  icon: h.icon ?? "📚",
  duration: h.duration ?? 30,
  color: h.color ?? "#ede9ff",
  history: h.history ?? {},
  createdAt: h.createdAt ?? new Date().toISOString(),
});

// --- Main Storage Logic (Named Export) ---
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