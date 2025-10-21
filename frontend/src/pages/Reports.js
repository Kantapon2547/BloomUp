import React, { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import "./style/Reports.css";
import { createStorage } from "./Habits";

/* ===== Utility Functions ===== */
const storage = createStorage();
const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -d.getDay());
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
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

/* ===== Custom Hooks ===== */
const usePeriod = (periodMode, cursor) =>
  useMemo(() => {
    if (periodMode === "week") {
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return { start, end, days };
    }
    const start = startOfMonth(cursor);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const total = end.getDate();
    const days = Array.from({ length: total }, (_, i) => addDays(start, i));
    return { start, end, days };
  }, [periodMode, cursor]);

/* ===== Animation Helper ===== */
const fadeIn = (targets, opts = {}) => {
  gsap.fromTo(
    targets,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out", ...opts }
  );
};

/* ===== Reusable Components ===== */
const AnimatedCard = React.memo(({ children }) => {
  const ref = useRef(null);
  useEffect(() => {
    gsap.from(ref.current, { y: 20, opacity: 0, duration: 0.4, ease: "power2.out" });
  }, []);
  return (
    <div
      ref={ref}
      className="kcard"
      onMouseEnter={() =>
        gsap.to(ref.current, { y: -4, boxShadow: "var(--shadow-hover)", duration: 0.3 })
      }
      onMouseLeave={() =>
        gsap.to(ref.current, { y: 0, boxShadow: "var(--shadow)", duration: 0.3 })
      }
    >
      {children}
    </div>
  );
});

const Donut = React.memo(({ value }) => {
  const circleRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const r = 38,
      c = 2 * Math.PI * r;
    const off = c * (1 - value / 100);
    gsap.to(circleRef.current, { strokeDashoffset: off, duration: 1, ease: "power2.out" });
    gsap.fromTo(textRef.current, { scale: 0 }, { scale: 1, delay: 0.3, duration: 0.4 });
  }, [value]);

  const r = 38,
    c = 2 * Math.PI * r;

  return (
    <svg width="96" height="96" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} stroke="#E5E7EB" strokeWidth="12" fill="none" />
      <circle
        ref={circleRef}
        cx="50"
        cy="50"
        r={r}
        stroke="#7c3aed"
        strokeWidth="12"
        fill="none"
        strokeDasharray={c}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        ref={textRef}
        x="50"
        y="54"
        textAnchor="middle"
        fontWeight="700"
        fontSize="18"
        fill="#4b5563"
      >
        {value}%
      </text>
    </svg>
  );
});

