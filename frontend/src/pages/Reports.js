import React, { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import "./style/Reports.css";
import { createStorage } from "./Habits";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
const ReportsAnimatedCard = React.memo(({ children }) => {
  const ref = useRef(null);
  useEffect(() => {
    gsap.from(ref.current, { y: 20, opacity: 0, duration: 0.4, ease: "power2.out" });
  }, []);
  return (
    <div
      ref={ref}
      className="rp-kcard"
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

const ReportsDonut = React.memo(({ value }) => {
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

const ReportsBarChart = React.memo(({ data, periodMode }) => {
  const barsRef = useRef([]);
  const numbersRef = useRef([]);
  const [hovered, setHovered] = useState(null);

  const barWidth = periodMode === "week" ? 20 : 14;
  const spacing = periodMode === "week" ? 36 : 24;

  useEffect(() => {
    // Animate bars when data changes
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
    <div className="rp-chart-wrapper">
      <svg viewBox={`0 0 ${data.length * spacing} 160`} className="rp-svgb">
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
                style={{ opacity: 0 }}
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

const ReportsCategoryPieChart = ({ data }) => {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const total = data.reduce((a, b) => a + b.rate, 0);
  const normalizedData =
    total > 0
      ? data.map((d) => ({ ...d, pct: (d.rate / total) * 100 }))
      : [];

  const radius = 55;
  const center = 70;
  const svgSize = 140;

  useEffect(() => {
    gsap.fromTo(
      svgRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power1.out" }
    );
  }, [data]);

  if (total === 0) {
    return (
      <div className="rp-empty-state">
        <p>Track habits to see progress</p>
      </div>
    );
  }

  let cumulativePct = 0;
  normalizedData.forEach(item => {
    item.startPct = cumulativePct;
    cumulativePct += item.pct;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg ref={svgRef} viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize}>
        {normalizedData.map((item, idx) => {
          const startAngle = (item.startPct / 100) * Math.PI * 2 - Math.PI / 2;
          const endAngle = ((item.startPct + item.pct) / 100) * Math.PI * 2 - Math.PI / 2;

          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);

          const largeArc = item.pct > 50 ? 1 : 0;

          return (
            <path
              key={idx}
              d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`}
              fill={item.color || "#6366f1"}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{
                transition: "fill 0.3s, transform 0.25s",
                transform: hoverIndex === idx ? "scale(1.05)" : "scale(1)",
                transformOrigin: `${center}px ${center}px`
              }}
            />
          );
        })}
      </svg>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "8px",
        }}
      >
        {normalizedData.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              opacity: hoverIndex === idx ? 1 : 0.7,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: item.color || "#6366f1",
                marginRight: 6,
              }}
            ></span>
            <span style={{ fontSize: "12px", color: "#374151" }}>
              {item.label}: {item.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


// Chart Toggle Switch Component
const ReportsChartToggleSwitch = React.memo(({ chartType, onToggle }) => {
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
    <div className="rp-chart-toggle">
      <span
        className={`material-symbols-outlined ${chartType === "bar" ? "active" : ""}`}
        onClick={() => onToggle("bar")}
      >
        bar_chart
      </span>
      <div 
        ref={switchRef}
        className={`rp-switch ${chartType}`}
        onClick={handleToggle}
        style={{ cursor: 'pointer' }}
      >
        <div ref={knobRef} className="rp-knob"></div>
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

  const reportRef = useRef();

  const downloadPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    window.scrollTo(0, 0);

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save("Habit_Report.pdf");
  };


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
      .slice(0, 5);
  }, [habits, period]);

  const categoryPct = useMemo(() => {
    const colors = {
      health: "#34d399",
      mind: "#60a5fa",
      work: "#60a5fa",
      study: "#fbbf24",
      personal: "#f472b6",
      general: "#a78bfa",
    };
  
    // Normalize habit categories to lowercase
    const normalized = habits.map(h => ({
      ...h,
      category: (h.category || "general").toLowerCase()
    }));
  
    // Count completion per category
    const results = Object.keys(colors).map(cat => {
      const catHabits = normalized.filter(h => h.category === cat);
      const totalHabits = catHabits.length;
  
      if (totalHabits === 0) return { label: cat, rate: 0, color: colors[cat] };
  
      const doneDays = catHabits.reduce((sum, h) => {
        const completed = period.days.filter(d => h.history?.[fmt(d)]).length;
        return sum + completed;
      }, 0);
  
      const rate = Math.round((doneDays / (totalHabits * period.days.length)) * 100);
      return { label: cat, rate, color: colors[cat] };
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
    <div className="reports-root" ref={reportRef}>
      <section className="reports-content">
        {/* Header */}
        <header className="reports-header">
          <div className="rp-controls">
            <div className="rp-seg">
              {["week", "month"].map((m) => (
                <button
                  key={m}
                  className={`rp-seg-btn ${periodMode === m ? "is-active" : ""}`}
                  onClick={() => setPeriodMode(m)}
                >
                  {m === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
            <div className="rp-pager">
              <button onClick={() => setCursor(addDays(period.start, periodMode === "week" ? -7 : -30))}>
                &lt;
              </button>
              <span>
                {periodMode === "week"
                  ? `${period.start.toLocaleDateString("en-GB")} – ${period.end.toLocaleDateString("en-GB")}`                  
                  : period.start.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => setCursor(addDays(period.end, periodMode === "week" ? 7 : 30))}>
                &gt;
              </button>
            </div>
                        <button onClick={downloadPDF} className="download-btn"> 
              <span className="material-symbols-outlined">download</span>
              Export
            </button>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="rp-kpi">
          <ReportsAnimatedCard>
            <div className="rp-kcap">Average Completion</div>
            <div className="rp-kbody">
              <ReportsDonut value={avgCompletion} />
            </div>
          </ReportsAnimatedCard>
          <ReportsAnimatedCard>
            <div className="rp-kcap">Habits Tracked</div>
            <div className="rp-kbig">{habits.length}</div>
            <div className="rp-kfoot">active habits</div>
          </ReportsAnimatedCard>
          <ReportsAnimatedCard>
            <div className="rp-kcap">Longest Streak</div>
            <div className="rp-kbig">{longestStreak}</div>
            <div className="rp-kfoot">across all habits</div>
          </ReportsAnimatedCard>
        </div>

        {/* Chart with toggle - Centered */}
        <div ref={chartRef} className="rp-card rp-chart">
          <div className="rp-card-head" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <h3 style={{ margin: '0 auto', textAlign: 'center' }}>Daily Completion</h3>
            <div style={{ position: 'absolute', right: '20px' }}>
              <ReportsChartToggleSwitch chartType={chartType} onToggle={handleChartTypeToggle} />
            </div>
          </div>
          {chartType === "bar" ? (
            <ReportsBarChart key={periodMode} data={dailyCompletion} periodMode={periodMode} />
          ) : (
            <div className="reports-pie-wrapper">
  <ReportsCategoryPieChart key={periodMode} data={categoryPct} />
</div>

          )}
        </div>

        {/* Two Columns */}
        <div ref={twoColRef} className="rp-twocol">
          <div className="rp-card">
            <div className="rp-card-head">
              <h3>Top 5 Habits</h3>
            </div>
            {topHabits.length > 0 ? (
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Habit</th>
                    <th>Category</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topHabits.slice(0, 5).map((r, index) => (
                    <tr key={`${r.name}-${index}`}>
                      <td>{r.name}</td>
                      <td>{r.category}</td>
                      <td>
                        <span className="rp-pill">{r.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rp-muted empty-state">No habits tracked yet</p>
            )}
          </div>

          <div className="rp-card">
            <div className="rp-card-head">
              <h3>Category Breakdown</h3>
            </div>
            <ul className="rp-list">
  {categoryPct.map((c) => (
    <li key={c.label} className="rp-list-row">
      <span className="rp-cap">{c.label}</span>
      <div className="rp-bar-container">
        <div className="rp-bar-bg">
          <div
            className="rp-bar-fill"
            style={{
              width: `${c.rate}%`,
              backgroundColor: c.rate === 0 ? "#E5E7EB" : c.color,
            }}
          />
        </div>
      </div>
      <span className="rp-rate">{c.rate}%</span>
    </li>
  ))}
  {categoryPct.length === 0 && <li className="rp-muted">No data</li>}
</ul>

          </div>
        </div>
      </section>
    </div>
  );
}