import React, { createContext, useContext, useState, useEffect } from 'react';

const TaskContext = createContext();

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

  // Sync tasks from habits
  useEffect(() => {
    const todayKey = formatLocalDate(new Date());
    const tasksFromHabits = habits
    // Only incomplete habits for today
      .filter(h => !h.history?.[todayKey])
      .map(h => ({
        id: h.id,
        name: h.name,
        minutes: h.duration,
        icon: h.icon,
        category: h.category,
        color: h.color,
        completed: false,
        requiredPomos: Math.ceil(h.duration / 25),
        fromHabit: true
      }));
    
    setTasks(tasksFromHabits);
  }, [habits]);

  const updateHabits = (newHabits) => {
    setHabits(newHabits);
  };

  const completeTask = (taskId) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, completed: true } : t)
    );
  };

  const markHabitComplete = (habitId, date) => {
    // called from Timer to update habit completion
    return { habitId, date };
  };

  return (
    <TaskContext.Provider value={{ 
      tasks, 
      setTasks, 
      habits,
      updateHabits,
      completeTask,
      markHabitComplete
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
