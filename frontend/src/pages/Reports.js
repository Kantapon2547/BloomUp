import React, { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import "./style/Reports.css";
import { createStorage } from "./Habits";

/* Utility Functions */
const storage = createStorage();
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; 
};

const fmtUTCKey = (d) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);

const addDays = (d, n) => atMidnight(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
const startOfMonth = (d) => atMidnight(new Date(d.getFullYear(), d.getMonth(), 1));
const doneOnDay = (habit, date) => {
  const kLocal = fmtLocal(date);
  const kUTC = fmtUTCKey(date);
  return !!(habit?.history?.[kLocal] || habit?.history?.[kUTC]);
};
const pct = (num, den) => (den === 0 ? 0 : Math.round((num / den) * 100));

const startOfWeekMon = (d) => {
  const base = atMidnight(d);
  const day = base.getDay();          
  const offset = (day + 6) % 7;       
  return addDays(base, -offset);
};

const countDoneOnDay = (habitsArr, date) => {
  const key = fmtLocal(date);
  let count = 0;
  for (const h of habitsArr || []) {
    const v = h?.history?.[key] ?? h?.history?.[fmtUTCKey(date)];
    if (v === true || v === 1 || v === "1") count++;
  }
  return count;
};

const allDoneKeys = (habit) => {
  const h = habit?.history || {};
  const keys = new Set();
  for (const k of Object.keys(h)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) keys.add(k);     
    else {
      const d = new Date(k);
      if (!isNaN(d)) keys.add(fmtLocal(d));             
    }
  }
  return Array.from(keys).sort(); 
};

const longestStreakForHabit = (habit) => {
  const keys = allDoneKeys(habit);
  if (!keys.length) return 0;
  const toDate = (s) => new Date(s + "T00:00:00");
  let best = 1, cur = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = toDate(keys[i - 1]);
    const curr = toDate(keys[i]);
    const delta = (curr - prev) / (1000 * 60 * 60 * 24);
    if (delta === 1) cur += 1;
    else if (delta > 1) cur = 1;             
    best = Math.max(best, cur);
  }
  return best;
};

/* ===== Category colors from Habits ===== */
const CATS_LS = "habit-tracker@categories";
const PASTELS_FALLBACK = ["#ff99c8", "#ffac81", "#fcf6bd", "#d0f4de", "#a9def9", "#e4c1f9"];

function loadCategoryColorMap() {
  try {
    const raw = localStorage.getItem(CATS_LS);
    if (!raw) return {};
    const arr = JSON.parse(raw);
    return arr.reduce((m, { name, color }) => {
      if (name && color) m[name.toLowerCase()] = color;
      return m;
    }, {});
  } catch {
    return {};
  }
}

function pickPastelFor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 0xfffffff;
  return PASTELS_FALLBACK[hash % PASTELS_FALLBACK.length];
}

