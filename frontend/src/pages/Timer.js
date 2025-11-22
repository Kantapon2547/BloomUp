import React, { useState, useEffect, useRef } from "react";
import "./style/Timer.css";
import { useSharedTasks } from "./SharedTaskContext";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/* ---------- utilities ---------- */

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTotalTime(minutes) {
  if (minutes === 0) return "0min";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}mins`;
  } else if (mins === 0) {
    return `${hours}hr`;
  } else {
    return `${hours}hr ${mins}mins`;
  }
}

function parseDurationToMinutes(raw) {
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (!raw) return 30;

  if (typeof raw === "string") {
    const lower = raw.toLowerCase().trim();
    const hMatch = lower.match(/(\d+)\s*h(our)?s?/);
    if (hMatch) return parseInt(hMatch[1], 10) * 60;
    const mMatch = lower.match(/(\d+)\s*m(in)?s?/);
    if (mMatch) return parseInt(mMatch[1], 10);
    const num = parseInt(lower, 10);
    if (!Number.isNaN(num)) return num;
  }

  return 30;
}

/* ---------- localStorage logger for Reports ---------- */

const TIMER_SESSION_KEY = "bloomup_timer_sessions";

function saveSessionSummary({ habitId, task, status, actualSeconds }) {
  try {
    const raw = localStorage.getItem(TIMER_SESSION_KEY);
    const list = raw ? JSON.parse(raw) : [];

    const dateKey = formatLocalDate(new Date());
    const key = `${habitId}-${dateKey}`;

    const plannedMinutes = task.minutes || 0;
    const actualMinutes = Math.round(Math.max(0, actualSeconds) / 60);

    const entry = {
      key,
      habitId,
      taskId: task.id,
      taskName: task.name,
      category: task.category || "General",
      mode: "regular",
      plannedMinutes,
      actualMinutes,
      minutes: actualMinutes,
      status,
      completedAt: status === "done" ? new Date().toISOString() : null,
    };

    const idx = list.findIndex((s) => s.key === key);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.push(entry);
    }

    localStorage.setItem(TIMER_SESSION_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save timer session to localStorage", e);
  }
}

/* ---------- API function to mark habit complete ---------- */

async function markHabitCompleteAPI(habitId, date) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("No token available for marking habit complete");
      return false;
    }

    console.log(`Marking habit ${habitId} complete for date ${date}`);

    const response = await fetch(`${API_URL}/habits/${habitId}/complete?on=${date}`, {
      method: "POST",
      headers: {
        Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      console.error("401 Unauthorized - Token is invalid");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return false;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to mark habit complete: ${response.status}`, errorText);
      return false;
    }

    console.log(`Successfully marked habit ${habitId} complete`);
    return true;
  } catch (error) {
    console.error("Error marking habit complete:", error);
    return false;
  }
}

/* ---------- main component ---------- */

