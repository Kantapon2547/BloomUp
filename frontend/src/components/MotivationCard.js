import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap"; // animate
import './MotivationCard.css';

const LS_KEY = "habit-tracker@hybrid";

const getTodayString = () => {
  const bangkokTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  return new Date(bangkokTime).toISOString().slice(0, 10);
};

// feedback templates
const FEEDBACK_TEMPLATES = {
  0: {
    baseMessages: [
      "You are capable of amazing things.",
      "Every journey begins with a single step.",
      "Ready to begin? Just click and you'll immediately beat 0%.",
      "Every 100% success starts here. Take your first step",
      "Every big goal starts with a small step — you've got this!"
    ],
  },
  25: {
    baseMessages: [
      "Every journey starts with a single step! You've officially begun.",
      "Great start! Keep that streak going!",
      "Keep going! The hardest part is starting, and you've already done that. 25% complete!",
      "Good progress! you’re already a quarter of the way there!"
    ],
  },
  50: {
    baseMessages: [
      "Halfway there! You're doing great! ",
      "50% complete today. Keep going!",
      "Halfway there! The goal is closer than the start.",
    ],
  },
  75: {
    baseMessages: [
      "Almost there! You're unstoppable! ",
      "75% complete! One more push!",
      "You’ve come so far. just a little more effort to go!"
    ],
  },
  100: {
    baseMessages: [
      "Perfect day! You're a champion!!",
      "100% complete! Crushed your goals!",
      "Amazing finish! Keep the streak going — tomorrow’s a new opportunity.",
      "Congratulations! You did it!"
    ],
  },
};

// progress tier
const getProgressTier = (percentage) => {
  if (percentage === 100) return 100;
  if (percentage >= 75) return 75;
  if (percentage >= 50) return 50;
  if (percentage >= 25) return 25;
  return 0;
};

export default function DailyMotivationCard({ completedHabits, totalHabits }) {
  const todayStr = getTodayString();
  const [quote, setQuote] = useState("");
  const [progressTier, setProgressTier] = useState(0);
  const [progressBadge, setProgressBadge] = useState("Progress");
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [improvement, setImprovement] = useState(0);

  const cardRef = useRef(null);
  const quoteRef = useRef(null);

  // Calculate progress percentage
  const progressPercentage = totalHabits ? Math.round((completedHabits / totalHabits) * 100) : 0;

  // Calculate weekly progress and improvement
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");

      if (Array.isArray(raw)) {
        // Calculate last 7 days progress
        const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().slice(0, 10);
        });

        const weeklyTotal = lastSevenDays.reduce((sum, date) => {
          return sum + raw.filter((habit) => !!habit.history?.[date]).length;
        }, 0);

        const weekly = totalHabits ? Math.round((weeklyTotal / (totalHabits * 7)) * 100) : 0;
        setWeeklyProgress(weekly);

        // Calculate previous week progress
        const prevWeekDays = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (i + 7));
          return date.toISOString().slice(0, 10);
        });

        const prevWeekTotal = prevWeekDays.reduce((sum, date) => {
          return sum + raw.filter((habit) => !!habit.history?.[date]).length;
        }, 0);

        const prevWeekly = totalHabits ? Math.round((prevWeekTotal / (totalHabits * 7)) * 100) : 0;
        const diff = weekly - prevWeekly;
        setImprovement(diff);
      }
    } catch (error) {
      console.error("Failed to calculate progress:", error);
    }
  }, [totalHabits, completedHabits, todayStr]);

  // Update motivation based on progress
  useEffect(() => {
    const tier = getProgressTier(progressPercentage);
    setProgressTier(tier);

    const templates = FEEDBACK_TEMPLATES[tier];
    if (!templates || !templates.baseMessages || templates.baseMessages.length === 0) return;

    // Select random base message
    const baseMessage = templates.baseMessages[Math.floor(Math.random() * templates.baseMessages.length)];
    
    // Build message with stats
    let finalMessage = baseMessage;
    if (improvement > 0) {
      finalMessage = `${baseMessage} Improved by ${improvement > 0 ? '+' : ''}${improvement}% from last week.`;
    } else if (weeklyProgress > 0) {
      finalMessage = `${baseMessage} Weekly progress: ${weeklyProgress}%.`;
    }

    setQuote(finalMessage);

    // Animate quote entrance
    if (quoteRef.current) {
      gsap.fromTo(
        quoteRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [progressPercentage, improvement, weeklyProgress]);

  // card animation
  useEffect(() => {
    if (cardRef.current) {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, []);

  return (
    <div ref={cardRef} className="motivation-card">
      <div className="motivation-header">
        <h3>Daily Motivation</h3>
      </div>

      <div ref={quoteRef} className="motivation-quote">
        <p>{quote || "You are capable of amazing things."}</p>
      </div>
    </div>
  );
}
