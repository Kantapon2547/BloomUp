import React, { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import "./style/Reports.css";
import { createStorage } from "./Habits";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* Utility Functions */
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

/* Custom Hooks */
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

/* Animation Helper */
const fadeIn = (targets, opts = {}) => {
  gsap.fromTo(
    targets,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "power3.out", ...opts }
  );
};


const celebrate = (element) => {
  const colors = ['#a8d5ba', '#ffd4a3', '#c9b7eb', '#ffb3c1'];
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.pointerEvents = 'none';
    element.appendChild(particle);
    
    gsap.to(particle, {
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      opacity: 0,
      duration: 1 + Math.random(),
      ease: "power2.out",
      onComplete: () => particle.remove()
    });
  }
};

/* Reusable Components */
const ReportsAnimatedCard = React.memo(({ children, dataHigh }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    gsap.from(ref.current, { 
      y: 30, 
      opacity: 0, 
      duration: 0.6, 
      ease: "power3.out",
      scale: 0.95
    });

    if (dataHigh && ref.current) {
      setTimeout(() => celebrate(ref.current), 300);
    }
  }, [dataHigh]);

  return (
    <div
      ref={ref}
      className="rp-kcard"
      data-high={dataHigh}
      onMouseEnter={() =>
        gsap.to(ref.current, { 
          y: -8, 
          scale: 1.02,
          boxShadow: "0 10px 30px rgba(126, 187, 143, 0.3)", 
          duration: 0.3,
          ease: "power2.out"
        })
      }
      onMouseLeave={() =>
        gsap.to(ref.current, { 
          y: 0, 
          scale: 1,
          boxShadow: "0 4px 15px rgba(126, 187, 143, 0.15)", 
          duration: 0.3,
          ease: "power2.out"
        })
      }
    >
      {children}
    </div>
  );
});

const ReportsDonut = React.memo(({ value }) => {
  const circleRef = useRef(null);
  const textRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const r = 38;
    const c = 2 * Math.PI * r;
    const off = c * (1 - value / 100);

    gsap.fromTo(
      circleRef.current,
      { strokeDashoffset: c },
      { 
        strokeDashoffset: off, 
        duration: 1.5, 
        ease: "power2.out" 
      }
    );

    gsap.fromTo(
      textRef.current,
      { textContent: 0 },
      {
        textContent: value,
        duration: 1.5,
        ease: "power2.out",
        snap: { textContent: 1 },
        onUpdate: function() {
          textRef.current.textContent = Math.round(this.targets()[0].textContent) + '%';
        }
      }
    );

    gsap.fromTo(
      containerRef.current,
      { scale: 0, rotate: -180 },
      { 
        scale: 1, 
        rotate: 0,
        duration: 0.8, 
        delay: 0.2,
        ease: "back.out(1.7)" 
      }
    );
  }, [value]);

  const r = 38;
  const c = 2 * Math.PI * r;

  return (
    <svg ref={containerRef} width="120" height="120" viewBox="0 0 100 100">
      <circle 
        cx="50" 
        cy="50" 
        r={r} 
        stroke="#e8f3ec" 
        strokeWidth="10" 
        fill="none" 
      />
      <circle
        ref={circleRef}
        cx="50"
        cy="50"
        r={r}
        stroke="url(#gradient)"
        strokeWidth="10"
        fill="none"
        strokeDasharray={c}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7ebb8f" />
          <stop offset="100%" stopColor="#a8d5ba" />
        </linearGradient>
      </defs>
      <text
        ref={textRef}
        x="50"
        y="56"
        textAnchor="middle"
        fontWeight="900"
        fontSize="20"
        fill="#2d5f3f"
      >
        0%
      </text>
    </svg>
  );
});

