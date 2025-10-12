// src/services/statsService.js

// --- Get Gratitude Stats ---
export const getGratitudeStats = async () => {
    try {
      const res = await fetch("/api/gratitude/stats");
      if (!res.ok) throw new Error("Failed to fetch gratitude stats");
      const data = await res.json();
      return data || {
        total_entries: 0,
        longest_streak: 0,
        days_tracked: 0,
      };
    } catch (error) {
      console.error("Error fetching gratitude stats:", error);
      return { total_entries: 0, longest_streak: 0, days_tracked: 0 };
    }
  };
  
  // --- Get Habit Stats ---
  export const getHabitsStats = async () => {
    try {
      const res = await fetch("/api/habits/stats");
      if (!res.ok) throw new Error("Failed to fetch habits stats");
      const data = await res.json();
      return data || {
        active_habits: 0,
        best_streak: 0,
        current_streak: 0,
        total_completions: 0,
      };
    } catch (error) {
      console.error("Error fetching habits stats:", error);
      return {
        active_habits: 0,
        best_streak: 0,
        current_streak: 0,
        total_completions: 0,
      };
    }
  };
  
  // --- Combined Profile Stats ---
  export const getProfileStats = async () => {
    try {
      const [gratitudeStats, habitsStats] = await Promise.all([
        getGratitudeStats(),
        getHabitsStats(),
      ]);
  
      return {
        activeHabits: habitsStats.active_habits || 0,
        longestStreak: habitsStats.best_streak || 0,
        currentStreak: habitsStats.current_streak || 0,
        totalCompletions: habitsStats.total_completions || 0,
        gratitudeEntries: gratitudeStats.total_entries || 0,
        daysTracked: gratitudeStats.days_tracked || 0,
      };
    } catch (error) {
      console.error("Error fetching profile stats:", error);
      return {
        activeHabits: 0,
        longestStreak: 0,
        currentStreak: 0,
        totalCompletions: 0,
        gratitudeEntries: 0,
        daysTracked: 0,
      };
    }
  };
  