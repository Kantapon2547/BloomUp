const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Gratitude Stats
export const getGratitudeStats = async () => {
  try {
    const res = await fetch(`${API}/gratitude`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) throw new Error("Failed to fetch gratitude entries");
    const data = await res.json();
    
    // Calculate stats from entries
    const totalEntries = data.length || 0;
    
    return {
      total_entries: totalEntries,
      longest_streak: 0,
      days_tracked: totalEntries,
    };
  } catch (error) {
    console.error("Error fetching gratitude stats:", error);
    return { total_entries: 0, longest_streak: 0, days_tracked: 0 };
  }
};

// Habit Stats
export const getHabitsStats = async () => {
  try {
    const res = await fetch(`${API}/habits`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) throw new Error("Failed to fetch habits");
    const data = await res.json();
    
    // Calculate stats from habits
    const activeHabits = data.filter(h => h.is_active).length || 0;
    
    // Calculate streak from history
    let bestStreak = 0;
    let currentStreak = 0;
    let totalCompletions = 0;
    
    data.forEach(habit => {
      if (habit.history) {
        const historyLength = Object.keys(habit.history).length;
        totalCompletions += historyLength;
        if (habit.best_streak > bestStreak) {
          bestStreak = habit.best_streak;
        }
      }
    });
    
    return {
      active_habits: activeHabits,
      best_streak: bestStreak,
      current_streak: currentStreak,
      total_completions: totalCompletions,
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

// Profile Stats
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