const usePeriod = (periodMode, cursor) =>
  useMemo(() => {
    if (periodMode === "week") {
      const start = startOfWeekMon(cursor);
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

const ReportsAnimatedCard = React.memo(({ children}) => {
  const ref = useRef(null);
  useEffect(() => {                      
    gsap.from(ref.current, { 
      y: 30, opacity: 0, 
      duration: 0.6, ease: "power3.out", 
      scale: 0.95 });
  }, []);

  return (
    <div
      ref={ref}
      className="rp-kcard"
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

const ReportsDonut = React.memo(({ value = 0 }) => {
  const circleRef = useRef(null);
  const textRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const r = 38;
    const c = 2 * Math.PI * r;
    const off = c * (1 - (value / 100));

    if (circleRef.current) {
      gsap.fromTo(
        circleRef.current,
        { strokeDashoffset: c },
        { strokeDashoffset: off, duration: 1.5, ease: "power2.out" }
      );
    }

    const counter = { n: 0 };
    const textTween = gsap.to(counter, {
      n: value,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => {
        if (textRef.current) {
          textRef.current.textContent = Math.round(counter.n) + "%";
        }
      }
    });

    const popTween = containerRef.current
      ? gsap.fromTo(
          containerRef.current,
          { scale: 0, rotate: -180, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: "back.out(1.7)" }
        )
      : null;

    return () => {
      textTween?.kill();
      popTween?.kill();
      if (circleRef.current) gsap.killTweensOf(circleRef.current);
    };
  }, [value]);

  const r = 38;
  const c = 2 * Math.PI * r;

  return (
    <svg ref={containerRef} width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} stroke="#e8f3ec" strokeWidth="10" fill="none" />
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

  const chartData = data ?? [];

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
  }, [chartData]);
  
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

  const svgWidth = Math.max(chartData.length * spacing, 1);

  return (
    <div className="rp-chart-wrapper">
      <svg viewBox={`0 0 ${svgWidth} 180`} className="rp-svgb">
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a8d5ba" />
            <stop offset="100%" stopColor="#7ebb8f" />
          </linearGradient>
        </defs>
        <line x1="0" y1="150" x2={svgWidth} y2="150" stroke="#e8f3ec" strokeWidth="2"/>
        
        {chartData.map((d, i) => {
          const isWeek = periodMode === "week";
          const label = isWeek
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
        <p style={{ fontSize: '48px', margin: '20px 0' }}></p>
        <p>Track habits to see your progress breakdown!</p>
      </div>
    );
  }

  if (normalizedData.length === 1) {
    const item = normalizedData[0];
    const color = item.color;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg ref={svgRef} viewBox={`0 0 ${svgSize} ${svgSize}`} width={svgSize} height={svgSize}>
          <defs>
            <linearGradient id="pieFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle cx={center} cy={center} r={radius} fill="url(#pieFull)" />
        </svg>

        <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center", marginTop:20, padding:"0 20px" }}>
          <div style={{ display:"flex", alignItems:"center", padding:"8px 12px", borderRadius:12, background:"#f0f7f3" }}>
            <span style={{ width:14, height:14, borderRadius:"50%", background: color, marginRight:8, boxShadow:"0 2px 4px rgba(0,0,0,.1)" }} />
            <span style={{ fontSize:14, color:"#2d5f3f", fontWeight:600 }}>
              {item.label}: <strong>100%</strong>
            </span>
          </div>
        </div>
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

const HelpIcon = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="rp-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="material-symbols-outlined rp-help-icon">help</span>
      {open && <span className="rp-tooltip rp-right">{text}</span>}
    </span>
  );
};

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

  useEffect(() => {
    storage.list().then(setHabits).catch(console.error);
  }, []);

  const period = usePeriod(periodMode, cursor);

  const dailyCompletion = useMemo(() => {
    if (!period?.days?.length) return [];
    return period.days.map(d => {
      const done = countDoneOnDay(habits, d);
      const rate = pct(done, habits.length || 1);
      return { dateObj: d, key: fmtLocal(d), done, rate };
    });
  }, [period.days, habits]);

  const avgCompletion = useMemo(() => {
    const sum = dailyCompletion.reduce((a, b) => a + b.rate, 0);
    return Math.round(sum / (dailyCompletion.length || 1));
  }, [dailyCompletion]);

  const longestStreak = useMemo(
    () => habits.reduce((m, h) => Math.max(m, longestStreakForHabit(h)), 0),
    [habits]
  );

  const topHabits = useMemo(() => {
    return habits
      .map((h) => {
        const rate = pct(
          period.days.filter((d) => doneOnDay(h, d)).length,
          period.days.length
        );
        return { name: h.name, category: h.category || "general", rate };
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  }, [habits, period]);

  const categoryPct = useMemo(() => {
    const colorMap = loadCategoryColorMap();       
    const normalized = habits.map(h => ({
      ...h,
      category: (h.category || "general").toLowerCase()
    }));

    const uniqueCats = Array.from(new Set(normalized.map(h => h.category)));

    const results = uniqueCats.map(cat => {
      const catHabits = normalized.filter(h => h.category === cat);
      const totalHabits = catHabits.length;

      if (totalHabits === 0) {
        return { label: cat, rate: 0, color: colorMap[cat] || pickPastelFor(cat) };
      }

      const doneDays = catHabits.reduce((sum, h) => {
        const completed = period.days.filter((d) => doneOnDay(h, d)).length;
        return sum + completed;
      }, 0);

      const rate = Math.round((doneDays / (totalHabits * period.days.length)) * 100);
      return {
        label: cat,
        rate,
        color: colorMap[cat] || pickPastelFor(cat) 
      };
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
    if (longestStreak >= 30) return "Epic streak! You're unstoppable!";
    if (longestStreak >= 14) return "Amazing consistency!";
    if (longestStreak >= 7) return "Week streak! Nice work!";
    return "Start building your streak today!";
  };

  const downloadPDF = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      const accountName =
        localStorage.getItem("bloomup@displayName") ||
        localStorage.getItem("user@displayName") ||
        localStorage.getItem("profile_name") ||
        "BloomUp User";

      let y = margin;
      let page = 1;

      // ---------- helpers (with spacing fixes) ----------
      const addSectionHeader = (title, gapTop = true) => {
        if (gapTop) y += 12;                
        const barH = 10;
        pdf.setFillColor(45, 95, 63);
        pdf.rect(margin, y, contentWidth, barH, "F");

        pdf.setFontSize(12);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(title, margin + 4, y + barH - 3); 

        y += barH + 8;                       
        pdf.setTextColor(60, 60, 60);      
        pdf.setFont(undefined, "normal");
      };

      const addSubHeader = (title) => {
        y += 2; 
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(45, 95, 63);
        pdf.text(title, margin, y);
        y += 6; 
        pdf.setTextColor(60, 60, 60);
        pdf.setFont(undefined, "normal");
      };

      const addText = (text, size = 10, indent = 0) => {
        pdf.setFontSize(size);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        pdf.text(lines, margin + indent, y);
        y += lines.length * 5 + 2;
      };

      const drawTable = (rows, colWidths) => {
        pdf.setLineWidth(0.2);
        pdf.setDrawColor(210, 210, 210);
        pdf.setTextColor(60, 60, 60);

        const rowH = 8;
        rows.forEach((row, rIdx) => {
          let x = margin;
          pdf.setFont(undefined, rIdx === 0 ? "bold" : "normal");
          pdf.setFontSize(9);

          row.forEach((cell, i) => {
            const w = colWidths[i];
            const text = String(cell ?? "");
            const lines = pdf.splitTextToSize(text, w - 4);
            pdf.text(lines, x + 2, y + 4.8);
            pdf.rect(x, y, w, rowH, "S");
            x += w;
          });
          y += rowH;
        });

        y += 6;
        pdf.setTextColor(60, 60, 60);
        pdf.setFont(undefined, "normal");
      };

      const nextPage = () => {
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        page++;
        pdf.addPage();
        y = margin + 4; 
      };

      const need = (h) => {
        if (y + h > pageHeight - margin - 15) nextPage();
      };

      const lineChart = (data, title, h = 60) => {
        need(h + 40);

        // Title
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(45, 95, 63);
        pdf.text(title, margin, y);
        y += 8;

        const w = contentWidth;
        const y0 = y;
        const y1 = y0 + h;

        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.2);
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        for (let i = 0; i <= 4; i++) {
          const gy = y0 + (i * h) / 4;
          pdf.line(margin, gy, margin + w, gy);
          pdf.text(`${100 - i * 25}%`, margin - 12, gy + 2);
        }

        pdf.setDrawColor(180, 180, 180);
        pdf.line(margin, y0, margin, y1); 
        pdf.line(margin, y1, margin + w, y1); 

        pdf.setFontSize(10);
        pdf.setFont(undefined);
        pdf.setTextColor(60, 60, 60);
        pdf.text("Y", margin + 0.5, y0 - 2);
        pdf.text("X", margin + w + 4, y1 + 2);

        // Line data
        pdf.setDrawColor(45, 95, 63);
        pdf.setLineWidth(1);
        const step = w / Math.max(data.length - 1, 1);
        for (let i = 0; i < data.length - 1; i++) {
          const x1 = margin + i * step;
          const x2 = margin + (i + 1) * step;
          const p1 = y0 + h - (data[i].rate / 100) * h;
          const p2 = y0 + h - (data[i + 1].rate / 100) * h;
          pdf.line(x1, p1, x2, p2);
          pdf.circle(x1, p1, 1, "F");
        }

        // last dot
        if (data.length) {
          const lx = margin + (data.length - 1) * step;
          const ly = y0 + h - (data[data.length - 1].rate / 100) * h;
          pdf.circle(lx, ly, 1.5, "F");
        }

        // X tick labels
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        const every = Math.max(1, Math.floor(data.length / 7));
        data.forEach((d, i) => {
          if (i % every === 0 || i === data.length - 1) {
            const x = margin + i * step;
            const label =
              periodMode === "week"
                ? d.dateObj.toLocaleDateString("en-US", { weekday: "short" })
                : d.dateObj.getDate();
            pdf.text(String(label), x, y1 + 6, { align: "center" });
          }
        });

        // Axis titles
        pdf.setFontSize(9);
        pdf.setFont(undefined, "bold");
        pdf.text("Days", margin + w / 2, y1 + 12, { align: "center" });
        pdf.text("Y: Completion Rate (%)", margin - 18, y0 + h / 2, {
          angle: 90,
          align: "center",
        });

        y = y1 + 18;
        addText(
          "X-axis = days, Y-axis = daily completion rate (0–100%). Use this to check consistency.",
          9
        );
      };

      // bar chart (axes + custom explanation)
      const barChart = (data, title, h = 45, expl) => {
        need(h + 40);

        // Title
        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(45, 95, 63);
        pdf.text(title, margin, y);
        y += 8;

        const y0 = y;
        const y1 = y0 + h;
        const barW = Math.min(15, contentWidth / (data.length * 1.5));
        const step = contentWidth / Math.max(data.length, 1);

        // Axes
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y0, margin, y1);
        pdf.line(margin, y1, margin + contentWidth, y1); 

        pdf.setFontSize(10);
        pdf.setFont(undefined);
        pdf.setTextColor(60, 60, 60);
        pdf.text("Y", margin + 0.5, y0 - 2);
        pdf.text("X", margin + contentWidth + 4, y1 + 2);

        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.setDrawColor(230, 230, 230);
        for (let i = 0; i <= 4; i++) {
          const gy = y0 + (i * h) / 4;
          const val = 100 - i * 25;
          pdf.line(margin, gy, margin + contentWidth, gy);
          pdf.text(`${val}%`, margin - 12, gy + 2);
        }

        // Bars
        data.forEach((it, i) => {
          const hh = (it.value / 100) * h;
          const x = margin + i * step + (step - barW) / 2;
          const yy = y0 + h - hh;

          pdf.setFillColor(126, 187, 143);
          pdf.rect(x, yy, barW, hh, "F");

          pdf.setFontSize(8);
          pdf.setTextColor(60, 60, 60);
          pdf.text(`${it.value}%`, x + barW / 2, yy - 2, { align: "center" });

          const label =
            (it.label || "").length > 10
              ? it.label.slice(0, 9) + "…"
              : it.label || "";
          pdf.text(label, x + barW / 2, y1 + 5, { align: "center" });
        });

        // Axis titles
        pdf.setFontSize(9);
        pdf.setFont(undefined, "bold");
        pdf.text("Categories", margin + contentWidth / 2, y1 + 12, {
          align: "center",
        });
        pdf.text("Y: Completion Rate (%)", margin - 18, y0 + h / 2, {
          angle: 90,
          align: "center",
        });

        y = y1 + 18;
        addText(
          expl ||
            "X-axis = categories, Y-axis = completion rate per category (0–100%). This shows focus areas.",
          9
        );
      };

      // ========== COVER ==========
      pdf.setDrawColor(45, 95, 63);
      pdf.setLineWidth(2);
      pdf.rect(margin - 5, margin - 5, contentWidth + 10, 60, "S");

      pdf.setFontSize(24);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(45, 95, 63);
      pdf.text("HABIT PERFORMANCE", pageWidth / 2, 35, { align: "center" });
      pdf.text("ANALYSIS REPORT", pageWidth / 2, 47, { align: "center" });

      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(80, 80, 80);
      const periodText =
        periodMode === "week"
          ? `Weekly Report: ${fmtLocal(period.start)} - ${fmtLocal(period.end)}`
          : `Monthly Report: ${period.start.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
      pdf.text(periodText, margin, 62);
      pdf.text(`Account: ${accountName}`, margin, 68);

      // Executive summary box
      y = 90;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, y, contentWidth, 50, "S");
      y += 10;

      const summary = [
        `Reporting Period: ${period.days.length} days (${fmtLocal(period.start)} to ${fmtLocal(period.end)})`,
        `Total Habits Tracked: ${habits.length}`,
        `Average Completion Rate: ${avgCompletion}%`,
        `Best Streak: ${longestStreak} days`,
        `Total Completions: ${dailyCompletion.reduce((s, d) => s + d.done, 0)}`,
      ];
      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(60, 60, 60);
      summary.forEach((t) => { pdf.text(t, margin + 5, y); y += 6; });

      nextPage();

      // ========== PAGE 1: PERFORMANCE METRICS ==========
      addSectionHeader("1. PERFORMANCE METRICS", false);

      const changePct = (prevAvg && prevAvg > 0) ? Math.round(((avgCompletion - prevAvg) / prevAvg) * 100) : null;
      const metrics = [
        ["Metric", "Current Value", "Previous Period", "Change"],
        ["Completion Rate", `${avgCompletion}%`, prevAvg ? `${prevAvg}%` : "N/A", changePct == null ? "N/A" : `${changePct >= 0 ? "+" : ""}${changePct}%`],
        ["Total Habits", `${habits.length}`, "N/A", "N/A"],
        ["No-Activity Days (0%)", `${dailyCompletion.filter((d) => d.rate === 0).length}`, "N/A", "N/A"],
        ["Best Streak (days)", `${longestStreak}`, "N/A", "N/A"],
      ];
      drawTable(metrics, [70, 35, 35, 30]);

      if (dailyCompletion.length) {
        lineChart(dailyCompletion, periodMode === "week" ? "Daily Completion Trend (Week)" : "Daily Completion Trend (Month)", 60);
      }

      addSubHeader("Statistical Summary");
      const rates = dailyCompletion.map((d) => d.rate);
      const mean = avgCompletion;
      const minR = rates.length ? Math.min(...rates) : 0;
      const maxR = rates.length ? Math.max(...rates) : 0;
      const variance = rates.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (rates.length || 1);
      const stdDev = Math.sqrt(variance);
      addText(
        `In simple terms: your average daily completion this period was ${mean}%. Your lowest day was ${minR}% and your best day was ${maxR}%. Overall you ${stdDev < 20 ? "kept a steady rhythm" : "had some ups and downs"}.`,
        9
      );
      addText(
        periodMode === "week"
          ? "What this tells you: pick one or two weak days from the chart and create a smaller version of your hardest habit for those days."
          : "What this tells you: look for long flat lines near 0% and set a tiny daily floor (e.g., 1 minute) to reduce zero days.",
        9
      );

      nextPage();

      // ========== PAGE 2: HABIT & CATEGORY ==========
      addSectionHeader("2. HABIT PERFORMANCE ANALYSIS", false);

      const top = [...topHabits].slice(0, 10);
      if (top.length) {
        const t = [["Rank", "Habit Name", "Category", "Completion Rate"]];
        top.forEach((h, i) => t.push([`${i + 1}`, h.name.length > 30 ? h.name.slice(0, 27) + "..." : h.name, h.category, `${h.rate}%`]));
        drawTable(t, [20, 80, 40, 30]);
      } else {
        addText("No habit data available for analysis.");
      }

      y += 2;
      addSectionHeader("3. CATEGORY DISTRIBUTION");
      const activeCats = categoryPct.filter((c) => c.rate > 0).sort((a, b) => b.rate - a.rate);
      if (activeCats.length) {
        const catTable = [["Category", "Completion Rate", "Number of Habits"]];
        activeCats.forEach((c) => {
          const label = c.label.charAt(0).toUpperCase() + c.label.slice(1);
          const num = habits.filter((h) => (h.category || "general").toLowerCase() === c.label).length;
          catTable.push([label, `${c.rate}%`, `${num}`]);
        });
        drawTable(catTable, [60, 35, 35]);

        const catChartData = activeCats.map((c) => ({ label: c.label.charAt(0).toUpperCase() + c.label.slice(1), value: c.rate }));
        barChart(
          catChartData,
          "Category Completion Rates",
          45,
          "X-axis = categories, Y-axis = completion rate for each category (0–100%). This shows where you focused most."
        );
      } else {
        addText("No category data available for analysis.");
      }

      nextPage();

      // ========== PAGE 3: BEHAVIOR ==========
      addSectionHeader("4. BEHAVIORAL PATTERNS", false);

      // 4.1 Day-of-week pattern
      addSubHeader("4.1 Weekly Pattern Analysis");
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const bucket = {};
      dailyCompletion.forEach((d) => {
        const k = d.dateObj.getDay();
        bucket[k] = bucket[k] || { sum: 0, n: 0 };
        bucket[k].sum += d.rate; bucket[k].n += 1;
      });
      const dow = Object.keys(bucket)
        .map((k) => ({ i: +k, name: dayNames[+k], avg: Math.round(bucket[k].sum / bucket[k].n) }))
        .sort((a, b) => a.i - b.i);

      if (dow.length) {
        const t2 = [["Day of Week", "Average Rate"]];
        dow.forEach((d) => t2.push([d.name, `${d.avg}%`]));
        drawTable(t2, [80, 80]);

        const dowChart = dow.map((d) => ({ label: d.name.slice(0, 3), value: d.avg }));
        barChart(
          dowChart,
          "Completion Rate by Day of Week",
          45,
          "X-axis = days of week (Sun–Sat), Y-axis = average completion for those days (0–100%). This shows strong and weak weekdays."
        );
      }

      // 4.2 Consistency
      addSubHeader("4.2 Consistency Overview");
      addText("Quick take: aim for fewer 0% days and a steadier middle-to-high range. If one weekday is always low, try an easier version of your habits on that day.", 9);

      // 4.3 Trend vs previous period (week-to-week or month-to-month)
      addSubHeader("4.3 Trend Analysis (Compared with Last Period)");
      const delta = prevAvg == null ? null : Math.round(avgCompletion - prevAvg);
      addText(
        prevAvg == null
          ? "There’s no previous period stored yet, so we can’t compare."
          : delta > 0
          ? `Improved by ${delta}% compared with the previous period — nice progress!`
          : delta < 0
          ? `Decreased by ${Math.abs(delta)}% compared with the previous period — review what changed and adjust.`
          : "Same as the previous period — stable performance.",
        9
      );

      nextPage();

      // ========== PAGE 4: CONCLUSION ==========
      addSectionHeader("5. CONCLUSION", false);
      const conclusion =
        avgCompletion >= 70
          ? `Strong overall performance at ${avgCompletion}%. Keep your current approach and watch for small dips.`
          : avgCompletion >= 40
          ? `Moderate performance at ${avgCompletion}%. A few small changes can lift your average — keep building steady days.`
          : `Current performance is ${avgCompletion}%. Focus on showing up daily and keeping habits small and simple to rebuild momentum.`;
      addText(conclusion);

      y += 6;
      // addSubHeader("Report Metadata");
      const meta = [
        `Report Type: ${periodMode === "week" ? "Weekly" : "Monthly"} Performance Analysis`,
        `Reporting Period: ${fmtLocal(period.start)} to ${fmtLocal(period.end)} (${period.days.length} days)`,
        `Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        `Account: ${accountName}`,
      ];

      const metaHeight = meta.length * 4 + 2;
      y = pageHeight - margin - metaHeight;
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      meta.forEach((m) => { pdf.text(m, margin, y); y += 4; });

      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      const fileName = `Habit-Performance-Report-${periodMode === "week" ? "Weekly" : "Monthly"}-${fmtLocal(new Date())}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("Failed to generate PDF. Please try again.");
    }
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
                    if (m === "week") setCursor(c => startOfWeekMon(c));
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
              <button onClick={() => {
                        const base = periodMode === "week" ? startOfWeekMon(cursor) : cursor;
                        setCursor(addDays(base, periodMode === "week" ? -7 : -30));
                      }}
                    >
                      &lt;
              </button>
              <span>
                {periodMode === "week"
                  ? `${period.start.toLocaleDateString("en-GB")} – ${period.end.toLocaleDateString("en-GB")}`
                  : period.start.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => {
                        const base = periodMode === "week" ? startOfWeekMon(cursor) : cursor;
                        setCursor(addDays(base, periodMode === "week" ? 7 : 30));
                      }}
                      disabled={
                        (() => {
                          const today = atMidnight(new Date());
                          const nextPeriodStart =
                            periodMode === "week"
                              ? addDays(startOfWeekMon(cursor), 7)
                              : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                          return nextPeriodStart > today; 
                        })()
                      }
                      style={{
                        opacity:
                          (() => {
                            const today = atMidnight(new Date());
                            const nextPeriodStart =
                              periodMode === "week"
                                ? addDays(startOfWeekMon(cursor), 7)
                                : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                            return nextPeriodStart > today ? 0.4 : 1;
                          })(),
                        pointerEvents:
                          (() => {
                            const today = atMidnight(new Date());
                            const nextPeriodStart =
                              periodMode === "week"
                                ? addDays(startOfWeekMon(cursor), 7)
                                : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                            return nextPeriodStart > today ? "none" : "auto";
                          })(),
                      }}                      
                    >
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
            <div className="rp-help-corner">
              <HelpIcon text="Average habit completion rate for this period" />
            </div>

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
            <div className="rp-help-corner">
              <HelpIcon text="Total habits you're tracking this period" />
            </div>
            <div className="rp-kcap">Habits Tracked</div>
            <div className="rp-kbig">{habits.length}</div>
            <div className="rp-kfoot">
              {habits.length === 0
                ? "No active habits yet"
                : `Active ${habits.length === 1 ? "habit" : "habits"}`}
            </div>
          </ReportsAnimatedCard>

          <ReportsAnimatedCard dataHigh={longestStreak >= 7}>
            <div className="rp-help-corner">
              <HelpIcon text="The best streak of all times" />
            </div>
            <div className="rp-kcap">Longest Streak</div>
            <div className="rp-kbig">{longestStreak}</div>
            <div className="rp-kfoot">{getStreakMessage()}</div>
          </ReportsAnimatedCard>
        </div>

        {/* Chart Section */}
        <div ref={chartRef} className="rp-card rp-chart">
          <div
            className="rp-card-head"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "20px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <HelpIcon
                text={
                  chartType === "bar"
                    ? "The bar chart show completion rate per day (0–100%)."
                    : "The pie chart shows the proportion of completions across the categories"
                }
              />
            </div>

            <h3 style={{ margin: "0 auto", textAlign: "center" }}>Daily Completion</h3>

            <div style={{ position: "absolute", right: "20px" }}>
              <ReportsChartToggleSwitch
                chartType={chartType}
                onToggle={handleChartTypeToggle}
              />
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
            <div className="rp-card-head"><h3>🏆 Top 5 Habits</h3></div>

            {topHabits.length ? (
              <div className="rp-top5">
                    <div className="rp-top5-head">
                      <span>Habit</span>
                      <span>Category</span>
                      <span>Rate</span>
                    </div>
                  {topHabits.slice(0, 5).map((h, i) => (
                    <div key={`${h.name}-${i}`} className="rp-top5-row">
                      <div className="rp-name">
                        <span className="rp-medal">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="rp-name__title">{h.name}</span>
                      </div>
                      <div className="rp-cat">{h.category}</div>
                      <div className="rp-badge">{h.rate}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rp-empty-state">
                  <span style={{ fontSize: 48 }}>
                    </span> Track habits to see leaders here.
                </p>
              )}
            </div>

          <div className="rp-card">
            <div className="rp-card-head"><h3>📊 Category Breakdown</h3></div>
            <div className="rp-catlist">
              {categoryPct.map((c) => (
                <div key={c.label} className="rp-cat-row">
                  <div className="rp-cat-name">{c.label}</div>
                  <div className="rp-catbar">
                    <div
                      className="rp-catbar__fill"
                      style={{
                        width: `${c.rate}%`,
                        background: c.color || "#a8d5ba"
                      }}
                    />
                  </div>
                  <div className="rp-cat-pct">{c.rate}%</div>
                </div>
              ))}
            </div>
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