export default function Timer() {
  const { habits, refreshHabits } = useSharedTasks();

  const [mode, setMode] = useState("pomodoro");
  const [pomodoroType, setPomodoroType] = useState("work");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [tasks, setTasks] = useState([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const timerIntervalRef = useRef(null);

  const POMODORO_TIMES = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  /* ---------- sync tasks from habits ---------- */

  useEffect(() => {
    const todayKey = formatLocalDate(new Date());
    const tasksFromHabits = habits.map((h) => {
      const minutes = parseDurationToMinutes(h.duration);

      return {
        id: h.id,
        name: h.name,
        minutes,
        icon: h.icon,
        category: h.category,
        color: h.color,
        completed: !!h.history?.[todayKey],
        requiredPomos: Math.ceil(minutes / 25),
        fromHabit: true,
      };
    });

    setTasks(tasksFromHabits);
  }, [habits]);

  /* ---------- timer countdown ---------- */

  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
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

  /* ---------- when timer ends ---------- */

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      if (mode === "pomodoro") {
        handlePomodoroComplete();
      } else {
        handleRegularComplete();
      }
    }
  }, [timeLeft, isRunning]);

  const handlePomodoroComplete = async () => {
    if (pomodoroType === "work") {
      const newSessionCount = workSessionsCompleted + 1;
      setWorkSessionsCompleted(newSessionCount);

      if (currentTaskIndex < tasks.length) {
        const currentTask = tasks[currentTaskIndex];
        if (newSessionCount >= currentTask.requiredPomos) {
          // Mark task as complete
          const updatedTasks = [...tasks];
          updatedTasks[currentTaskIndex].completed = true;
          setTasks(updatedTasks);

          // Sync with backend
          const today = formatLocalDate(new Date());
          const success = await markHabitCompleteAPI(currentTask.id, today);

          if (success) {
            // Refresh habits to update UI across all components
            await refreshHabits();

            saveSessionSummary({
              habitId: currentTask.id,
              task: currentTask,
              status: "done",
              actualSeconds: elapsedSeconds || currentTask.minutes * 60,
            });
          }

          setCurrentTaskIndex(currentTaskIndex + 1);
          setWorkSessionsCompleted(0);

          if (currentTaskIndex + 1 < tasks.length) {
            alert("Task completed! Take a short break.");
            setPomodoroType("short");
            setTimeLeft(5 * 60);
          } else {
            alert("All tasks completed!");
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
  };

  const handleRegularComplete = async () => {
    if (currentTaskIndex < tasks.length) {
      const currentTask = tasks[currentTaskIndex];

      // Save to localStorage for reports
      saveSessionSummary({
        habitId: currentTask.id,
        task: currentTask,
        status: "done",
        actualSeconds: elapsedSeconds || currentTask.minutes * 60,
      });

      // Mark task as complete locally
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex].completed = true;
      setTasks(updatedTasks);

      // Sync with backend API
      const today = formatLocalDate(new Date());
      const success = await markHabitCompleteAPI(currentTask.id, today);

      if (success) {
        console.log("Habit marked complete in backend");
        // Refresh habits to update UI across all components
        await refreshHabits();
      } else {
        console.warn("Failed to mark habit complete in backend");
      }

      setCurrentTaskIndex(currentTaskIndex + 1);
      setElapsedSeconds(0);

      if (currentTaskIndex + 1 < tasks.length) {
        setTimeLeft(tasks[currentTaskIndex + 1].minutes * 60);
      }
    }
    alert("Timer complete!");
  };

  /* ---------- UI helpers ---------- */

  const displayTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const displaySessionInfo = () => {
    if (
      currentTaskIndex < tasks.length &&
      mode === "pomodoro" &&
      !tasks[currentTaskIndex]?.completed
    ) {
      const task = tasks[currentTaskIndex];
      const base = task.requiredPomos;
      const total =
        typeof base === "number" && !Number.isNaN(base) && base > 0
          ? base
          : Math.max(1, Math.ceil((task.minutes || 25) / 25));

      const current = Math.min(workSessionsCompleted + 1, total);
      return `Session ${current} of ${total}`;
    }
    return "";
  };

  /* ---------- mode switches ---------- */

  const switchMode = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    setWorkSessionsCompleted(0);
    setElapsedSeconds(0);

    if (newMode === "pomodoro") {
      setPomodoroType("work");
      setTimeLeft(POMODORO_TIMES["work"]);
    } else {
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
    setElapsedSeconds(0);

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
    setElapsedSeconds(0);

    if (mode === "regular") {
      if (index < tasks.length) {
        setTimeLeft(tasks[index].minutes * 60);
      } else {
        setTimeLeft(25 * 60);
      }
    }
  };

  /* ---------- drag & drop ---------- */

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

  /* ---------- stats ---------- */

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalMinutes = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.minutes, 0);

  /* ---------- theme ---------- */

  useEffect(() => {
    document.body.classList.remove(
      "timer-short-break-mode",
      "timer-long-break-mode"
    );

    if (mode === "pomodoro") {
      if (pomodoroType === "short") {
        document.body.classList.add("timer-short-break-mode");
      } else if (pomodoroType === "long") {
        document.body.classList.add("timer-long-break-mode");
      }
    }

    return () => {
      document.body.classList.remove(
        "timer-short-break-mode",
        "timer-long-break-mode"
      );
    };
  }, [pomodoroType, mode]);

  /* ---------- render ---------- */

  return (
    <div className="timer-layout">
      <div className="timer-container">
        <button
          className="timer-details-btn"
          onClick={() => setShowDetails(!showDetails)}
          title="Learn about timer modes"
        >
          <span className="material-symbols-outlined timer-details-icon">
            help
          </span>
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 0 }}>
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

        {showDetails && (
          <div
            className="timer-details-overlay"
            onClick={() => setShowDetails(false)}
          >
            <div
              className="timer-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="timer-details-close"
                onClick={() => setShowDetails(false)}
              >
                ✕
              </button>

              <div className="timer-details-section">
                <h3>🍅 Pomodoro Timer</h3>
                <p>The Pomodoro Technique breaks your work into focused intervals:</p>
                <ul>
                  <li>Work for 25 minutes (one Pomodoro)</li>
                  <li>Take a 5-minute short break</li>
                  <li>Take a 15-minute long break after multiple sessions</li>
                </ul>
                <p>
                  <em>
                    Perfect for maintaining focus and preventing burnout through
                    structured intervals.
                  </em>
                </p>
              </div>

              <div className="timer-details-section">
                <h3>⏱️ Regular Timer</h3>
                <p>Work through tasks at your own pace with custom durations:</p>
                <ul>
                  <li>Set custom time for each task</li>
                  <li>Work continuously through your task list</li>
                  <li>No breaks between tasks</li>
                </ul>
                <p>
                  <em>
                    Great for tasks requiring extended focus or flexible time
                    management.
                  </em>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`timer-pomodoro-tabs ${mode === "regular" ? "hidden" : ""}`}>
          <button
            className={`timer-pomo-tab ${pomodoroType === "work" ? "active" : ""}`}
            onClick={() => switchPomodoroType("work")}
          >
            Pomodoro
          </button>
          <button
            className={`timer-pomo-tab ${pomodoroType === "short" ? "active" : ""}`}
            onClick={() => switchPomodoroType("short")}
          >
            Short Break
          </button>
          <button
            className={`timer-pomo-tab ${pomodoroType === "long" ? "active" : ""}`}
            onClick={() => switchPomodoroType("long")}
          >
            Long Break
          </button>
        </div>

        <div className="timer-card">
          <div className="timer-time">{displayTime()}</div>
          <div className="timer-session-info">{displaySessionInfo()}</div>
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
          <h3 className="timer-tasks-title">
            {tasks.length <= 1 ? "Task" : "Tasks"}
          </h3>
          <div className="timer-tasks-list">
            {tasks.length === 0 ? (
              <div className="timer-empty-state">No task yet</div>
            ) : (
              tasks.map((task, idx) => {
                const isActive = idx === currentTaskIndex;
                const statusText = task.completed
                  ? "Completed"
                  : isActive && isRunning
                  ? "Currently doing"
                  : "";
                const sessionText =
                  isActive &&
                  mode === "pomodoro" &&
                  !task.completed &&
                  task.requiredPomos
                    ? ` - Session ${Math.min(
                        workSessionsCompleted + 1,
                        task.requiredPomos
                      )} of ${task.requiredPomos}`
                    : "";

                return (
                  <div
                    key={task.id}
                    className={`timer-task-item ${
                      task.completed ? "completed" : ""
                    } ${isActive ? "active" : ""} ${
                      draggedItem === idx ? "dragging" : ""
                    }`}
                    draggable={!isRunning}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => selectTask(idx)}
                  >
                    <div
                      className={`timer-task-checkbox ${
                        task.completed ? "checked" : ""
                      }`}
                    >
                      {task.completed ? "✓" : ""}
                    </div>
                    <div className="timer-task-info">
                      <div className="timer-task-name">
                        {task.icon ? task.icon + " " : ""}
                        {task.name}
                      </div>
                      <div className="timer-task-status">
                        {statusText}
                        {sessionText}
                      </div>
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
            <div className="timer-stat-label">
              {tasks.length <= 1 ? "Task Completed" : "Tasks Completed"}
            </div>
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