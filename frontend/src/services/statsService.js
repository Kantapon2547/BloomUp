import { createStorage } from "./habitStorage";
import { getGratitudeStats } from "./gratitudeService";

const storage = createStorage();
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const allDoneKeys = (habit) => {
  const h = habit?.history || {};
  return Object.keys(h).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
};

const longestStreakForHabit = (habit) => {
  const keys = allDoneKeys(habit);
  if (!keys.length) return 0;
  if (keys.length === 1) return 1;

  const toDate = (s) => new Date(s + "T00:00:00Z");
  let best = 1, cur = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = toDate(keys[i - 1]);
    const curr = toDate(keys[i]);
    const delta = (curr - prev) / (1000 * 60 * 60 * 24);

    if (delta === 1) {
      cur += 1;
    } else if (delta > 1) {
      cur = 1;
    }
    best = Math.max(best, cur);
  }
  return best;
};

export const getShareableStats = async () => {
  try {
    const [habits, gratitudeStats] = await Promise.all([
      storage.list(),
      getGratitudeStats()
    ]);

    const gratitudeEntries = gratitudeStats.total_entries || 0;

    if (!habits || habits.length === 0) {
      return {
        activeHabits: 0,
        weeklyAverage: 0,
        longestOverallStreak: 0,
        highestProgressHabit: null,
        habitsCompletedThisWeek: 0,
        newHabitsCount: 0,
        gratitudeEntries,
        daysTracked: 0,
      };
    }

    const activeHabits = habits.length;
    const today = new Date();
    const startOfWeek = (d) => addDays(d, -d.getDay());
    const start = startOfWeek(today);
    const weeklyDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const dailyCompletion = weeklyDays.map((d) => {
      const key = fmt(d);
      const done = habits.filter((h) => h.history?.[key]).length;
      return { done };
    });
    const habitsCompletedThisWeek = dailyCompletion.reduce((sum, day) => sum + day.done, 0);
    const pct = (num, den) => (den === 0 ? 0 : Math.round((num / den) * 100));
    const weeklyAverage = pct(habitsCompletedThisWeek, habits.length * 7);
    const longestOverallStreak = habits.reduce((max, h) => Math.max(max, longestStreakForHabit(h)), 0);
    const topHabitsThisWeek = habits
      .map((h) => ({
        habitName: h.name,
        progressPercentage: pct(
          weeklyDays.filter((d) => h.history?.[fmt(d)]).length,
          weeklyDays.length
        ),
      }))
      .sort((a, b) => b.progressPercentage - a.progressPercentage);
    const highestProgressHabit = topHabitsThisWeek.length > 0 ? topHabitsThisWeek[0] : null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const newHabitsCount = habits.filter((h) => new Date(h.createdAt) >= sevenDaysAgo).length;

    const allTrackedDays = new Set();
    habits.forEach(habit => {
      if (habit.history) {
        Object.keys(habit.history).forEach(date => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            allTrackedDays.add(date);
          }
        });
      }
    });
    const daysTracked = allTrackedDays.size;

    return {
      activeHabits,
      weeklyAverage,
      longestOverallStreak,
      highestProgressHabit,
      habitsCompletedThisWeek,
      newHabitsCount,
      gratitudeEntries, 
      daysTracked,
    };

  } catch (error) {
    console.error("Failed to calculate shareable stats:", error);
    return {
      activeHabits: 0,
      weeklyAverage: 0,
      longestOverallStreak: 0,
      highestProgressHabit: { habitName: "N/A", progressPercentage: 0 },
      habitsCompletedThisWeek: 0,
      newHabitsCount: 0,
      gratitudeEntries: 0,
      daysTracked: 0,
    };
  }
};