const ReportsBarChart = React.memo(({ data, periodMode }) => {
  const barsRef = useRef([]);
  const numbersRef = useRef([]);
  const [hovered, setHovered] = useState(null);

  const barWidth = periodMode === "week" ? 24 : 16;
  const spacing = periodMode === "week" ? 40 : 28;

  useEffect(() => {
    gsap.fromTo(
      barsRef.current,
      { 
        scaleY: 0, 
        transformOrigin: "bottom",
        opacity: 0 
      },
      { 
        scaleY: 1, 
        opacity: 1,
        duration: 0.8, 
        stagger: 0.08, 
        ease: "elastic.out(1, 0.5)" 
      }
    );
  }, [data]);
  
  useEffect(() => {
    numbersRef.current.forEach((el, idx) => {
      if (!el) return;
      gsap.to(el, {
        opacity: hovered === idx ? 1 : 0,
        y: hovered === idx ? 0 : -5,
        scale: hovered === idx ? 1.1 : 0.8,
        duration: 0.3,
        ease: "back.out(2)",
      });
    });
  }, [hovered]);

  return (
    <div className="rp-chart-wrapper">
      <svg viewBox={`0 0 ${data.length * spacing} 180`} className="rp-svgb">
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a8d5ba" />
            <stop offset="100%" stopColor="#7ebb8f" />
          </linearGradient>
        </defs>
        <line x1="0" y1="150" x2={data.length * spacing} y2="150" stroke="#e8f3ec" strokeWidth="2"/>
        {data.map((d, i) => {
          const label =
            periodMode === "week"
              ? d.dateObj.toLocaleDateString("en-US", { weekday: "short" })
              : d.dateObj.getDate();
          
          const barHeight = Math.max(d.rate * 1.2, 8);

          return (
            <g
              key={d.key}
              transform={`translate(${i * spacing}, 0)`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                ref={(el) => (barsRef.current[i] = el)}
                x="0"
                y={150 - barHeight}
                width={barWidth}
                height={barHeight}
                rx="6"
                fill="url(#barGradient)"
                opacity="0.9"
                style={{
                  filter: hovered === i ? 'drop-shadow(0 4px 8px rgba(126, 187, 143, 0.4))' : 'none',
                  transition: 'filter 0.3s ease'
                }}
              />
              <text 
                x={barWidth / 2} 
                y="168" 
                textAnchor="middle" 
                fontSize="11" 
                fill="#5a8266"
                fontWeight="500"
              >
                {label}
              </text>
              <text
                ref={(el) => (numbersRef.current[i] = el)}
                x={barWidth / 2}
                y={150 - barHeight - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#7ebb8f"
                fontWeight="600"
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

  const radius = 60;
  const center = 75;
  const svgSize = 150;

  useEffect(() => {
    gsap.fromTo(
      svgRef.current,
      { opacity: 0, scale: 0, rotate: -180 },
      { 
        opacity: 1, 
        scale: 1, 
        rotate: 0,
        duration: 0.8, 
        ease: "back.out(1.5)" 
      }
    );
  }, [data]);

  if (total === 0) {
    return (
      <div className="rp-empty-state">
        <p style={{ fontSize: '48px', margin: '20px 0' }}>📊</p>
        <p>Track habits to see your progress breakdown!</p>
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
        <defs>
          {normalizedData.map((item, idx) => (
            <linearGradient key={idx} id={`pieGradient${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={item.color} />
              <stop offset="100%" stopColor={item.color} stopOpacity="0.7" />
            </linearGradient>
          ))}
        </defs>
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
              fill={`url(#pieGradient${idx})`}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoverIndex === idx ? 'scale(1.08)' : 'scale(1)',
                transformOrigin: `${center}px ${center}px`,
                filter: hoverIndex === idx ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' : 'none',
                cursor: 'pointer'
              }}
            />
          );
        })}
      </svg>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "20px",
          padding: '0 20px'
        }}
      >
        {normalizedData.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              opacity: hoverIndex === null || hoverIndex === idx ? 1 : 0.5,
              transition: 'opacity 0.3s ease',
              padding: '8px 12px',
              borderRadius: '12px',
              background: hoverIndex === idx ? '#f0f7f3' : 'transparent'
            }}
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: item.color,
                marginRight: 8,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            ></span>
            <span style={{ 
              fontSize: "14px", 
              color: "#2d5f3f",
              fontWeight: '600'
            }}>
              {item.label}: <strong>{item.pct.toFixed(0)}%</strong>
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

    if (knobRef.current) {
      gsap.to(knobRef.current, {
        x: newType === "pie" ? 32 : 0,
        duration: 0.4,
        ease: "back.out(2)"
      });
    }
  };

  return (
    <div className="rp-chart-toggle">
      <span
        className={`material-symbols-outlined ${chartType === "bar" ? "active" : ""}`}
        onClick={() => onToggle("bar")}
        style={{ cursor: 'pointer' }}
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
        style={{ cursor: 'pointer' }}
      >
        pie_chart
      </span>
    </div>
  );
});

/* Main Component */
export default function Reports() {
  const [habits, setHabits] = useState([]);
  const [periodMode, setPeriodMode] = useState("week");
  const [cursor, setCursor] = useState(new Date());
  const [chartType, setChartType] = useState("bar");
  const [prevAvg, setPrevAvg] = useState(null);

  const chartRef = useRef();
  const twoColRef = useRef();
  const reportRef = useRef();

  const downloadPDF = async () => {
    const input = reportRef.current;
    if (!input) return;
    
    const btn = document.querySelector('.download-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Generating...';
    btn.disabled = true;
    
    window.scrollTo(0, 0);
    
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 10;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("Habit_Report.pdf");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
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
      health: "#a8d5ba",
      mind: "#b8d4e8",
      work: "#c9b7eb",
      study: "#ffd4a3",
      personal: "#ffb3c1",
      general: "#d4c5e8",
    };

    const normalized = habits.map(h => ({
      ...h,
      category: (h.category || "general").toLowerCase()
    }));
  
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
    const saved = localStorage.getItem("prevAvg");
    if (saved) setPrevAvg(parseFloat(saved));
    localStorage.setItem("prevAvg", avgCompletion);
  }, [avgCompletion]);
  
  const changePct = prevAvg ? Math.round(((avgCompletion - prevAvg) / prevAvg) * 100) : null;

  useEffect(() => {
    fadeIn([chartRef.current, ...twoColRef.current?.children]);
  }, [periodMode, cursor, chartType]);

  const getMotivationalMessage = () => {
    if (avgCompletion >= 80) return "🌟 Outstanding! You're crushing it!";
    if (avgCompletion >= 60) return "🚀 Great momentum! Keep it up!";
    if (avgCompletion >= 40) return "💪 You're making progress! Stay strong!";
    return "🌱 Every small step counts. You got this!";
  };

  const getStreakMessage = () => {
    if (longestStreak >= 30) return "🔥 Epic streak! You're unstoppable!";
    if (longestStreak >= 14) return "⚡ Amazing consistency!";
    if (longestStreak >= 7) return "✨ Week streak! Nice work!";
    return "💎 Start building your streak today!";
  };

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
                  onClick={() => {
                    setPeriodMode(m);
                    gsap.fromTo('.rp-seg-btn.is-active', 
                      { scale: 0.95 }, 
                      { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 }
                    );
                  }}
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
              Export PDF
            </button>
          </div>
        </header>

        <p className="rp-motto">{getMotivationalMessage()}</p>

        {/* KPI Cards */}
        <div className="rp-kpi">
          <ReportsAnimatedCard dataHigh={avgCompletion > 70}>
            <div className="rp-kcap">Average Completion</div>
            <div className="rp-kbody">
              <ReportsDonut value={avgCompletion} />
            </div>
            {changePct !== null && (
              <div className={`rp-kchange ${changePct >= 0 ? "up" : "down"}`}>
                {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct)}% from last period
              </div>
            )}
          </ReportsAnimatedCard>

          <ReportsAnimatedCard>
            <div className="rp-kcap">Habits Tracked</div>
            <div className="rp-kbig">{habits.length}</div>
            <div className="rp-kfoot">Active habits</div>
          </ReportsAnimatedCard>

          <ReportsAnimatedCard dataHigh={longestStreak >= 7}>
            <div className="rp-kcap">Longest Streak</div>
            <div className="rp-kbig">{longestStreak}</div>
            <div className="rp-kfoot">{getStreakMessage()}</div>
          </ReportsAnimatedCard>
        </div>

        {/* Chart Section */}
        <div ref={chartRef} className="rp-card rp-chart">
          <div className="rp-card-head" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <h3 style={{ margin: '0 auto', textAlign: 'center' }}>Daily Completion</h3>
            <div style={{ position: 'absolute', right: '20px' }}>
              <ReportsChartToggleSwitch chartType={chartType} onToggle={handleChartTypeToggle} />
            </div>
          </div>
          {chartType === "bar" ? (
            <ReportsBarChart key={`${periodMode}-${cursor}`} data={dailyCompletion} periodMode={periodMode} />
          ) : (
            <div className="reports-pie-wrapper">
              <ReportsCategoryPieChart key={`${periodMode}-${cursor}`} data={categoryPct} />
            </div>
          )}
        </div>

        {/* Two Columns */}
        <div ref={twoColRef} className="rp-twocol">
          <div className="rp-card">
            <div className="rp-card-head">
              <h3>🏆 Top 5 Habits</h3>
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
                      <td>
                        {index === 0 && '🥇'} 
                        {index === 1 && '🥈'} 
                        {index === 2 && '🥉'} 
                        {r.name}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                      <td>
                        <span className="rp-pill">{r.rate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rp-empty-state">
                <span style={{ fontSize: '48px' }}>📈</span>
                <p>Start tracking habits to see your top performers!</p>
              </p>
            )}
          </div>

          <div className="rp-card">
            <div className="rp-card-head">
              <h3>📊 Category Breakdown</h3>
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
                          background: c.rate === 0 ? "#e8f3ec" : c.color,
                        }}
                      />
                    </div>
                  </div>
                  <span className="rp-rate">{c.rate}%</span>
                </li>
              ))}
              {categoryPct.length === 0 && (
                <li className="rp-empty-state">
                  <span style={{ fontSize: '48px' }}>🎯</span>
                  <p>No data yet - start your journey!</p>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Motivational Summary */}
        <p className="rp-summary">
          {avgCompletion >= 80
            ? "🎉 Incredible work! You're a habit master!"
            : avgCompletion >= 60
            ? "💫 You're on fire! Keep this energy going!"
            : avgCompletion >= 40
            ? "🌿 Steady progress! Every day makes a difference!"
            : "🌱 Rome wasn't built in a day. Keep showing up!"}
        </p>
      </section>
    </div>
  );
}