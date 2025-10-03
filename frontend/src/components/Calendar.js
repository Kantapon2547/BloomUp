import React, { useMemo, useState } from "react";
import "./Calendar.css";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabel = (y, m) =>
  new Date(y, m, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
const dateKey = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // 0 = January

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// sample mood data
const sampleMoods = {};
[
  [2024, 11, 1, "😊"], [2024, 11, 2, "🙂"], [2024, 11, 3, "😁"], [2024, 11, 4, "🙂"],
  [2024, 11, 5, "🙂"], [2024, 11, 6, "😊"], [2024, 11, 7, "😁"], [2024, 11, 8, "😭"],
  [2024, 11, 9, "🙂"], [2024, 11, 10, "😊"], [2024, 11, 11, "😁"], [2024, 11, 12, "😊"],
  [2024, 11, 13, "🙂"], [2024, 11, 14, "😁"], [2024, 11, 15, "😊"], [2024, 11, 16, "😐"],
  [2024, 11, 17, "🙂"], [2024, 11, 18, "😁"], [2024, 11, 19, "😊"], [2024, 11, 20, "🙂"],
  [2025, 9, 2, "😁"]
].forEach(([y, m, d, emo]) => (sampleMoods[dateKey(y, m, d)] = emo));

// Legend mappings
const LEGEND = [
  ["😭", "Tough"],
  ["😐", "Okay"],
  ["🙂", "Good"],
  ["😊", "Great"],
  ["😁", "Amazing"],
];

export default function Calendar() {
  const today = new Date();
  // single state object
  const [date, setDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const cells = useMemo(() => buildMonthGrid(date.year, date.month), [date]);
  const daysInMonth = new Date(date.year, date.month + 1, 0).getDate();

  // stats
  const moodCounts = useMemo(() => {
    const counts = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const emo = sampleMoods[dateKey(date.year, date.month, d)];
      if (emo) counts[emo] = (counts[emo] || 0) + 1;
    }
    return counts;
  }, [date, daysInMonth]);

  const totalTracked = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const positiveEmos = new Set(["🙂", "😊", "😁"]);
  const positiveCount = Object.entries(moodCounts)
    .filter(([emo]) => positiveEmos.has(emo))
    .reduce((acc, [, c]) => acc + c, 0);
  const positivePct = totalTracked ? Math.round((positiveCount / totalTracked) * 100) : 0;

  const onPrev = () => {
    setDate(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  };

  const onNext = () => {
    setDate(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  };

  return (
    <div className="cal-screen light"> 
      {/* Top Nav */}
      <nav className="cal-nav">
        <div className="brand">
          <div className="brand-badge">B</div>
          <span className="brand-name">BloomUp</span>
        </div>
      </nav>

      <div className="cal-container">
        {/* Header */}
        <header className="cal-header">
          <h1 className="cal-title">Mood Calendar</h1>
          <p className="cal-subtitle">Track your emotional journey over time</p>
        </header>

        {/* Month Card */}
        <section className="card">
          <div className="card-head">
            <button className="icon-btn" aria-label="Previous month" onClick={onPrev}>‹</button>
            <h2 className="card-title">{monthLabel(date.year, date.month)}</h2>
            <button className="icon-btn" aria-label="Next month" onClick={onNext}>›</button>
          </div>

          <div className="card-body">
            {/* Weekday header */}
            <div className="week-header">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="week-name">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="cal-grid">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} className="day-cell day-empty" />;

                const emo = sampleMoods[dateKey(date.year, date.month, day)];
                const isToday =
                  day === today.getDate() &&
                  date.month === today.getMonth() &&
                  date.year === today.getFullYear();

                return (
                  <div
                    key={`d-${idx}`}
                    className={`day-cell day-interactive ${isToday ? "day-today" : ""}`}
                  >
                    <div className="day-number">{day}</div>
                    {emo && <div className="day-emoji">{emo}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Summary + Insights */}
        <section className="grid-2">
          <div className="card">
            <div className="card-head-only">
              <h3 className="card-title">Mood Summary</h3>
            </div>
            <div className="card-body">
              <div className="summary-list">
                {LEGEND.map(([emoji, label]) => {
                  const count = moodCounts[emoji] || 0;
                  const pct = totalTracked ? Math.round((count / totalTracked) * 100) : 0;
                  return (
                    <div key={emoji} className="summary-row">
                      <div className="summary-left">
                        <span className="summary-emoji">{emoji}</span>
                        <div className="summary-text">
                          <div className="summary-label">{label}</div>
                          <div className="summary-sub">
                            {count} days{totalTracked ? ` (${pct}%)` : ""}
                          </div>
                        </div>
                      </div>
                      <div className={`stat ${label.toLowerCase()}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head-only">
              <h3 className="card-title">Monthly Insights</h3>
            </div>
            <div className="card-body">
              <div className="insights">
                <div className="insight-positive">
                  <div className="insight-number">{positivePct}%</div>
                  <div className="insight-label">Positive mood days</div>
                </div>

                <div className="insight-kvs">
                  <div className="kv">
                    {/* Most common mood */}
                    <span className="kv-key">Most common mood:</span>
                    <span className="kv-val">
                      {(() => {
                        const entries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
                        return entries[0] ? `${entries[0][0]}` : "—";
                      })()}
                    </span>
                  </div>
                  {/* Days tracked */}
                  <div className="kv">
                    <span className="kv-key">Days tracked:</span>
                    <span className="kv-val">{totalTracked} / {daysInMonth}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