const BarChart = React.memo(({ data, periodMode }) => {
  const barsRef = useRef([]);
  const numbersRef = useRef([]);
  const [hovered, setHovered] = useState(null);

  const barWidth = periodMode === "week" ? 20 : 14;
  const spacing = periodMode === "week" ? 36 : 24;

  useEffect(() => {
    gsap.fromTo(
      barsRef.current,
      { scaleY: 0, transformOrigin: "bottom" },
      { scaleY: 1, duration: 0.6, stagger: 0.05, ease: "back.out(1.2)" }
    );
  }, [data]);

  useEffect(() => {
    numbersRef.current.forEach((el, idx) => {
      if (!el) return;
      gsap.to(el, {
        opacity: hovered === idx ? 1 : 0,
        scale: hovered === idx ? 1 : 0.8,
        duration: 0.3,
        ease: "power1.inOut",
      });
    });
  }, [hovered]);

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${data.length * spacing} 160`} className="svgb">
        <line x1="0" y1="140" x2={data.length * spacing} y2="140" stroke="#E5E7EB" />
        {data.map((d, i) => {
          const label =
            periodMode === "week"
              ? d.dateObj.toLocaleDateString("en-US", { weekday: "short" })
              : d.dateObj.getDate();

          return (
            <g
              key={d.key}
              transform={`translate(${i * spacing}, 0)`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                ref={(el) => (barsRef.current[i] = el)}
                x="0"
                y={140 - d.rate * 1.1}
                width={barWidth}
                height={d.rate * 1.1}
                rx="0"
                fill="#7c3aed"
                opacity="0.9"
              />
              <text x={barWidth / 2} y="156" textAnchor="middle" fontSize="10" fill="#6b7280">
                {label}
              </text>
              <text
                ref={(el) => (numbersRef.current[i] = el)}
                x={barWidth / 2}
                y={140 - d.rate * 1.1 - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#7c3aed"
                fontWeight="500"
              >
                {d.rate}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

const CategoryPieChart = React.memo(({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  const categoryColors = {
    general: "#dbeafe",
    study: "#e0f2fe",
    health: "#dcfce7",
    mind: "#ede9fe",
    personal: "#dbeafe",
  };

  const categoryStrokeColors = {
    general: "#93c5fd",
    study: "#7dd3fc",
    health: "#86efac",
    mind: "#c4b5fd",
    personal: "#93c5fd",
  };

  const normalizedData = data.map((c) => ({
    cat: (c.cat || "general").toLowerCase(),
    rate: c.rate,
  }));

  const total = normalizedData.reduce((sum, c) => sum + c.rate, 0) || 1;
  const angles = normalizedData.map((c) => (c.rate / total) * 360);

  const radius = 45;

  const createSlice = (startAngle, angle) => {
    const x1 = 50 + radius * Math.cos((Math.PI / 180) * startAngle);
    const y1 = 50 + radius * Math.sin((Math.PI / 180) * startAngle);
    const x2 = 50 + radius * Math.cos((Math.PI / 180) * (startAngle + angle));
    const y2 = 50 + radius * Math.sin((Math.PI / 180) * (startAngle + angle));
    const largeArc = angle > 180 ? 1 : 0;
    return `M50,50 L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const paths = svgRef.current.querySelectorAll("path");
    gsap.fromTo(
      paths,
      { scale: 0, transformOrigin: "50% 50%" },
      { scale: 1, duration: 1.5, stagger: 0.2, ease: "power2.out" }
    );
  }, [normalizedData]);

  const handleMouseMove = (e, c) => {
    if (!tooltipRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + 10;
    const y = e.clientY - rect.top + 10;
    tooltipRef.current.style.opacity = 1;
    tooltipRef.current.style.left = `${x}px`;
    tooltipRef.current.style.top = `${y}px`;
    tooltipRef.current.textContent = `${c.cat}: ${c.rate}%`;
  };

  const handleMouseLeave = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.opacity = 0;
  };

  let startAngle = -90;

  return (
    <div style={{ position: "relative", width: 200, margin: "0 auto", padding: "0 10px" }}>
      <svg ref={svgRef} viewBox="0 0 100 100" width={200} height={200}>
        {normalizedData.map((c, i) => {
          const angle = angles[i];
          const path = createSlice(startAngle, angle);
          startAngle += angle;

          return (
            <g key={c.cat}>
              <path
                d={path}
                fill={categoryColors[c.cat] || "#ddd"}
                stroke={categoryStrokeColors[c.cat] || "#999"}
                strokeWidth={1}
                onMouseMove={(e) => handleMouseMove(e, c)}
                onMouseLeave={handleMouseLeave}
              />
            </g>
          );
        })}
      </svg>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          padding: "4px 8px",
          borderRadius: "6px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: "10px",
          opacity: 0,
          transition: "opacity 0.1s ease",
          whiteSpace: "nowrap",
          zIndex: 9999,
        }}
      />
    </div>
  );
});

// Chart Toggle Switch Component
const ChartToggleSwitch = React.memo(({ chartType, onToggle }) => {
  const switchRef = useRef(null);
  const knobRef = useRef(null);

  const handleToggle = () => {
    const newType = chartType === "bar" ? "pie" : "bar";
    onToggle(newType);
    
    // Animate the knob
    if (knobRef.current) {
      gsap.to(knobRef.current, {
        x: newType === "pie" ? 26 : 0,
        duration: 0.3,
        ease: "power2.out"
      });
    }
    
    // Animate the switch background
    if (switchRef.current) {
      gsap.to(switchRef.current, {
        backgroundColor: newType === "pie" ? "var(--violet-100)" : "#e5e7eb",
        duration: 0.3,
        ease: "power2.out"
      });
    }
  };

  return (
    <div className="chart-toggle">
      <span
        className={`material-symbols-outlined ${chartType === "bar" ? "active" : ""}`}
        onClick={() => onToggle("bar")}
      >
        bar_chart
      </span>
      <div 
        ref={switchRef}
        className={`switch ${chartType}`}
        onClick={handleToggle}
        style={{ cursor: 'pointer' }}
      >
        <div ref={knobRef} className="knob"></div>
      </div>
      <span
        className={`material-symbols-outlined ${chartType === "pie" ? "active" : ""}`}
        onClick={() => onToggle("pie")}
      >
        pie_chart
      </span>
    </div>
  );
});

