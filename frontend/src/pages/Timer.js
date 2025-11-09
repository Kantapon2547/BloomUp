import React, { useState, useEffect, useRef } from "react";
import "./style/Timer.css";
import { useSharedTasks } from "./SharedTaskContext";

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTotalTime(minutes) {
  if (minutes === 0) return "0 mins";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

export default function Timer() {
  const { habits } = useSharedTasks();
  
  // Timer state
  const [mode, setMode] = useState("pomodoro");
  const [pomodoroType, setPomodoroType] = useState("work");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [tasks, setTasks] = useState([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);
  const [draggedItem, setDraggedItem] = useState(null);
  
  const timerIntervalRef = useRef(null);

  const POMODORO_TIMES = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  // Helper to convert duration to minutes
  const durationToMins = (raw) => {
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const lower = raw.toLowerCase().trim();
      const mMatch = lower.match(/(\d+)\s*m/);
      if (mMatch) return parseInt(mMatch[1], 10);
      const hMatch = lower.match(/(\d+)\s*h/);
      if (hMatch) return parseInt(hMatch[1], 10) * 60;
    }
    return 30; // fallback
  };

  // Sync tasks from habits
  useEffect(() => {
    const todayKey = formatLocalDate(new Date());
    const tasksFromHabits = habits
      .map(h => {
        const minutes = durationToMins(h.duration);
        return {
          id: h.id,
          name: h.name,
          minutes: minutes,
          icon: h.icon,
          category: h.category,
          color: h.color,
          completed: !!h.history?.[todayKey],
          requiredPomos: Math.ceil(minutes / 25),
          fromHabit: true
        };
      });
    
    setTasks(tasksFromHabits);
  }, [habits]);

  // Timer countdown effect
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning]);

  // Handle timer completion - using ref to avoid dependency issues
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      
      if (mode === "pomodoro") {
        if (pomodoroType === "work") {
          const newSessionCount = workSessionsCompleted + 1;
          setWorkSessionsCompleted(newSessionCount);

          if (currentTaskIndex < tasks.length) {
            const currentTask = tasks[currentTaskIndex];
            if (newSessionCount >= currentTask.requiredPomos) {
              const updatedTasks = [...tasks];
              updatedTasks[currentTaskIndex].completed = true;
              setTasks(updatedTasks);
              setCurrentTaskIndex(currentTaskIndex + 1);
              setWorkSessionsCompleted(0);

              if (currentTaskIndex + 1 < tasks.length) {
                alert("Task completed! Take a short break.");
                setPomodoroType("short");
                setTimeLeft(5 * 60);
              } else {
                alert("🎉 All tasks completed!");
                setIsRunning(false);
                setTimeLeft(25 * 60);
                setPomodoroType("work");
              }
            } else {
              alert("Pomodoro complete! Take a short break.");
              setPomodoroType("short");
              setTimeLeft(5 * 60);
            }
          }
        } else if (pomodoroType === "short") {
          alert("Short break complete! Take a long break.");
          setPomodoroType("long");
          setTimeLeft(15 * 60);
        } else if (pomodoroType === "long") {
          alert("Long break complete! Back to work.");
          setPomodoroType("work");
          setTimeLeft(25 * 60);
        }
      } else {
        if (currentTaskIndex < tasks.length) {
          const updatedTasks = [...tasks];
          updatedTasks[currentTaskIndex].completed = true;
          setTasks(updatedTasks);
          setCurrentTaskIndex(currentTaskIndex + 1);
          if (currentTaskIndex + 1 < tasks.length) {
            setTimeLeft(tasks[currentTaskIndex + 1].minutes * 60);
          }
        }
        alert("Timer complete!");
      }
    }
  }, [timeLeft, isRunning, mode, pomodoroType, currentTaskIndex, tasks, workSessionsCompleted]);

  // Display time formatting
  const displayTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Session info display
  const displaySessionInfo = () => {
    if (currentTaskIndex < tasks.length && mode === "pomodoro" && !tasks[currentTaskIndex]?.completed) {
      const task = tasks[currentTaskIndex];
      return `Session ${Math.min(workSessionsCompleted + 1, task.requiredPomos)} of ${task.requiredPomos}`;
    }
    return "";
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    setWorkSessionsCompleted(0);
    
    if (newMode === "pomodoro") {
      // Always start with work pomodoro (25 min)
      setPomodoroType("work");
      setTimeLeft(POMODORO_TIMES["work"]);
    } else {
      // Regular mode - use current task's duration
      if (currentTaskIndex < tasks.length) {
        setTimeLeft(tasks[currentTaskIndex].minutes * 60);
      } else {
        setTimeLeft(25 * 60);
      }
    }
  };

  const switchPomodoroType = (type) => {
    setPomodoroType(type);
    setTimeLeft(POMODORO_TIMES[type]);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    
    if (mode === "pomodoro") {
      setTimeLeft(POMODORO_TIMES["work"]);
      setPomodoroType("work");
    } else {
      if (currentTaskIndex < tasks.length) {
        setTimeLeft(tasks[currentTaskIndex].minutes * 60);
      } else {
        setTimeLeft(25 * 60);
      }
    }
  };



  const selectTask = (index) => {
    if (isRunning) return;
    setCurrentTaskIndex(index);
    setWorkSessionsCompleted(0);
    
    // Only change time in regular mode, not in pomodoro breaks
    if (mode === "regular") {
      // Regular mode - use selected task's duration
      if (index < tasks.length) {
        setTimeLeft(tasks[index].minutes * 60);
      } else {
        setTimeLeft(25 * 60);
      }
    }
    // In pomodoro mode, don't change the time when selecting tasks
  };

  const handleDragStart = (index) => {
    if (isRunning) return;
    setDraggedItem(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) {
      setDraggedItem(null);
      return;
    }

    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedItem, 1);
    newTasks.splice(index, 0, removed);
    
    setTasks(newTasks);
    setCurrentTaskIndex(index);
    setWorkSessionsCompleted(0);
    setDraggedItem(null);
    resetTimer();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Calculate stats
  const completedCount = tasks.filter(t => t.completed).length;
  const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.minutes, 0);

  // Handle break mode theme changes (only for Pomodoro mode)
  useEffect(() => {
    document.body.classList.remove("timer-short-break-mode", "timer-long-break-mode");
    
    // Only apply break mode colors if in Pomodoro mode
    if (mode === "pomodoro") {
      if (pomodoroType === "short") {
        document.body.classList.add("timer-short-break-mode");
      } else if (pomodoroType === "long") {
        document.body.classList.add("timer-long-break-mode");
      }
    }

    return () => {
      document.body.classList.remove("timer-short-break-mode", "timer-long-break-mode");
    };
  }, [pomodoroType, mode]);

  return (
    <div className="timer-layout">
      <div className="timer-container">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0px" }}>
          <div className="timer-mode-selector">
            <button 
              className={`timer-mode-btn ${mode === "pomodoro" ? "active" : ""}`}
              onClick={() => switchMode("pomodoro")}
            >
              Pomodoro
            </button>
            <button 
              className={`timer-mode-btn ${mode === "regular" ? "active" : ""}`}
              onClick={() => switchMode("regular")}
            >
              Regular
            </button>
          </div>
        </div>

        <div className={`timer-pomodoro-tabs ${mode === "regular" ? "hidden" : ""}`}>
          <button 
            className={`timer-pomo-tab ${pomodoroType === "work" ? "active" : ""}`}
            onClick={() => switchPomodoroType("work")}
          >
            Pomodoro (25m)
          </button>
          <button 
            className={`timer-pomo-tab ${pomodoroType === "short" ? "active" : ""}`}
            onClick={() => switchPomodoroType("short")}
          >
            Short Break (5m)
          </button>
          <button 
            className={`timer-pomo-tab ${pomodoroType === "long" ? "active" : ""}`}
            onClick={() => switchPomodoroType("long")}
          >
            Long Break (15m)
          </button>
        </div>

        <div className="timer-card">
          <div className="timer-time">
            {displayTime()}
          </div>
          <div className="timer-session-info">
            {displaySessionInfo()}
          </div>
        </div>

        <div className="timer-controls">
          <div className="timer-button-group">
            <button className="timer-btn timer-btn-primary" onClick={toggleTimer}>
              {isRunning ? "PAUSE" : "START"}
            </button>
            <button className="timer-btn timer-btn-secondary" onClick={resetTimer}>
              RESET
            </button>
          </div>
        </div>
      </div>

      <div className="timer-tasks-container">
        <div className="timer-tasks-section">
          <h3 className="timer-tasks-title">Tasks</h3>
          <div className="timer-tasks-list">
            {tasks.length === 0 ? (
              <div className="timer-empty-state">No tasks yet</div>
            ) : (
              tasks.map((task, idx) => {
                const isActive = idx === currentTaskIndex;
                const statusText = task.completed 
                  ? "Completed" 
                  : isActive && isRunning 
                    ? "Currently doing" 
                    : "";
                const sessionText = isActive && mode === "pomodoro" && !task.completed
                  ? ` - Session ${Math.min(workSessionsCompleted + 1, task.requiredPomos)} of ${task.requiredPomos}`
                  : "";

                return (
                  <div
                    key={task.id}
                    className={`timer-task-item ${task.completed ? "completed" : ""} ${isActive ? "active" : ""} ${draggedItem === idx ? "dragging" : ""}`}
                    draggable={!isRunning}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectTask(idx)}
                  >
                    <div className={`timer-task-checkbox ${task.completed ? "checked" : ""}`}>
                      {task.completed ? "✓" : ""}
                    </div>
                    <div className="timer-task-info">
                      <div className="timer-task-name">
                        {task.icon ? task.icon + " " : ""}{task.name}
                      </div>
                      <div className="timer-task-status">{statusText}{sessionText}</div>
                    </div>
                    <div className="timer-task-time">{task.minutes}m</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="timer-stats">
          <div className="timer-stat">
            <div className="timer-stat-label">Tasks Completed</div>
            <div className="timer-stat-value">{completedCount}</div>
          </div>
          <div className="timer-stat">
            <div className="timer-stat-label">Total Time Spent</div>
            <div className="timer-stat-value">{formatTotalTime(totalMinutes)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
