import React, { useState, useEffect, useRef, useCallback } from "react";
import "./style/Timer.css";
import { useSharedTasks } from "./SharedTaskContext";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const getToken = () => {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") {
    console.error("No token in localStorage");
    return null;
  }
  console.log("Token found, length:", token.length);
  return `Bearer ${token}`;
};

async function apiFetch(path, options = {}) {
  const token = getToken();
  
  if (!token) {
    console.error("Authentication required - no token");
    throw new Error("Authentication required");
  }
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": token,
    ...(options.headers || {}),
  };
  
  console.log(`API Request: ${options.method || 'GET'} ${path}`);
  
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers,
      ...options,
    });
    
    console.log(`API Response Status: ${res.status} for ${path}`);
    
    if (res.status === 401) {
      console.error("401 Unauthorized");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    
    if (res.status === 204) {
      console.log("204 No Content response");
      return null;
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error ${res.status}:`, errorText);
      throw new Error(`API Error ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log(`API Response data:`, data);
    return data;
  } catch (error) {
    console.error(`Fetch failed for ${path}:`, error.message);
    throw error;
  }
}

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

function formatDisplayTime(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  
  return `${String(totalMinutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const TIMER_STORAGE_KEY = "timer_state";

export default function Timer() {
  const { tasks: sharedTasks, completeTask } = useSharedTasks();
  
  const loadTimerState = () => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === formatLocalDate(new Date())) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Failed to load timer state:", error);
    }
    return null;
  };

  const savedState = loadTimerState();
  
  const [mode, setMode] = useState(savedState?.mode || "pomodoro");
  const [pomodoroType, setPomodoroType] = useState(savedState?.pomodoroType || "work");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(savedState?.timeLeft || 25 * 60);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(savedState?.currentTaskIndex || 0);
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(savedState?.workSessionsCompleted || 0);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [habitSessions, setHabitSessions] = useState({});
  const [elapsedSeconds, setElapsedSeconds] = useState(savedState?.elapsedSeconds || 0);
  
  const timerIntervalRef = useRef(null);

  const POMODORO_TIMES = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  useEffect(() => {
    const stateToSave = {
      mode,
      pomodoroType,
      timeLeft,
      currentTaskIndex,
      workSessionsCompleted,
      elapsedSeconds,
      date: formatLocalDate(new Date()),
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [mode, pomodoroType, timeLeft, currentTaskIndex, workSessionsCompleted, elapsedSeconds]);

  const canUsePomodoroMode = (minutes) => minutes >= 25;

  const ensureSessionForTask = useCallback(async (task) => {
    console.log("\n🔍 DEBUG: ensureSessionForTask called with task:", task);
    
    console.log(`Raw task.id: "${task.id}" (type: ${typeof task.id})`);
    
    const habitId = parseInt(task.id, 10);
    
    console.log(`After parseInt: ${habitId} (isNaN: ${isNaN(habitId)})`);
    
    if (isNaN(habitId)) {
      console.error(`Invalid habit ID:`, task.id);
      throw new Error(`Invalid habit ID: ${task.id}`);
    }
    
    const sessionKey = `${habitId}-${formatLocalDate(new Date())}`;
    
    console.log(`\nENSURE_SESSION_FOR_TASK`);
    console.log(`   habitId (final): ${habitId}`);
    console.log(`   task.name: ${task.name}`);
    console.log(`   task.minutes: ${task.minutes}`);
    console.log(`   sessionKey: ${sessionKey}`);
    
    if (habitSessions[sessionKey]) {
      console.log(`Session already cached:`, habitSessions[sessionKey]);
      return habitSessions[sessionKey];
    }
    
    try {
      console.log(`Checking for existing sessions...`);
      
      let existingSessions;
      try {
        existingSessions = await apiFetch(`/habits/${habitId}/sessions?date_filter=${formatLocalDate(new Date())}`);
      } catch (fetchError) {
        console.log(`Could not fetch sessions:`, fetchError.message);
        existingSessions = [];
      }
      
      if (existingSessions && existingSessions.length > 0) {
        const existingSession = existingSessions[0];
        console.log(`Found existing session:`, existingSession);
        
        setHabitSessions(prev => ({
          ...prev,
          [sessionKey]: existingSession
        }));
        
        return existingSession;
      }
      
      console.log(`🔨 Creating new session via API for habit ${habitId}...`);
      
      // Send in seconds: task.minutes * 60
      const payload = {
        planned_duration_seconds: task.minutes * 60,
        session_date: formatLocalDate(new Date()),
        notes: null,
      };
      
      console.log(`   Payload (seconds):`, payload);
      
      const session = await apiFetch(`/habits/${habitId}/sessions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      console.log(`Session created successfully:`, session);
      
      if (!session || !session.session_id) {
        console.error(`Invalid session response - missing session_id:`, session);
        throw new Error("Invalid session response from API");
      }
      
      setHabitSessions(prev => ({
        ...prev,
        [sessionKey]: session
      }));
      
      return session;
    } catch (error) {
      if (error.message.includes("Session already exists") || error.message.includes("400")) {
        console.log(`🔄 Session exists, fetching...`);
        try {
          const existingSessions = await apiFetch(`/habits/${habitId}/sessions?date_filter=${formatLocalDate(new Date())}`);
          
          if (existingSessions && existingSessions.length > 0) {
            const existingSession = existingSessions[0];
            console.log(`Retrieved existing session:`, existingSession);
            
            setHabitSessions(prev => ({
              ...prev,
              [sessionKey]: existingSession
            }));
            
            return existingSession;
          }
        } catch (fetchError) {
          console.error(`Failed to fetch existing sessions:`, fetchError);
        }
      }
      
      console.error(`Failed to ensure session:`, error);
      throw error;
    }
  }, [habitSessions]);

  const updateSessionProgress = useCallback(async (task, elapsedSeconds) => {
    const habitId = parseInt(task.id, 10);
    
    if (isNaN(habitId)) {
      console.error(`Invalid habit ID:`, task.id);
      return;
    }
    
    const sessionKey = `${habitId}-${formatLocalDate(new Date())}`;
    const session = habitSessions[sessionKey];
    
    if (!session) {
      console.warn(`No session found for key:`, sessionKey);
      return;
    }
    
    if (!session.session_id) {
      console.error(`Session has no session_id:`, session);
      return;
    }
    
    try {
      console.log(`Updating session ${session.session_id}: ${elapsedSeconds}s elapsed`);

      const updated = await apiFetch(`/habits/${habitId}/sessions/${session.session_id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "in_progress",
          actual_duration_seconds: Math.max(0, elapsedSeconds),
        }),
      });
      
      console.log(`Session updated - actual_duration_seconds: ${updated.actual_duration_seconds}s`);
      
      setHabitSessions(prev => ({
        ...prev,
        [sessionKey]: updated
      }));
    } catch (error) {
      console.error(`Failed to update session:`, error);
    }
  }, [habitSessions]);

  const tasks = sharedTasks.map(task => ({
  ...task,
  // Make sure minutes is always a number
  minutes: typeof task.minutes === 'number' ? task.minutes : (task.duration || 30),
}));

  useEffect(() => {
    if (tasks.length > 0 && currentTaskIndex < tasks.length) {
      const currentTask = tasks[currentTaskIndex];
      if (currentTask.minutes < 25 && mode === "pomodoro") {
        setMode("regular");
        setTimeLeft(currentTask.minutes * 60);
      }
    }
  }, [tasks, currentTaskIndex, mode]);

  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds(prev => prev + 1);
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

  useEffect(() => {
    if (isRunning && currentTaskIndex < tasks.length && mode === "regular") {
      const currentTask = tasks[currentTaskIndex];
      
      if (elapsedSeconds % 5 === 0 && elapsedSeconds > 0) {
        console.log(`Periodic update: ${elapsedSeconds}s elapsed`);
        updateSessionProgress(currentTask, elapsedSeconds);
      }
    }
  }, [elapsedSeconds, isRunning, currentTaskIndex, tasks, mode, updateSessionProgress]);

  useEffect(() => {
  if (timeLeft === 0 && isRunning) {
    setIsRunning(false);
    
    if (mode === "regular") {
      if (currentTaskIndex < tasks.length) {
        const currentTask = tasks[currentTaskIndex];
        const finalSeconds = elapsedSeconds;
        console.log(`Timer finished - ${finalSeconds} seconds elapsed`);
        
        const habitId = parseInt(currentTask.id, 10);
        const sessionKey = `${habitId}-${formatLocalDate(new Date())}`;
        const session = habitSessions[sessionKey];
        
        if (session && session.session_id) {
          apiFetch(`/habits/${habitId}/sessions/${session.session_id}`, {
            method: "PUT",
            body: JSON.stringify({
              status: "done",
              actual_duration_seconds: Math.max(0, finalSeconds),
            }),
          }).then(updated => {
            console.log(`Session marked done with ${updated.actual_duration_seconds}s`);
            setHabitSessions(prev => ({
              ...prev,
              [sessionKey]: updated
            }));
          }).catch(err => console.error(`Failed to mark done:`, err));
        }
        
        // Mark habit complete
        const today = formatLocalDate(new Date());
        apiFetch(`/habits/${habitId}/complete?on=${today}`, {
          method: "POST",
        }).then(() => {
          console.log(`Habit ${habitId} marked complete for today in Habits page`);
        }).catch(err => console.error(`Failed to mark habit complete:`, err));
        
        // Update shared tasks context
        completeTask(currentTask.id);
        setCurrentTaskIndex(currentTaskIndex + 1);
        setElapsedSeconds(0);
        
        if (currentTaskIndex + 1 < tasks.length) {
          setTimeLeft(tasks[currentTaskIndex + 1].minutes * 60);
        }
      }
      alert("Timer complete!");
    } else {
        if (pomodoroType === "work") {
          const newSessionCount = workSessionsCompleted + 1;
          setWorkSessionsCompleted(newSessionCount);

          if (currentTaskIndex < tasks.length) {
            const currentTask = tasks[currentTaskIndex];
            if (newSessionCount >= currentTask.requiredPomos) {
              // Use the completeTask function from context
              completeTask(currentTask.id);
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
      }
    }
  }, [timeLeft, isRunning, mode, pomodoroType, currentTaskIndex, tasks, workSessionsCompleted, elapsedSeconds, habitSessions, completeTask]);

  const displayTime = () => {
    return formatDisplayTime(timeLeft);
  };

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
    if (isRunning) return;
    setPomodoroType(type);
    setTimeLeft(POMODORO_TIMES[type]);
    setIsRunning(false);
  };

  const toggleTimer = async () => {
    console.log(`\nTOGGLE_TIMER - isRunning: ${isRunning}, mode: ${mode}, taskIndex: ${currentTaskIndex}`);
    
    if (!isRunning && mode === "regular" && currentTaskIndex < tasks.length) {
      const currentTask = tasks[currentTaskIndex];
      console.log(`STARTING timer for task:`, currentTask);
      
      try {
        const session = await ensureSessionForTask(currentTask);
        if (!session) {
          console.error(`Failed to create session`);
          alert("Failed to start session. Please try again.");
          return;
        }
        console.log(`Session created:`, session);
        
        const habitId = parseInt(currentTask.id, 10);
        const sessionKey = `${habitId}-${formatLocalDate(new Date())}`;
        console.log(`About to update session status to in_progress`);
        console.log(`habitId: ${habitId}`);
        console.log(`sessionKey: ${sessionKey}`);
        console.log(`session.session_id: ${session.session_id}`);
        
        const updated = await apiFetch(`/habits/${habitId}/sessions/${session.session_id}`, {
          method: "PUT",
          body: JSON.stringify({
            status: "in_progress",
            actual_duration_seconds: 0,
          }),
        });
        
        console.log(`Session status updated to in_progress:`, updated);
        console.log(`New status: ${updated.status}`);
        console.log(`started_at: ${updated.started_at}`);
        
        setHabitSessions(prev => ({
          ...prev,
          [sessionKey]: updated
        }));
        
      } catch (error) {
        console.error(`Session error:`, error);
        console.error(`Error message: ${error.message}`);
        alert("Failed to start session: " + error.message);
        return;
      }
    } else if (isRunning && mode === "regular" && currentTaskIndex < tasks.length) {
      const currentTask = tasks[currentTaskIndex];
      console.log(`PAUSING timer - elapsed: ${elapsedSeconds} seconds`);
      
      const habitId = parseInt(currentTask.id, 10);
      const sessionKey = `${habitId}-${formatLocalDate(new Date())}`;
      const session = habitSessions[sessionKey];
      
      if (session && session.session_id) {
        try {
          await apiFetch(`/habits/${habitId}/sessions/${session.session_id}`, {
            method: "PUT",
            body: JSON.stringify({
              status: "todo",
              actual_duration_seconds: Math.max(0, elapsedSeconds),
            }),
          });
          console.log(`Session paused with ${elapsedSeconds} seconds elapsed`);
        } catch (error) {
          console.error(`Failed to pause session:`, error);
        }
      }
    }
    
    console.log(`Setting isRunning to: ${!isRunning}`);
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
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.minutes, 0);

  const currentTaskMinutes = currentTaskIndex < tasks.length ? tasks[currentTaskIndex].minutes : 25;
  const canUsePomodoro = canUsePomodoroMode(currentTaskMinutes);
  const shouldShowPomodoroMode = tasks.length > 0 && canUsePomodoro;

  useEffect(() => {
    document.body.classList.remove("timer-short-break-mode", "timer-long-break-mode");
    
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
        <button 
          className="timer-details-btn"
          onClick={() => setShowDetails(!showDetails)}
          title="Learn about timer modes"
        >
          <span className="material-symbols-outlined timer-details-icon">help</span>
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0px" }}>
          <div className="timer-mode-selector">
            {shouldShowPomodoroMode && (
              <button 
                className={`timer-mode-btn ${mode === "pomodoro" ? "active" : ""}`}
                onClick={() => switchMode("pomodoro")}
              >
                Pomodoro
              </button>
            )}
            <button 
              className={`timer-mode-btn ${mode === "regular" ? "active" : ""}`}
              onClick={() => switchMode("regular")}
            >
              Regular
            </button>
          </div>
        </div>


        {showDetails && (
          <div className="timer-details-overlay" onClick={() => setShowDetails(false)}>
            <div className="timer-details-modal" onClick={(e) => e.stopPropagation()}>
              <button className="timer-details-close" onClick={() => setShowDetails(false)}>×</button>
              
              <div className="timer-details-section">
                <h3>🍅 Pomodoro Timer</h3>
                <p>The Pomodoro Technique breaks your work into focused intervals:</p>
                <ul>
                  <li>Work for 25 minutes (one Pomodoro)</li>
                  <li>Take a 5-minute short break</li>
                  <li>Take a 15-minute long break after multiple sessions</li>
                </ul>
                <p><em>Perfect for maintaining focus and preventing burnout through structured intervals.</em></p>
              </div>

              <div className="timer-details-section">
                <h3>⏱️ Regular Timer</h3>
                <p>Work through tasks at your own pace with custom durations:</p>
                <ul>
                  <li>Set custom time for each task</li>
                  <li>Work continuously through your task list</li>
                  <li>No breaks between tasks</li>
                </ul>
                <p><em>Great for tasks requiring extended focus or flexible time management.</em></p>
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
          <h3 className="timer-tasks-title">
            {tasks.length <= 1 ? 'Task' : 'Tasks'}
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
            <div className="timer-stat-label">
              {tasks.length <= 1 ? 'Task Completed' : 'Tasks Completed'}
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