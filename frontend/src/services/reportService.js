// ✅ แก้ไข import ให้ชี้ไปที่ habitStorage.js
import { createStorage } from "./habitStorage";

// Utility Functions (ย้ายมาจาก Reports.js)
const storage = createStorage(); // ตรงนี้จะทำงานได้ถูกต้องแล้ว
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -d.getDay());
const pct = (num, den) => (den === 0 ? 0 : Math.round((num / den) * 100));

const calcStreak = (habit) => {
  let s = 0;
  for (let i = 0; ; i++) {
    const key = fmt(addDays(new Date(), -i));
    if (habit.history?.[key]) s++;
    else break;
  }
  return s;
};

// --- ฟังก์ชันหลักสำหรับดึงและคำนวณข้อมูล ---
export const getShareableStats = async () => {
  try {
    const habits = await storage.list();
    if (!habits || habits.length === 0) {
      return {
        weeklyAverage: 0,
        longestOverallStreak: 0,
        highestProgressHabit: null,
        habitsCompletedThisWeek: 0,
      };
    }

    // --- คำนวณข้อมูลสำหรับสัปดาห์ปัจจุบัน ---
    const today = new Date();
    const start = startOfWeek(today);
    const weeklyDays = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    const dailyCompletion = weeklyDays.map((d) => {
      const key = fmt(d);
      const done = habits.filter((h) => h.history?.[key]).length;
      return { done, total: habits.length, rate: pct(done, habits.length) };
    });

    const weeklySum = dailyCompletion.reduce((a, b) => a + b.rate, 0);
    const weeklyAverage = Math.round(weeklySum / (dailyCompletion.length || 1));
    const habitsCompletedThisWeek = dailyCompletion.reduce((sum, day) => sum + day.done, 0);

    // --- คำนวณ Longest Streak จากทุก Habits ---
    const longestOverallStreak = habits.reduce((max, h) => Math.max(max, calcStreak(h)), 0);

    // --- คำนวณ Habit ที่มี Progress สูงสุดในสัปดาห์นี้ ---
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

    // --- ส่งข้อมูลทั้งหมดกลับไป ---
    return {
      weeklyAverage,
      longestOverallStreak,
      highestProgressHabit,
      habitsCompletedThisWeek,
    };

  } catch (error) {
    console.error("Failed to calculate shareable stats:", error);
    // ส่งค่าเริ่มต้นกลับไปในกรณีที่เกิดข้อผิดพลาด
    return {
      weeklyAverage: 0,
      longestOverallStreak: 0,
      highestProgressHabit: { habitName: "N/A", progressPercentage: 0 },
      habitsCompletedThisWeek: 0,
    };
  }
};