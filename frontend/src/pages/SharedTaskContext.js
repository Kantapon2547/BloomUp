import React, { createContext, useContext, useState, useEffect } from 'react';

const TaskContext = createContext();
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const parseDurationToMinutes = (raw) => {
  if (typeof raw === "number" && !Number.isNaN(raw) && raw > 0) return raw;
  if (!raw) return 30;

  if (typeof raw === "string") {
    const lower = raw.toLowerCase().trim();

    const hMatch = lower.match(/(\d+)\s*h(our)?s?/);
    if (hMatch) return parseInt(hMatch[1], 10) * 60;

    const mMatch = lower.match(/(\d+)\s*m(in)?s?/);
    if (mMatch) return parseInt(mMatch[1], 10);

    const num = parseInt(lower, 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  return 30; 
};

export const useSharedTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useSharedTasks must be used within TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token for categories fetch");
        return [];
      }

      console.log("📋 Fetching categories...");
      const response = await fetch(`${API_URL}/habits/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Categories response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Categories fetch failed: ${response.status}`, errorText);
        return [];
      }

      const data = await response.json();
      console.log("Categories fetched:", data);
      
      if (!Array.isArray(data)) {
        console.error("Categories response is not an array:", data);
        return [];
      }
      
      setCategories(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      return [];
    }
  };

  const getCategoryInfo = (categoryId, categoriesList) => {
    console.log(`Looking up category ID: ${categoryId}`);
    console.log(`Available categories:`, categoriesList);
    
    if (!categoryId) {
      return { category_name: "General", color: "#ede9ff" };
    }
    
    if (!categoriesList || categoriesList.length === 0) {
      console.warn(`Categories list is empty!`);
      return { category_name: "General", color: "#ede9ff" };
    }
    
    const category = categoriesList.find(cat => cat.category_id === categoryId);
    
    if (category) {
      console.log(`Found category: ${category.category_name}`);
      return category;
    } else {
      console.warn(`Category ID ${categoryId} not found in categories list. Available: ${categoriesList.map(c => c.category_id).join(', ')}`);
      // If category not found, return the first category as fallback
      if (categoriesList.length > 0) {
        console.log(`Falling back to first category: ${categoriesList[0].category_name}`);
        return categoriesList[0];
      }
      return { category_name: "General", color: "#ede9ff" };
    }
  };

  const transformHabit = (habit, categoriesList) => {
    console.log("Transforming habit:", habit);
    console.log("Raw category data:", habit.category);
    console.log("Category ID:", habit.category_id);
    console.log("Available categories:", categoriesList);

    let categoryName = "General";
    let categoryColor = "#ede9ff";
    let finalCategoryId = habit.category_id;

    // check object before send to the api
    if (habit.category && typeof habit.category === 'object' && habit.category.category_name) {
      categoryName = habit.category.category_name;
      categoryColor = habit.category.color || "#ede9ff";
      finalCategoryId = habit.category.category_id || habit.category_id;
      console.log(`Full category object: ${categoryName} (ID: ${finalCategoryId})`);
    }
    else if (typeof habit.category === 'number') {
      finalCategoryId = habit.category;
      const categoryInfo = getCategoryInfo(habit.category, categoriesList);
      categoryName = categoryInfo.category_name;
      categoryColor = categoryInfo.color;
      console.log(`Category is number: ${categoryName} (ID: ${habit.category})`);
    }
    else if (habit.category_id) {
      const categoryInfo = getCategoryInfo(habit.category_id, categoriesList);
      categoryName = categoryInfo.category_name;
      categoryColor = categoryInfo.color;
      console.log(`Using category_id: ${categoryName} (ID: ${habit.category_id})`);
    }
    
    // FIX: Better duration parsing with multiple fallbacks
    const rawDuration = habit.duration_minutes ?? habit.duration ?? habit.planned_duration ?? habit.time ?? habit.default_duration;
    console.log(`Habit "${habit.habit_name}" raw duration:`, rawDuration, "from API fields:", {
      duration_minutes: habit.duration_minutes,
      duration: habit.duration,
      planned_duration: habit.planned_duration
    });
    
    const minutes = parseDurationToMinutes(rawDuration);
    console.log(`Parsed to ${minutes} minutes`);
    
    const transformed = {
      id: habit.habit_id,
      name: habit.habit_name,
      minutes: minutes,
      duration: minutes,
      icon: habit.emoji || "📚",
      category: categoryName,
      categoryId: finalCategoryId,
      color: categoryColor,
      history: habit.history || {},
      best_streak: habit.best_streak || 0,
      is_active: habit.is_active !== false,
    };

    console.log(`Final transformed:`, transformed);
    return transformed;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found - cannot fetch data");
        setLoading(false);
        return;
      }

      console.log("🚀 Starting data fetch...");

      // Fetch categories
      const categoriesData = await fetchCategories();
      console.log("📋 Categories loaded:", categoriesData);

      // VERIFY categories were actually loaded
      if (!categoriesData || categoriesData.length === 0) {
        console.warn("No categories returned from API");
      }

      // Then fetch habits
      console.log("📖 Fetching habits...");
      const response = await fetch(`${API_URL}/habits/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        console.error("401 Unauthorized");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`API Error ${response.status}`);
      }

      const habitsData = await response.json();
      console.log("Raw habits data:", habitsData);
      console.log("Categories available for transformation:", categoriesData);

      const transformedHabits = habitsData.map(habit => 
        transformHabit(habit, categoriesData)
      );

      console.log("All transformed habits:", transformedHabits);
      setHabits(transformedHabits);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const todayKey = formatLocalDate(new Date());
    console.log("Creating tasks from habits:", habits);
    
    const tasksFromHabits = habits
      .filter(h => {
        const isActive = h.is_active !== false;
        console.log(`  Checking habit "${h.name}": is_active=${h.is_active} -> filtered as ${isActive}`);
        return isActive;
      })
      .map(h => ({
        id: h.id,
        name: h.name,
        minutes: h.minutes, 
        duration: h.minutes, 
        icon: h.icon,
        category: h.category,
        color: h.color,
        completed: !!h.history?.[todayKey],
        requiredPomos: Math.ceil(h.minutes / 25),
        fromHabit: true
      }));
    
    console.log("Final tasks for display:", tasksFromHabits);
    setTasks(tasksFromHabits);
  }, [habits]);

  const updateHabits = (newHabits) => {
    console.log("Updating habits:", newHabits);
    setHabits(newHabits);
  };

  const completeTask = (taskId) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, completed: true } : t)
    );
    
    // Also update the habit in the habits array
    setHabits(prev =>
      prev.map(h => {
        if (h.id === taskId) {
          const todayKey = formatLocalDate(new Date());
          return {
            ...h,
            history: {
              ...h.history,
              [todayKey]: true
            }
          };
        }
        return h;
      })
    );
  };

  const markHabitComplete = (habitId, date) => {
    return { habitId, date };
  };

  // Refresh habits from API
  const refreshHabits = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log("Refreshing habits...");
      const categoriesData = await fetchCategories();

      const response = await fetch(`${API_URL}/habits/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error(`API Error ${response.status}`);

      const data = await response.json();
      console.log("Habits refreshed:", data);

      const transformedHabits = data.map(habit => 
        transformHabit(habit, categoriesData)
      );

      setHabits(transformedHabits);
    } catch (err) {
      console.error("Failed to refresh habits:", err);
    }
  };

  return (
    <TaskContext.Provider value={{ 
      tasks, 
      setTasks, 
      habits,
      categories,
      updateHabits,
      refreshHabits,
      completeTask,
      markHabitComplete,
      loading,
      error,
    }}>
      {children}
    </TaskContext.Provider>
  );
};

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}