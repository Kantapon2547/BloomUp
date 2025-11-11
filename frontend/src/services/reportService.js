import { createStorage } from "./habitStorage";

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

  const toDate = (s) => new Date(s + "T00:00:00Z"); // Use UTC for consistency
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
    const habits = await storage.list();
    if (!habits || habits.length === 0) {
      return {
        weeklyAverage: 0,
        longestOverallStreak: 0,
        highestProgressHabit: null,
        habitsCompletedThisWeek: 0,
        newHabitsCount: 0, // ค่าเริ่มต้น
      };
    }

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

    const weeklyAverage = pct(
        habitsCompletedThisWeek,
        habits.length * 7
    );

    // ✅ 2. ใช้ฟังก์ชันที่ถูกต้องในการคำนวณ Longest Streak
    const longestOverallStreak = habits.reduce((max, h) => Math.max(max, longestStreakForHabit(h)), 0);

    const topHabitsThisWeek = habits
      .map((h) => {
        const rate = pct(
          weeklyDays.filter((d) => h.history?.[fmt(d)]).length,
          weeklyDays.length
        );
        return { habitName: h.name, progressPercentage: rate };
      })
      .sort((a, b) => b.progressPercentage - a.progressPercentage);

    const highestProgressHabit = topHabitsThisWeek.length > 0 ? topHabitsThisWeek[0] : null;

    // ✅ 3. เพิ่มการคำนวณ "New Habits Started" (ใน 7 วันที่ผ่านมา)
    const sevenDaysAgo = new Date(today.setDate(today.getDate() - 7));
    const newHabitsCount = habits.filter(
      (h) => new Date(h.createdAt) >= sevenDaysAgo
    ).length;

    return {
      weeklyAverage,
      longestOverallStreak,
      highestProgressHabit,
      habitsCompletedThisWeek,
      newHabitsCount, // ส่งค่าใหม่กลับไป
    };

  } catch (error) {
    console.error("Failed to calculate shareable stats:", error);
    return {
      weeklyAverage: 0,
      longestOverallStreak: 0,
      highestProgressHabit: { habitName: "N/A", progressPercentage: 0 },
      habitsCompletedThisWeek: 0,
      newHabitsCount: 0,
    };
  }
};