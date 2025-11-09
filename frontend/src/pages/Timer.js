import React, { useState, useEffect } from "react";
import "./style/Timer.css";

export default function Timer() {
  let mode = "pomodoro";
  let pomodoroType = "work";
  let isRunning = false;
  let timeLeft = 25 * 60;
  let timerInterval = null;
  let tasks = [];
  let currentTaskIndex = 0;
  let workSessionsCompleted = 0;
  let draggedItem = null;

  const POMODORO_TIMES = {
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
  };

  const [displayTime, setDisplayTime] = useState("25:00");
  const [displaySessionInfo, setDisplaySessionInfo] = useState("Session 1 of 1");

  function calculatePomodoros(minutes) {
    return Math.ceil(minutes / 25);
  }

  function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    setDisplayTime(
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    );
  }

  function updateTheme() {
    document.body.classList.remove("timer-short-break-mode", "timer-long-break-mode");
    if (pomodoroType === "short") {
      document.body.classList.add("timer-short-break-mode");
    } else if (pomodoroType === "long") {
      document.body.classList.add("timer-long-break-mode");
    }
  }

  function switchMode(newMode, btnElement) {
    mode = newMode;
    document.querySelectorAll(".timer-mode-btn").forEach((btn) => btn.classList.remove("active"));
    btnElement.classList.add("active");

    const pomodoroTabs = document.getElementById("timerPomodoroTabs");
    if (mode === "pomodoro") {
      pomodoroTabs.classList.remove("hidden");
      setupTabListeners();
    } else {
      pomodoroTabs.classList.add("hidden");
      // Reset to red theme when switching to Regular mode
      pomodoroType = "work";
      document.body.classList.remove("timer-short-break-mode", "timer-long-break-mode");
    }

    resetTimer();
  }

  function setupTabListeners() {
    const tabs = document.querySelectorAll(".timer-pomo-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", handleTabClick);
    });
  }

  function handleTabClick(e) {
    document.querySelectorAll(".timer-pomo-tab").forEach((t) => t.classList.remove("active"));
    e.currentTarget.classList.add("active");

    const type = e.currentTarget.getAttribute("data-type");
    pomodoroType = type;

    timeLeft = POMODORO_TIMES[type];
    isRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById("timerStartBtn").textContent = "START";
    updateDisplay();
    updateTheme();
  }

  function toggleTimer() {
    if (isRunning) {
      if (timerInterval) clearInterval(timerInterval);
      document.getElementById("timerStartBtn").textContent = "RESUME";
    } else {
      document.getElementById("timerStartBtn").textContent = "PAUSE";
      timerInterval = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
          updateDisplay();
        } else {
          completeTimer();
        }
      }, 1000);
    }
    isRunning = !isRunning;
    renderTasks();
  }

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = false;

    if (mode === "pomodoro") {
      timeLeft = POMODORO_TIMES["work"];
      pomodoroType = "work";
      document.querySelectorAll(".timer-pomo-tab").forEach((t) => t.classList.remove("active"));
      const workTab = document.querySelector('[data-type="work"]');
      if (workTab) workTab.classList.add("active");
    } else {
      if (currentTaskIndex < tasks.length) {
        timeLeft = tasks[currentTaskIndex].minutes * 60;
      } else {
        timeLeft = 25 * 60;
      }
    }

    updateDisplay();
    document.getElementById("timerStartBtn").textContent = "START";
    renderTasks();
    updateTheme();
  }

  function completeTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = false;
    document.getElementById("timerStartBtn").textContent = "START";

    if (mode === "pomodoro") {
      if (pomodoroType === "work") {
        workSessionsCompleted++;

        if (currentTaskIndex < tasks.length) {
          const currentTask = tasks[currentTaskIndex];
          if (workSessionsCompleted >= currentTask.requiredPomos) {
            tasks[currentTaskIndex].completed = true;
            currentTaskIndex++;
            workSessionsCompleted = 0;

            if (currentTaskIndex < tasks.length) {
              alert("Task completed! Take a short break.");
              pomodoroType = "short";
              document.querySelectorAll(".timer-pomo-tab").forEach((t) => t.classList.remove("active"));
              const shortTab = document.querySelector('[data-type="short"]');
              if (shortTab) shortTab.classList.add("active");
              timeLeft = POMODORO_TIMES["short"];
            } else {
              alert("🎉 All tasks completed!");
              resetTimer();
              renderTasks();
              return;
            }
          } else {
            alert("Pomodoro complete! Take a short break.");
            pomodoroType = "short";
            document.querySelectorAll(".timer-pomo-tab").forEach((t) => t.classList.remove("active"));
            const shortTab = document.querySelector('[data-type="short"]');
            if (shortTab) shortTab.classList.add("active");
            timeLeft = POMODORO_TIMES["short"];
          }
        }
      } else if (pomodoroType === "short") {
        alert("Short break complete! Take a long break.");
        pomodoroType = "long";
        document.querySelectorAll(".timer-pomo-tab").forEach((t) => t.classList.remove("active"));
        const longTab = document.querySelector('[data-type="long"]');
        if (longTab) longTab.classList.add("active");
        timeLeft = POMODORO_TIMES["long"];
      } else if (pomodoroType === "long") {
        alert("Long break complete! Back to work.");
        pomodoroType = "work";
        document.querySelectorAll(".timer-pomo-tab").forEach((t) => t.classList.remove("active"));
        const workTab = document.querySelector('[data-type="work"]');
        if (workTab) workTab.classList.add("active");
        timeLeft = POMODORO_TIMES["work"];
      }
    } else {
      if (currentTaskIndex < tasks.length) {
        tasks[currentTaskIndex].completed = true;
        currentTaskIndex++;
        if (currentTaskIndex < tasks.length) {
          timeLeft = tasks[currentTaskIndex].minutes * 60;
        }
      }
      alert("Timer complete!");
    }

    updateDisplay();
    renderTasks();
    updateTheme();
  }

  function selectTask(index) {
    if (isRunning) return;
    currentTaskIndex = index;
    workSessionsCompleted = 0;
    resetTimer();
  }

  function startDrag(index) {
    if (isRunning) return;
    draggedItem = index;
    document.querySelectorAll(".timer-task-item")[index].classList.add("dragging");
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function drop(e, index) {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) {
      document.querySelectorAll(".timer-task-item").forEach((item) => item.classList.remove("dragging", "drag-over"));
      draggedItem = null;
      return;
    }

    const temp = tasks[draggedItem];
    if (draggedItem < index) {
      for (let i = draggedItem; i < index; i++) {
        tasks[i] = tasks[i + 1];
      }
    } else {
      for (let i = draggedItem; i > index; i--) {
        tasks[i] = tasks[i - 1];
      }
    }
    tasks[index] = temp;
    currentTaskIndex = index;
    workSessionsCompleted = 0;

    document.querySelectorAll(".timer-task-item").forEach((item) => {
      item.classList.remove("dragging", "drag-over");
    });
    draggedItem = null;

    resetTimer();
  }

  function renderTasks() {
    const tasksList = document.getElementById("timerTasksList");
    if (tasks.length === 0) {
      tasksList.innerHTML = '<div class="timer-empty-state">No tasks yet</div>';
      updateStats();
      return;
    }

    tasksList.innerHTML = tasks
      .map((task, idx) => {
        const isActive = idx === currentTaskIndex;
        const statusText = task.completed ? "Completed" : isActive && isRunning ? "Currently doing" : "";
        const sessionText =
          isActive && mode === "pomodoro" && !task.completed
            ? ` - Session ${Math.min(workSessionsCompleted + 1, task.requiredPomos)} of ${task.requiredPomos}`
            : "";

        return `
          <div class="timer-task-item ${task.completed ? "completed" : ""} ${isActive ? "active" : ""}" 
               draggable="true"
               data-index="${idx}">
            <div class="timer-task-checkbox ${task.completed ? "checked" : ""}">
              ${task.completed ? "✓" : ""}
            </div>
            <div class="timer-task-info">
              <div class="timer-task-name">${task.name}</div>
              <div class="timer-task-status">${statusText}${sessionText}</div>
            </div>
            <div class="timer-task-time">${task.minutes} mins</div>
          </div>
        `;
      })
      .join("");

    document.querySelectorAll(".timer-task-item").forEach((item) => {
      const idx = parseInt(item.getAttribute("data-index"));
      item.addEventListener("dragstart", () => {
        startDrag(idx);
      });
      item.addEventListener("dragover", dragOver);
      item.addEventListener("drop", (e) => {
        drop(e, idx);
      });
      item.addEventListener("dragend", () => {
        document.querySelectorAll(".timer-task-item").forEach((i) => i.classList.remove("dragging", "drag-over"));
      });
      item.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("timer-task-info") ||
          e.target.classList.contains("timer-task-name") ||
          e.target.classList.contains("timer-task-status")
        ) {
          selectTask(idx);
        }
      });
    });

    if (currentTaskIndex < tasks.length && mode === "pomodoro" && !tasks[currentTaskIndex].completed) {
      const sessionText = `Session ${Math.min(workSessionsCompleted + 1, tasks[currentTaskIndex].requiredPomos)} of ${tasks[currentTaskIndex].requiredPomos}`;
      setDisplaySessionInfo(sessionText);
    } else {
      setDisplaySessionInfo("");
    }

    updateStats();
  }

  function updateStats() {
    const completedCount = tasks.filter((t) => t.completed).length;
    const totalMinutes = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.minutes, 0);
    document.getElementById("timerCompletedCount").textContent = completedCount;
    document.getElementById("timerTotalTime").textContent = totalMinutes + "m";
  }

  function loadTasks() {
    tasks = [
      { name: "Reading", minutes: 60, requiredPomos: calculatePomodoros(60), completed: false },
      { name: "Cooking", minutes: 30, requiredPomos: calculatePomodoros(30), completed: false },
      { name: "Walking", minutes: 40, requiredPomos: calculatePomodoros(40), completed: false },
      { name: "Reading", minutes: 60, requiredPomos: calculatePomodoros(60), completed: false },
      { name: "Cooking", minutes: 30, requiredPomos: calculatePomodoros(30), completed: false },
      { name: "Walking", minutes: 40, requiredPomos: calculatePomodoros(40), completed: false },
      { name: "Reading", minutes: 60, requiredPomos: calculatePomodoros(60), completed: false },
      { name: "Cooking", minutes: 30, requiredPomos: calculatePomodoros(30), completed: false },
      { name: "Walking", minutes: 40, requiredPomos: calculatePomodoros(40), completed: false },
      { name: "Reading", minutes: 60, requiredPomos: calculatePomodoros(60), completed: false },
      { name: "Cooking", minutes: 30, requiredPomos: calculatePomodoros(30), completed: false },
      { name: "Walking", minutes: 40, requiredPomos: calculatePomodoros(40), completed: false },
    ];
    currentTaskIndex = 0;
    workSessionsCompleted = 0;
    renderTasks();
  }

  useEffect(() => {
    // mode buttons
    const modeButtons = document.querySelectorAll(".timer-mode-btn");
    if (modeButtons.length > 0) {
      modeButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
          const newMode = this.getAttribute("data-mode");
          if (newMode) {
            switchMode(newMode, this);
          }
        });
      });
    }

    // control buttons
    const startBtn = document.getElementById("timerStartBtn");
    const resetBtn = document.getElementById("timerResetBtn");
    
    if (startBtn) startBtn.addEventListener("click", toggleTimer);
    if (resetBtn) resetBtn.addEventListener("click", resetTimer);

    // app
    setTimeout(() => {
      loadTasks();
      setupTabListeners();
      updateDisplay();
      updateTheme();
    }, 0);

    // Cleanup function
    return () => {
      if (timerInterval) clearInterval(timerInterval);
      document.body.classList.remove("timer-short-break-mode", "timer-long-break-mode");
    };
  }, []);

  return (
    <>
      <div className="timer-layout">
        <div className="timer-container">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0px" }}>
            <div className="timer-mode-selector">
              <button className="timer-mode-btn active" data-mode="pomodoro">
                Pomodoro
              </button>
              <button className="timer-mode-btn" data-mode="regular">
                Regular
              </button>
            </div>
          </div>

          <div className="timer-pomodoro-tabs" id="timerPomodoroTabs">
            <button className="timer-pomo-tab active" data-type="work">
              Pomodoro (25m)
            </button>
            <button className="timer-pomo-tab" data-type="short">
              Short Break (5m)
            </button>
            <button className="timer-pomo-tab" data-type="long">
              Long Break (15m)
            </button>
          </div>

          <div className="timer-card">
            <div className="timer-time" id="timerTimeDisplay">
              {displayTime}
            </div>
            <div className="timer-session-info" id="timerSessionInfo">
              {displaySessionInfo}
            </div>
          </div>

          <div className="timer-controls">
            <div className="timer-button-group">
              <button className="timer-btn timer-btn-primary" id="timerStartBtn">
                START
              </button>
              <button className="timer-btn timer-btn-secondary" id="timerResetBtn">
                RESET
              </button>
            </div>
          </div>
        </div>

        <div className="timer-tasks-container">
          <div className="timer-tasks-section">
            <h3 className="timer-tasks-title">Tasks</h3>
            <div className="timer-tasks-list" id="timerTasksList">
              <div className="timer-empty-state">No tasks yet</div>
            </div>
          </div>

          <div className="timer-stats">
            <div className="timer-stat">
              <div className="timer-stat-label">Tasks Completed</div>
              <div className="timer-stat-value" id="timerCompletedCount">
                0
              </div>
            </div>
            <div className="timer-stat">
              <div className="timer-stat-label">Total Time Spent</div>
              <div className="timer-stat-value" id="timerTotalTime">
                0m
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