/* ===== Main Component ===== */
export default function Reports() {
  const [habits, setHabits] = useState([]);
  const [periodMode, setPeriodMode] = useState("week");
  const [cursor, setCursor] = useState(new Date());
  const [chartType, setChartType] = useState("bar");

  const chartRef = useRef();
  const twoColRef = useRef();

  useEffect(() => {
    storage.list().then(setHabits).catch(console.error);
  }, []);

  const period = usePeriod(periodMode, cursor);

  const dailyCompletion = useMemo(() => {
    return period.days.map((d) => {
      const key = fmt(d);
      const done = habits.filter((h) => h.history?.[key]).length;
      return { key, dateObj: d, done, total: habits.length, rate: pct(done, habits.length) };
    });
  }, [habits, period]);

  const avgCompletion = useMemo(() => {
    const sum = dailyCompletion.reduce((a, b) => a + b.rate, 0);
    return Math.round(sum / (dailyCompletion.length || 1));
  }, [dailyCompletion]);

  const longestStreak = useMemo(
    () => habits.reduce((m, h) => Math.max(m, calcStreak(h)), 0),
    [habits]
  );

  const topHabits = useMemo(() => {
    return habits
      .map((h) => {
        const rate = pct(
          period.days.filter((d) => h.history?.[fmt(d)]).length,
          period.days.length
        );
        return { name: h.name, category: h.category || "general", rate };
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5); // Always show exactly top 5, even if some have 0%
  }, [habits, period]);

  const categoryPct = useMemo(() => {
    const allCategories = new Set(habits.map((h) => h.category || "general"));
  
    const results = Array.from(allCategories).map((cat) => {
      const catHabits = habits.filter((h) => (h.category || "general") === cat);
      const totalHabits = catHabits.length;
      if (totalHabits === 0) return { cat, rate: 0 };
  
      const doneDays = catHabits.reduce((sum, h) => {
        const completed = period.days.filter((d) => h.history?.[fmt(d)]).length;
        return sum + completed;
      }, 0);
  
      const rate = Math.round((doneDays / (totalHabits * period.days.length)) * 100);
      return { cat, rate };
    });
  
    const defaultCategories = ["health", "work", "study", "personal", "general"];
    defaultCategories.forEach((cat) => {
      if (!results.find((r) => r.cat === cat)) results.push({ cat, rate: 0 });
    });
  
    return results.sort((a, b) => b.rate - a.rate);
  }, [habits, period]);

  const handleChartTypeToggle = (newType) => {
    setChartType(newType);
  };

  useEffect(() => {
    fadeIn([chartRef.current, ...twoColRef.current?.children]);
  }, [periodMode, cursor, chartType]);

  return (
    <div className="reports-root">
      <section className="reports-content">
        {/* Header */}
        <header className="reports-header">
          <div className="rp-controls">
            <div className="seg">
              {["week", "month"].map((m) => (
                <button
                  key={m}
                  className={`seg-btn ${periodMode === m ? "is-active" : ""}`}
                  onClick={() => setPeriodMode(m)}
                >
                  {m === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
            <div className="pager">
              <button onClick={() => setCursor(addDays(period.start, periodMode === "week" ? -7 : -30))}>
                &lt;
              </button>
              <span>
                {periodMode === "week"
                  ? `${period.start.toLocaleDateString()} – ${period.end.toLocaleDateString()}`
                  : period.start.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => setCursor(addDays(period.end, periodMode === "week" ? 7 : 30))}>
                &gt;
              </button>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="kpi">
          <AnimatedCard>
            <div className="kcap">Average Completion</div>
            <div className="kbody">
              <Donut value={avgCompletion} />
            </div>
          </AnimatedCard>
          <AnimatedCard>
            <div className="kcap">Habits Tracked</div>
            <div className="kbig">{habits.length}</div>
            <div className="kfoot">active habits</div>
          </AnimatedCard>
          <AnimatedCard>
            <div className="kcap">Longest Streak</div>
            <div className="kbig">{longestStreak}</div>
            <div className="kfoot">across all habits</div>
          </AnimatedCard>
        </div>

        {/* Chart with toggle - Centered */}
        <div ref={chartRef} className="card rp-chart">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <h3 style={{ margin: '0 auto', textAlign: 'center' }}>Daily Completion</h3>
            <div style={{ position: 'absolute', right: '20px' }}>
              <ChartToggleSwitch chartType={chartType} onToggle={handleChartTypeToggle} />
            </div>
          </div>
          {chartType === "bar" ? (
            <BarChart key={periodMode} data={dailyCompletion} periodMode={periodMode} />
          ) : (
            <CategoryPieChart key={periodMode} data={categoryPct} />
          )}
        </div>

        {/* Two Columns */}
        <div ref={twoColRef} className="twocol">
          <div className="card">
            <div className="card-head">
              <h3>Top 5 Habits</h3>
            </div>
            {topHabits.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Habit</th>
                    <th>Category</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topHabits.map((r, index) => (
                    <tr key={`${r.name}-${index}`}>
                      <td>{r.name}</td>
                      <td>{r.category}</td>
                      <td>
                        <span className="pill">{r.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted empty-state">No habits tracked yet 📭</p>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Category Breakdown</h3>
            </div>
            <ul className="list">
              {categoryPct.map((c) => (
                <li key={c.cat} className="list-row">
                  <span className="cap">{c.cat}</span>
                  <div className="bar-container">
                    <div className="bar-bg">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${c.rate}%`,
                          backgroundColor: c.rate === 0 ? "#E5E7EB" : "#7c3aed",
                        }}
                      />
                    </div>
                  </div>
                  <span className="rate">{c.rate}%</span>
                </li>
              ))}
              {categoryPct.length === 0 && <li className="muted">No data</li>}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}