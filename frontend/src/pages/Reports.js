import React, { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import "./style/Reports.css";
import { createStorage } from "../services/habitStorage";
import { useSharedTasks } from "./SharedTaskContext";

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

const API =
  process.env.REACT_APP_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

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
    <svg 
    ref={containerRef} 
    width="120" 
    height="120" 
    viewBox="0 0 100 100"
    >
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
        <linearGradient 
        id="gradient" 
        x1="0%" 
        y1="0%" 
        x2="100%"
        y2="100%"
        >
          <stop 
          offset="0%" 
          stopColor="#7ebb8f" 
          />
          <stop 
          offset="100%" 
          stopColor="#a8d5ba" 
          />
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
          <linearGradient 
          id="barGradient" 
          x1="0%" 
          y1="0%" 
          x2="0%" 
          y2="100%"
          >
            <stop 
            offset="0%" 
            stopColor="#a8d5ba" 
            />
            <stop 
            offset="100%" 
            stopColor="#7ebb8f" 
            />
          </linearGradient>
        </defs>
        <line 
        x1="0" 
        y1="150" 
        x2={svgWidth} 
        y2="150" 
        stroke="#e8f3ec" 
        strokeWidth="2"
        />
        
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
      { 
        opacity: 0, 
        scale: 0, 
        rotate: -180 
      },
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
        <p style={{ 
          fontSize: '48px', 
          margin: '20px 0' 
          }}>           
          </p>
        <p>Track habits to see your progress breakdown!</p>
      </div>
    );
  }

  if (normalizedData.length === 1) {
    const item = normalizedData[0];
    const color = item.color;
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center" 
        }}
        >
        <svg 
        ref={svgRef} 
        viewBox={`0 0 ${svgSize} ${svgSize}`} 
        width={svgSize} height={svgSize}
        >
          <defs>
            <linearGradient 
            id="pieFull" 
            x1="0%" 
            y1="0%" 
            x2="100%" 
            y2="100%"
            >
              <stop 
              offset="0%" 
              stopColor={color} 
              />
              <stop 
              offset="100%" 
              stopColor={color} 
              stopOpacity="0.7" 
              />
            </linearGradient>
          </defs>
          <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="url(#pieFull)" 
          />
        </svg>

        <div style={{ 
          display:"flex", 
          flexWrap:"wrap", 
          justifyContent:"center", 
          marginTop:20, 
          padding:"0 20px" 
          }}
          >
          <div style={{ 
            display:"flex", 
            alignItems:"center", 
            padding:"8px 12px", 
            borderRadius:12, 
            background:"#f0f7f3" 
            }}
            >
            <span 
            style={{ 
              width:14, 
              height:14, 
              borderRadius:"50%", 
              background: color, 
              marginRight:8, 
              boxShadow:"0 2px 4px rgba(0,0,0,.1)" 
              }} 
              />
            <span 
            style={{ 
              fontSize:14, 
              color:"#2d5f3f", 
              fontWeight:600 
              }}
              >
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
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center" 
      }}
      >
      <svg 
      ref={svgRef} 
      viewBox={`0 0 ${svgSize} ${svgSize}`}
       width={svgSize} height={svgSize}>
        <defs>
          {normalizedData.map((item, idx) => (
            <linearGradient 
            key={idx} 
            id={`pieGradient${idx}`} 
            x1="0%" 
            y1="0%" 
            x2="100%" 
            y2="100%"
            >
              <stop 
              offset="0%" 
              stopColor={item.color} 
              />
              <stop 
              offset="100%" 
              stopColor={item.color} 
              stopOpacity="0.7" 
              />
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
  const [moods, setMoods] = useState([]); 
  const { habits: timerTasksFromShared } = useSharedTasks();
  const chartRef = useRef();
  const twoColRef = useRef();
  const reportRef = useRef();

  useEffect(() => {
    storage.list().then(setHabits).catch(console.error);
        const fetchMoods = async () => {
      try {
        const res = await fetch(`${API}/mood/?limit=365`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch moods: ${res.status}`);
        }
        const data = await res.json();
        setMoods(data || []);
      } catch (e) {
        console.error("Failed to load moods for reports:", e);
      }
    };

    fetchMoods();
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

  const prevAvg = useMemo(() => {
    if (!period?.start || !period?.days?.length || !habits.length) return null;

    let prevStart, prevEnd, prevDays;

    if (periodMode === "week") {
      prevStart = addDays(period.start, -7);
      prevEnd = addDays(prevStart, 6);
      prevDays = Array.from({ length: 7 }, (_, i) => addDays(prevStart, i));
    } else {
      const prevMonthDate = new Date(
        period.start.getFullYear(),
        period.start.getMonth() - 1,
        1
      );
      prevStart = startOfMonth(prevMonthDate);
      prevEnd = new Date(
        prevMonthDate.getFullYear(),
        prevMonthDate.getMonth() + 1,
        0
      );
      const totalPrevDays = prevEnd.getDate();
      prevDays = Array.from({ length: totalPrevDays }, (_, i) =>
        addDays(prevStart, i)
      );
    }

    const dailyPrevRates = prevDays.map((d) => {
      const done = countDoneOnDay(habits, d);
      const rate = pct(done, habits.length || 1);
      return rate;
    });

    if (!dailyPrevRates.length) return null;
    const sumPrev = dailyPrevRates.reduce((s, r) => s + r, 0);
    return Math.round(sumPrev / dailyPrevRates.length);
  }, [periodMode, period.start, habits]);

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

  const changePct =
    prevAvg && prevAvg > 0
      ? Math.round(((avgCompletion - prevAvg) / prevAvg) * 100)
      : null;

  useEffect(() => {
    fadeIn([chartRef.current, ...twoColRef.current?.children]);
  }, [periodMode, cursor, chartType]);

  const getStreakMessage = () => {
    if (longestStreak >= 30) return "Epic streak! You're unstoppable!";
    if (longestStreak >= 14) return "Amazing consistency!";
    if (longestStreak >= 7) return "Week streak! Nice work!";
    return "Start building your streak today!";
  };

  const buildTimerAnalysis = () => {
    const normalizeMinutes = (raw) => {
      if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
      if (typeof raw === "string") {
        const lower = raw.toLowerCase().trim();
        const mMatch = lower.match(/(\d+)\s*m/);
        if (mMatch) return parseInt(mMatch[1], 10);
        const hMatch = lower.match(/(\d+)\s*h/);
        if (hMatch) return parseInt(hMatch[1], 10) * 60;
        const num = parseInt(lower, 10);
        if (!Number.isNaN(num)) return num;
      }
      return 0;
    };

    const today = atMidnight(new Date());
    const todayKey = fmtLocal(today);

    const inToday = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return false;
      const mid = atMidnight(d);
      return fmtLocal(mid) === todayKey;
    };

    const currentHabitIds = new Set(habits.map((h) => h.id));
    const allTimerData = [];

    try {
      const storedSessions = localStorage.getItem("bloomup_timer_sessions");
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        if (Array.isArray(sessions)) {
          sessions.forEach((session) => {
            if (inToday(session.completedAt || session.date)) {
              allTimerData.push({
                source: "localStorage",
                ...session,
              });
            }
          });
        }
      }
    } catch (e) {
      console.error("Failed to load timer sessions from localStorage:", e);
    }

    try {
      const timerState = localStorage.getItem("timer_state");
      if (timerState) {
        const state = JSON.parse(timerState);
        if (state.date && inToday(state.date)) {
          const taskIndex = state.currentTaskIndex || 0;
          const currentTask = habits[taskIndex];

          if (currentTask && state.elapsedSeconds > 0) {
            allTimerData.push({
              source: "timer_state",
              habitId: currentTask.id,
              name: currentTask.name,
              category: currentTask.category || "General",
              plannedMinutes: normalizeMinutes(
                currentTask.minutes || currentTask.duration
              ),
              actualMinutes: Math.floor(state.elapsedSeconds / 60),
              elapsedMinutes: Math.floor(state.elapsedSeconds / 60),
              mode: state.mode || "regular",
              status: "in_progress",
              date: state.date,
              isActive: true,
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to load timer state:", e);
    }

    habits.forEach((habit) => {
      if (!habit.id) return;

      const localKey = todayKey;
      const utcKey = fmtUTCKey(today);

      if (habit.history && (habit.history[localKey] || habit.history[utcKey])) {
        const existingSession = allTimerData.find((item) => {
          const itemDate =
            item.date ||
            (item.completedAt ? fmtLocal(new Date(item.completedAt)) : null);
          return (
            (item.habitId === habit.id || item.id === habit.id) &&
            itemDate === todayKey
          );
        });

        if (!existingSession) {
          allTimerData.push({
            source: "habit_history",
            habitId: habit.id,
            name: habit.name,
            category: habit.category || "General",
            plannedMinutes: normalizeMinutes(
              habit.minutes || habit.duration || 30
            ),
            actualMinutes: normalizeMinutes(
              habit.minutes || habit.duration || 30
            ),
            mode: "regular",
            date: todayKey,
            status: "done",
            completed: true,
          });
        }
      }
    });

    const detailList = [];
    const modeStats = { pomodoro: 0, regular: 0, break: 0 };
    const categoryMap = new Map();
    const seen = new Set();

    allTimerData.forEach((item) => {
      const dateStr =
        item.date ||
        (item.completedAt ? fmtLocal(new Date(item.completedAt)) : "no-date");
      const key = `${item.habitId || item.id || "unknown"}-${dateStr}`;

      if (!item.isActive && seen.has(key)) return;
      if (!item.isActive) seen.add(key);

      if (item.habitId && !currentHabitIds.has(item.habitId)) return;

      const planned = normalizeMinutes(
        item.plannedMinutes || item.minutes || item.duration || 0
      );
      const actual = normalizeMinutes(
        item.actualMinutes || item.elapsedMinutes || 0
      );

      const modeRaw = (item.mode || "regular").toLowerCase();
      const category = item.category || "General";

      let bucket = "regular";
      if (modeRaw.includes("pomodoro") || modeRaw.includes("pomo")) {
        bucket = "pomodoro";
      } else if (modeRaw.includes("break")) {
        bucket = "break";
      }

      const minutesForStats = actual > 0 ? actual : planned;

      if (bucket !== "break") {
        modeStats[bucket] += minutesForStats;
        categoryMap.set(
          category,
          (categoryMap.get(category) || 0) + minutesForStats
        );
      } else {
        modeStats.break += minutesForStats;
      }

      const isCompleted =
        item.completed ||
        item.status === "done" ||
        (planned > 0 && actual >= planned);

      detailList.push({
        name: item.name || item.taskName || item.taskTitle || "Unnamed task",
        category,
        mode: bucket,
        modeLabel:
          bucket === "pomodoro"
            ? "Pomodoro"
            : bucket === "regular"
            ? "Regular"
            : "Break",
        duration: actual > 0 ? actual : planned,
        actualMinutes: actual,
        plannedMinutes: planned,
        completed: isCompleted,
        isActive: item.isActive || false,
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    const topCategory = categoryBreakdown[0] || null;
    const totalMinutes = detailList.reduce(
      (sum, t) => sum + (t.actualMinutes || t.duration || 0),
      0
    );
    const completedTasks = detailList.filter((t) => t.completed).length;
    const pendingTasks = detailList.filter((t) => !t.completed).length;

    return {
      source: detailList.length > 0 ? "sessions" : "none",
      completedTasks,
      pendingTasks,
      totalMinutes,
      modeStats: Object.values(modeStats).some((v) => v > 0)
        ? modeStats
        : null,
      categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : null,
      topCategory,
      list: detailList,
    };
  };

  const downloadPDF = async () => {
  try {
    const jsPDF = (await import("jspdf")).default;

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const colors = {
      primary: [126, 187, 143],       
      primaryDark: [34, 94, 60],      
      secondary: [203, 232, 213],    
      accent: [234, 248, 239],        
      text: [34, 55, 40],             
      textLight: [86, 110, 92],       
      textGray: [110, 110, 110],      
      border: [195, 216, 202],        
      white: [255, 255, 255],
      gradient1: [126, 187, 143],     
      gradient2: [168, 213, 186]
    };

    pdf.setLineHeightFactor(1.4);
    const fmtDisplayDate = (d) =>
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const resolveAccountName = () => {
      const directKeys = [
        "bloomup@fullName",
        "bloomup@displayName",
        "user_full_name",
        "user@displayName",
        "user_name",
        "username",
        "profile_name",
        "name"
      ];
      for (const key of directKeys) {
        const v = localStorage.getItem(key);
        if (v && v.trim()) return v.trim();
      }

      const jsonKeys = ["user", "bloomup@user", "auth_user"];
      for (const key of jsonKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const obj = JSON.parse(raw);
          const candidate =
            obj.full_name ||
            obj.name ||
            obj.username ||
            obj.displayName ||
            obj.email;
          if (candidate && String(candidate).trim())
            return String(candidate).trim();
        } catch {
        }
      }
      return "BloomUp User";
    };

    const accountName = resolveAccountName();
    const timerAnalysis = buildTimerAnalysis();

    let y = margin;
    let page = 1;

    const setColor = (c) => pdf.setTextColor(...c);
    const setFillColor = (c) => pdf.setFillColor(...c);
    const setDrawColor = (c) => pdf.setDrawColor(...c);

    const formatFocusMinutes = (minutes) => {
      if (!minutes || minutes <= 0) return "0 mins";

      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;

      const parts = [];

      if (hrs > 0) {
        parts.push(`${hrs} hr${hrs === 1 ? "" : "s"}`);
      }
      if (mins > 0) {
        parts.push(`${mins} min${mins === 1 ? "" : "s"}`);
      }

      return parts.join(" ");
    };

    const addSectionHeader = (title, gapTop = true) => {
      if (gapTop) y += 15;

      const barH = 12;

      setFillColor(colors.primary);
      pdf.roundedRect(margin, y, contentWidth, barH, 2, 2, "F");

      pdf.setFontSize(13);
      pdf.setFont(undefined, "bold");
      setColor(colors.white);
      pdf.text(title, margin + 5, y + barH - 3.5);

      y += barH + 10;
      setColor(colors.text);
      pdf.setFont(undefined, "normal");
    };

    const addSubHeader = (title) => {
      y += 1;
      pdf.setFontSize(11);
      pdf.setFont(undefined, "bold");
      setColor(colors.primaryDark);
      pdf.text(title, margin, y);
      y += 5;
      setColor(colors.text);
      pdf.setFont(undefined, "normal");
    };

    const addText = (text, size = 10, indent = 0, lineHeight = 5) => {
      pdf.setFontSize(size);
      pdf.setFont(undefined, "normal");
      setColor(colors.textLight);

      const maxWidth = contentWidth - indent;
      const lines = pdf.splitTextToSize(text, maxWidth);

      const lhFactor = 1.4; 
      pdf.text(lines, margin + indent, y, {
        maxWidth,
        lineHeightFactor: lhFactor,
      });

      const effectiveLineHeight = lineHeight * lhFactor;
      y += lines.length * effectiveLineHeight + 3;
    };

    const drawTable = (rows, colUnits) => {
      if (!rows || !rows.length) return;

      pdf.setLineWidth(0.3);
      setDrawColor(colors.border);

      const totalUnits = colUnits.reduce((a, b) => a + b, 0) || 1;
      const colWidths = colUnits.map((u) => (u / totalUnits) * contentWidth);

      const rowH = 9;
      const headerH = 10;

      const headerRow = rows[0];
      const bodyRows = rows.slice(1);

      const drawRow = (row, { isHeader = false, bodyIndex = 0 } = {}) => {
        let x = margin;
        const h = isHeader ? headerH : rowH;

        if (isHeader) {
          setFillColor(colors.accent);
          pdf.rect(margin, y, contentWidth, h, "F");
        }

        if (!isHeader && bodyIndex % 2 === 0) {
          setFillColor([244, 250, 246]);
          pdf.rect(margin, y, contentWidth, h, "F");
        }

        pdf.setFont(undefined, isHeader ? "bold" : "normal");
        pdf.setFontSize(isHeader ? 10 : 9);
        setColor(isHeader ? colors.text : colors.textLight);

        row.forEach((cell, i) => {
          const w = colWidths[i] ?? contentWidth / row.length;
          const text = String(cell ?? "");
          const lines = pdf.splitTextToSize(text, w - 4);

          const align = i === 0 ? "left" : "center";

          if (align === "center") {
            pdf.text(lines, x + w / 2, y + 6, { align: "center" });
          } else {
            pdf.text(lines, x + 2, y + 6);
          }

          setDrawColor(colors.border);
          pdf.rect(x, y, w, h, "S");
          x += w;
        });

        y += h;
      };

      const minBlockHeight = headerH + (bodyRows.length ? rowH : 0);
      if (y + minBlockHeight > pageHeight - margin - 20) {
        nextPage();
      }

      drawRow(headerRow, { isHeader: true });

      bodyRows.forEach((row, idx) => {
        if (y + rowH > pageHeight - margin - 20) {
          nextPage();
          drawRow(headerRow, { isHeader: true });
        }
        drawRow(row, { bodyIndex: idx });
      });

      y += 12;
      setColor(colors.text);
      pdf.setFont(undefined, "normal");
    };

    const nextPage = () => {
      pdf.setFontSize(9);
      setColor(colors.textGray);
      setDrawColor(colors.secondary);
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 10, {
        align: "center"
      });
      pdf.setFontSize(8);
      pdf.text("BloomUp Habit Tracker", margin, pageHeight - 10);

      page++;
      pdf.addPage();
      y = margin + 5;
    };

    const need = (h) => {
      if (y + h > pageHeight - margin - 20) nextPage();
    };

    const lineChart = (
      data,
      title,
      h = 70,
      yLabel = "Completion Rate (%)",
      xLabel = "Days"
    ) => {
      need(h + 50);

      pdf.setFontSize(11);
      pdf.setFont(undefined, "bold");
      setColor(colors.primaryDark);
      pdf.text(title, margin, y);
      y += 10;

      const w = contentWidth;
      const y0 = y;
      const y1 = y0 + h;

      setFillColor(colors.accent);
      pdf.rect(margin - 2, y0 - 2, w + 4, h + 4, "F");

      setDrawColor(colors.secondary);
      pdf.setLineWidth(0.25);
      pdf.setFontSize(8);
      setColor(colors.textGray);

      for (let i = 0; i <= 4; i++) {
        const gy = y0 + (i * h) / 4;
        pdf.line(margin, gy, margin + w, gy);
        pdf.text(`${100 - i * 25}%`, margin - 15, gy + 2);
      }

      setDrawColor(colors.primaryDark);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y0, margin, y1);
      pdf.line(margin, y1, margin + w, y1);

      pdf.setFontSize(9);
      pdf.setFont(undefined, "bold");
      setColor(colors.text);
      pdf.text(yLabel, margin - 18, y0 + h / 2, {
        angle: 90,
        align: "center"
      });
      pdf.text(xLabel, margin + w / 2, y1 + 12, { align: "center" });

      if (data.length > 0) {
        setDrawColor(colors.primary);
        pdf.setLineWidth(0.8);
        const step = w / Math.max(data.length - 1, 1);
        const maxRate = Math.max(...data.map((d) => d.rate));

        for (let i = 0; i < data.length - 1; i++) {
          const x1 = margin + i * step;
          const x2 = margin + (i + 1) * step;
          const p1 = y0 + h - (data[i].rate / 100) * h;
          const p2 = y0 + h - (data[i + 1].rate / 100) * h;

          pdf.line(x1, p1, x2, p2);

          setFillColor(colors.primary);
          pdf.circle(x1, p1, 1, "F");

          if (data[i].rate === maxRate) {
            setFillColor(colors.gradient1);
            pdf.circle(x1, p1, 1.4, "F");
          }
        }

        const last = data[data.length - 1];
        const lx = margin + (data.length - 1) * step;
        const ly = y0 + h - (last.rate / 100) * h;
        setFillColor(colors.primary);
        pdf.circle(lx, ly, 1, "F");
      }

      pdf.setFontSize(8);
      setColor(colors.textGray);
      const stepX = contentWidth / Math.max(data.length - 1, 1);
      const every = Math.max(1, Math.floor(data.length / 8));

      data.forEach((d, i) => {
        if (i % every === 0 || i === data.length - 1) {
          const x = margin + i * stepX;
          const label =
            periodMode === "week"
              ? d.dateObj.toLocaleDateString("en-US", { weekday: "short" })
              : d.dateObj.getDate();
          pdf.text(String(label), x, y1 + 5, { align: "center" });
        }
      });

      y = y1 + 19;
      addText(
        "This chart visualizes your daily rate throughout the period. Look for patterns and consistency.",
        9,
        0,
        5
      );
    };

    const barChart = (
      data,
      title,
      h = 55,
      expl,
      yLabel = "Completion Rate (%)",
      xLabel = "Categories"
    ) => {
      need(h + 50);

      pdf.setFontSize(11);
      pdf.setFont(undefined, "bold");
      setColor(colors.primaryDark);
      pdf.text(title, margin, y);
      y += 10;

      const y0 = y;
      const y1 = y0 + h;
      const barW = Math.min(18, contentWidth / (data.length * 1.8));
      const step = contentWidth / Math.max(data.length, 1);

      setFillColor(colors.accent);
      pdf.rect(margin - 2, y0 - 2, contentWidth + 4, h + 4, "F");

      setDrawColor(colors.secondary);
      pdf.setLineWidth(0.25);
      pdf.setFontSize(8);
      setColor(colors.textGray);

      for (let i = 0; i <= 4; i++) {
        const gy = y0 + (i * h) / 4;
        const val = 100 - i * 25;
        pdf.line(margin, gy, margin + contentWidth, gy);
        pdf.text(`${val}%`, margin - 15, gy + 2);
      }

      setDrawColor(colors.primaryDark);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y0, margin, y1);
      pdf.line(margin, y1, margin + contentWidth, y1);

      const maxVal = data.length ? Math.max(...data.map((d) => d.value)) : 0;

      data.forEach((it, i) => {
        const hh = (it.value / 100) * h;
        const x = margin + i * step + (step - barW) / 2;
        const yy = y0 + h - hh;

        let barColor = colors.primary;
        if (it.value === maxVal) {
          barColor = [27, 128, 75]; 
        }

        setFillColor(barColor);
        pdf.roundedRect(x, yy, barW, hh, 1.5, 1.5, "F");

        pdf.setFontSize(8);
        pdf.setFont(undefined, "bold");
        setColor(colors.primaryDark);
        pdf.text(`${it.value}%`, x + barW / 2, yy - 2, { align: "center" });

        pdf.setFont(undefined, "normal");
        setColor(colors.textGray);
        const label =
          (it.label || "").length > 12
            ? it.label.slice(0, 10) + "…"
            : it.label || "";
        pdf.text(label, x + barW / 2, y1 + 5, { align: "center" });
      });

      pdf.setFontSize(9);
      pdf.setFont(undefined, "bold");
      setColor(colors.text);
      pdf.text(xLabel, margin + contentWidth / 2, y1 + 12, {
        align: "center"
      });
      pdf.text(yLabel, margin - 18, y0 + h / 2, {
        angle: 90,
        align: "center"
      });

      y = y1 + 20;
      addText(
        expl ||
          "This chart shows your performance distribution for the selected dimension.",
        9,
        0,
        5
      );
    };

    // ===== cover page =====
    setFillColor(colors.accent);
    pdf.roundedRect(margin - 5, margin - 5, contentWidth + 10, 70, 3, 3, "F");

    setDrawColor(colors.primary);
    pdf.setLineWidth(2);
    pdf.roundedRect(margin - 5, margin - 5, contentWidth + 10, 70, 3, 3, "S");

    pdf.setFontSize(28);
    pdf.setFont(undefined, "bold");
    setColor(colors.primaryDark);
    pdf.text("HABIT PERFORMANCE", pageWidth / 2, 38, { align: "center" });
    pdf.text("ANALYSIS REPORT", pageWidth / 2, 52, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont(undefined, "normal");
    setColor(colors.textLight);
    const periodText =
      periodMode === "week"
        ? `Weekly Report: ${fmtDisplayDate(period.start)} – ${fmtDisplayDate(period.end)}`
        : `Monthly Report: ${period.start.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric"
          })}`;

    pdf.text(periodText, pageWidth / 2, 66, { align: "center" });

    y = 100;
    pdf.setFontSize(11);
    setColor(colors.text);
    pdf.text(`Account: ${accountName}`, margin, y);
    pdf.text(`Generated: ${fmtDisplayDate(new Date())}`, margin, y + 6);

    // ===== executive summary =====
    y = 125;
    setFillColor([250, 252, 255]);
    pdf.roundedRect(margin, y, contentWidth, 60, 2, 2, "F");
    setDrawColor(colors.border);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, y, contentWidth, 60, 2, 2, "S");

    y += 8;
    pdf.setFontSize(13);
    pdf.setFont(undefined, "bold");
    setColor(colors.primaryDark);
    pdf.text("Executive Summary", margin + 5, y);

    const totalCompletions = dailyCompletion.reduce(
      (s, d) => s + d.done,
      0
    );

    y += 10;
    const bestStreakLabel =
      longestStreak === 1 ? "1 day" : `${longestStreak} days`;

    const summary = [
      `Reporting Period: ${period.days.length} days (${fmtDisplayDate(
        period.start
      )} to ${fmtDisplayDate(period.end)})`,
      `Total Habits Tracked: ${habits.length}`,
      `Average Completion Rate: ${avgCompletion}%`,
      `Best Streak: ${bestStreakLabel}`,
      `Total Completions: ${totalCompletions}`
    ];

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    setColor(colors.textLight);
    summary.forEach((t) => {
      pdf.text("• " + t, margin + 8, y);
      y += 7;
    });

    nextPage();

    // ===== performance metrics =====
    const habitHasActivityInPeriod = (habit, periodObj) =>
      periodObj?.days?.some((d) => doneOnDay(habit, d));

    const buildPeriodMetrics = (periodObj) => {
      if (!periodObj || !periodObj.days?.length) return null;

      const daily = periodObj.days.map((d) => {
        const done = countDoneOnDay(habits, d);
        const rate = pct(done, habits.length || 1);
        return { dateObj: d, key: fmtLocal(d), done, rate };
      });

      const avg =
        daily.length > 0
          ? Math.round(
              daily.reduce((s, d) => s + d.rate, 0) / daily.length
            )
          : null;

      const noActivityDays = daily.filter((d) => d.rate === 0).length;
      const totalHabitsActive = habits.filter((h) =>
        habitHasActivityInPeriod(h, periodObj)
      ).length;

      const bestStreak = habits.reduce((max, h) => {
        const keys = allDoneKeys(h).filter((k) => {
          const dt = new Date(k + "T00:00:00");
          return dt >= periodObj.start && dt <= periodObj.end;
        });
        if (!keys.length) return max;

        let best = 1;
        let cur = 1;
        for (let i = 1; i < keys.length; i++) {
          const prevD = new Date(keys[i - 1] + "T00:00:00");
          const currD = new Date(keys[i] + "T00:00:00");
          const delta = (currD - prevD) / (1000 * 60 * 60 * 24);
          if (delta === 1) cur += 1;
          else if (delta > 1) cur = 1;
          best = Math.max(best, cur);
        }
        return Math.max(max, best);
      }, 0);

      return { daily, avg, noActivityDays, totalHabitsActive, bestStreak };
    };

    const currentMetrics = buildPeriodMetrics(period);

    let prevPeriod = null;
    if (periodMode === "week") {
      const prevStart = addDays(period.start, -7);
      const prevEnd = addDays(prevStart, 6);
      const prevDays = Array.from({ length: 7 }, (_, i) =>
        addDays(prevStart, i)
      );
      prevPeriod = { start: prevStart, end: prevEnd, days: prevDays };
    } else {
      const prevMonthDate = new Date(
        period.start.getFullYear(),
        period.start.getMonth() - 1,
        1
      );
      const prevStart = startOfMonth(prevMonthDate);
      const prevEnd = new Date(
        prevMonthDate.getFullYear(),
        prevMonthDate.getMonth() + 1,
        0
      );
      const totalPrev = prevEnd.getDate();
      const prevDays = Array.from({ length: totalPrev }, (_, i) =>
        addDays(prevStart, i)
      );
      prevPeriod = { start: prevStart, end: prevEnd, days: prevDays };
    }

    const prevMetrics = buildPeriodMetrics(prevPeriod);

    addSectionHeader("1. PERFORMANCE METRICS", false);

    const currAvg = avgCompletion;
    const currTotalHabits =
      currentMetrics?.totalHabitsActive ?? habits.length;
    const currNoActivity =
      currentMetrics?.noActivityDays ??
      dailyCompletion.filter((d) => d.rate === 0).length;
    const currBestStreak = currentMetrics?.bestStreak ?? longestStreak;

    const prevAvgMetric = prevMetrics?.avg ?? null;
    const prevTotalHabits = prevMetrics?.totalHabitsActive ?? null;
    const prevNoActivity = prevMetrics?.noActivityDays ?? null;
    const prevBestStreak = prevMetrics?.bestStreak ?? null;

    const pctChange = (curr, prev) => {
      if (prev == null || prev === 0) return "—";
      const deltaPct = Math.round(((curr - prev) / prev) * 100);
      return `${Math.abs(deltaPct)}%`;
    };

    const metrics = [
      ["Metric", "Current", "Previous", "Change"],
      [
        "Completion Rate",
        `${currAvg}%`,
        prevAvgMetric != null ? `${prevAvgMetric}%` : "—",
        pctChange(currAvg, prevAvgMetric)
      ],
      [
        "Active Habits",
        `${currTotalHabits}`,
        prevTotalHabits != null ? `${prevTotalHabits}` : "—",
        pctChange(currTotalHabits, prevTotalHabits)
      ],
      [
        "Zero Days",
        `${currNoActivity}`,
        prevNoActivity != null ? `${prevNoActivity}` : "—",
        pctChange(currNoActivity, prevNoActivity)
      ],
      [
        "Best Streak",
        `${currBestStreak}`,
        prevBestStreak != null ? `${prevBestStreak}` : "—",
        pctChange(currBestStreak, prevBestStreak)
      ]
    ];
    drawTable(metrics, [65, 35, 35, 35]);

    if (dailyCompletion.length) {
      lineChart(
        dailyCompletion,
        periodMode === "week"
          ? "Daily Completion Trend (Weekly)"
          : "Daily Completion Trend (Monthly)",
        70,
        "Completion Rate (%)",
        periodMode === "week" ? "Day of Week" : "Day of Month"
      );
    }

    addSubHeader("Statistical Insights");
    const rates = dailyCompletion.map((d) => d.rate);
    const mean = avgCompletion;
    const minR = rates.length ? Math.min(...rates) : 0;
    const maxR = rates.length ? Math.max(...rates) : 0;
    const variance =
      rates.reduce((s, r) => s + Math.pow(r - mean, 2), 0) /
      (rates.length || 1);
    const stdDev = Math.sqrt(variance);

    y += 3;
    if (habits.length === 0) {
      addText(
        "No habits were tracked during this period. Begin by adding at least one habit to start measuring your progress.",
        9,
        0,
        5.5
      );
    } else {
      addText(
        `Your average completion rate was ${mean}%, with a range from ${minR}% (lowest) to ${maxR}% (highest). ` +
          (stdDev < 20
            ? "You maintained good consistency throughout the period."
            : "There is room to improve consistency. Consider setting smaller daily goals."),
        9,
        0,
        5.5
      );
    }
    nextPage();

    // ===== habit performance =====
    addSectionHeader("2. HABIT PERFORMANCE ANALYSIS", false);

    const top = [...topHabits].slice(0, 10);
    if (top.length) {
      const t = [["Rank", "Habit Name", "Category", "Rate"]];

      top.forEach((h, i) => {
        const rank = `${i + 1}`;
        t.push([
          rank,
          h.name.length > 35 ? h.name.slice(0, 32) + "..." : h.name,
          h.category,
          `${h.rate}%`
        ]);
      });
      drawTable(t, [18, 80, 42, 30]);
    } else {
      addText("No habit data available for this period.", 10);
    }

    nextPage();

    // ===== category distribution =====
    addSectionHeader("3. CATEGORY DISTRIBUTION", false);

    const activeCats = categoryPct
      .filter((c) => c.rate > 0)
      .sort((a, b) => b.rate - a.rate);

    if (activeCats.length) {
      const catTable = [["Category", "Completion", "Habits"]];
      activeCats.forEach((c) => {
        const label = c.label.charAt(0).toUpperCase() + c.label.slice(1);
        const num = habits.filter(
          (h) => (h.category || "general").toLowerCase() === c.label
        ).length;
        catTable.push([label, `${c.rate}%`, `${num}`]);
      });
      drawTable(catTable, [80, 40, 40]);

      const catChartData = activeCats.map((c) => ({
        label: c.label.charAt(0).toUpperCase() + c.label.slice(1),
        value: c.rate
      }));
      barChart(
        catChartData,
        "Category Performance Comparison",
        55,
        "This chart shows your performance across different habit categories.",
        "Completion Rate (%)",
        "Category"
      );
    } else {
      addText("No category data available.", 10);
    }

    nextPage();

    // ===== behavioral patterns =====
    addSectionHeader("4. BEHAVIORAL PATTERNS", false);

    addSubHeader("Weekly Pattern Analysis");
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ];
    const bucket = {};
    dailyCompletion.forEach((d) => {
      const monIndex = (d.dateObj.getDay() + 6) % 7;
      bucket[monIndex] = bucket[monIndex] || { sum: 0, n: 0 };
      bucket[monIndex].sum += d.rate;
      bucket[monIndex].n += 1;
    });

    const dow = Object.keys(bucket)
      .map((k) => ({
        i: +k,
        name: dayNames[+k],
        avg: Math.round(bucket[k].sum / bucket[k].n)
      }))
      .sort((a, b) => a.i - b.i);

    if (dow.length) {
      const t2 = [["Day of Week", "Avg Rate"]];
      dow.forEach((d) => t2.push([d.name, `${d.avg}%`]));
      drawTable(t2, [100, 60]);

      const dowChart = dow.map((d) => ({
        label: d.name.slice(0, 3),
        value: d.avg
      }));
      barChart(
        dowChart,
        "Performance by Day of Week",
        55,
        "This chart shows your performance by day of week.",
        "Completion Rate (%)",
        "Day of Week"
      );
    }

    addSubHeader("Consistency Insights");

    y += 3;

    if (habits.length === 0) {
      addText(
        "No habit data is available to evaluate consistency. Add a habit and track it daily to begin building patterns.",
        9,
        0,
        5.5
      );
    } else {
      addText(
        "Aim for steady performance across all days. If certain weekdays show lower completion rates, consider adapting your habits for those days—make them smaller or schedule them at different times.",
        9,
        0,
        5.5
      );
    }

    addSubHeader("Period-over-Period Trend");
    y += 3;
    const trendPrevAvg = prevAvgMetric;
    const delta = trendPrevAvg == null ? null : Math.round(currAvg - trendPrevAvg);

    if (habits.length === 0) {
      addText(
        "No trend comparison can be made because no habits were tracked in this or previous periods.",
        9,
        0,
        5.5
      );
    } else {
      addText(
        trendPrevAvg == null
          ? "No previous period data available for comparison."
          : delta > 0
          ? `Performance improved by ${delta}% compared to the previous period.`
          : delta < 0
          ? `Performance decreased by ${Math.abs(delta)}%. Review what changed and adjust your habits accordingly.`
          : "Performance is stable compared to the previous period.",
        9,
        0,
        5.5
      );
    }

    nextPage();

    // ===== mood analysis =====
    addSectionHeader("5. MOOD ANALYSIS", false);

    const moodsInPeriod = (moods || []).filter((m) => {
      const d = atMidnight(new Date(m.logged_on));
      return d >= period.start && d <= period.end;
    });

    if (!moodsInPeriod.length) {
      addText(
        "No mood entries recorded in this period. Start logging your daily mood to discover patterns between your emotional state and habit performance.",
        9,
        0,
        5.5
      );
    } else {
      const scores = moodsInPeriod.map((m) => m.mood_score || 0);
      const totalEntries = scores.length;
      const avgMood = scores.reduce((s, v) => s + v, 0) / totalEntries;
      const minMood = Math.min(...scores);
      const maxMood = Math.max(...scores);
      const positiveEntries = moodsInPeriod.filter(
        (m) => m.mood_score >= 3
      ).length;
      const positiveEntriesPct = Math.round(
        (positiveEntries / totalEntries) * 100
      );

      const moodSummaryRows = [
        ["Metric", "Value"],
        ["Total Entries", `${totalEntries}`],
        ["Average Mood", `${avgMood.toFixed(1)}/5`],
        ["Highest Mood", `${maxMood}/5`],
        ["Lowest Mood", `${minMood}/5`],
        ["Positive Days (>=3)", `${positiveEntriesPct}%`]
      ];
      drawTable(moodSummaryRows, [90, 70]);

      const moodByDayMap = {};
      moodsInPeriod.forEach((m) => {
        const key = fmtLocal(new Date(m.logged_on));
        if (!moodByDayMap[key]) moodByDayMap[key] = [];
        moodByDayMap[key].push(m.mood_score || 0);
      });

      const moodDailySeries = period.days.map((d) => {
        const key = fmtLocal(d);
        const arr = moodByDayMap[key] || [];
        const avg = arr.length
          ? arr.reduce((s, v) => s + v, 0) / arr.length
          : 0;
        return { dateObj: d, key, score: avg };
      });

      const moodLineData = moodDailySeries.map((d) => ({
        dateObj: d.dateObj,
        key: d.key,
        rate: d.score * 20
      }));

      if (moodLineData.length) {
        lineChart(
          moodLineData,
          "Daily Mood Trend (1–5 scale, scaled to %)",
          70,
          "Mood Score (scaled to %)",
          periodMode === "week" ? "Day of Week" : "Day of Month"
        );
        addText(
          "Mood scores (1–5) are scaled to percentages for visualization (1=0%, 3=60%, 5=100%). Compare this with your habit completion to identify correlations.",
          8,
          0,
          5
        );
      }

      const labels = {
        1: "Very Low",
        2: "Low",
        3: "Neutral",
        4: "Good",
        5: "Great"
      };
      const distCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      scores.forEach((s) => {
        distCounts[s] = (distCounts[s] || 0) + 1;
      });

      const distRows = [["Score", "Label", "Count", "Share"]];
      [1, 2, 3, 4, 5].forEach((score) => {
        const c = distCounts[score] || 0;
        if (!c) return;
        const share = Math.round((c / totalEntries) * 100);
        distRows.push([`${score}`, labels[score], `${c}`, `${share}%`]);
      });

      if (distRows.length > 1) {
        drawTable(distRows, [30, 50, 30, 30]);
      }

      addText(
        avgMood >= 4
          ? "Overall mood is positive and likely supports your habit performance."
          : avgMood >= 3
          ? "Mood is generally balanced. Continue monitoring for patterns that affect your habits."
          : "Consider incorporating mood-supporting activities on lower days. Small, consistent actions can improve both mood and habit completion.",
        9,
        0,
        5.5
      );
    }

    nextPage();

    // ========== TIMER ANALYSIS ==========
    addSectionHeader("6. TIMER ANALYSIS", false);

    if (!timerAnalysis.list.length) {
      addText(
        "No timer data is available for this period. Use the Pomodoro or Regular timer to generate focused work sessions, and they will be summarized here.",
        9,
        0,
        5.5
      );
    } else {
      const completedMinutes = timerAnalysis.list.reduce(
        (sum, t) => sum + (t.actualMinutes ?? t.duration ?? 0),
        0
      );

      const totalPlannedMinutes = timerAnalysis.list.reduce(
        (sum, t) =>
          sum +
          (t.plannedMinutes ??
            t.actualMinutes ??
            t.duration ??
            0),
        0
      );

      const completionRate =
        totalPlannedMinutes > 0
          ? Math.round((completedMinutes / totalPlannedMinutes) * 100)
          : 0;

      const summaryRows = [
        ["Metric", "Value"],
        ["Total Tasks", `${timerAnalysis.list.length}`],
        ["Completed Tasks", `${timerAnalysis.completedTasks}`],
        ["In Progress", `${timerAnalysis.pendingTasks}`],
        ["Focus Time (Completed)", formatFocusMinutes(completedMinutes)],
        ["Total Planned Time", formatFocusMinutes(totalPlannedMinutes)],
        ["Completion Rate", `${completionRate}%`],
      ];

      drawTable(summaryRows, [80, 60]);

      if (timerAnalysis.modeStats && timerAnalysis.source === "sessions") {
        addSubHeader("Time Distribution by Mode");

        const { pomodoro, regular, break: breakTime } =
          timerAnalysis.modeStats;
        const totalModeMinutes = pomodoro + regular + breakTime;

        if (totalModeMinutes > 0) {
          const modeRows = [
            ["Mode", "Time Spent", "Percentage"],
            [
              "Pomodoro (Work)",
              formatFocusMinutes(pomodoro),
              `${Math.round((pomodoro / totalModeMinutes) * 100)}%`,
            ],
            [
              "Regular Timer",
              formatFocusMinutes(regular),
              `${Math.round((regular / totalModeMinutes) * 100)}%`,
            ],
            [
              "Breaks",
              formatFocusMinutes(breakTime),
              `${Math.round((breakTime / totalModeMinutes) * 100)}%`,
            ],
          ];

          drawTable(modeRows, [60, 50, 40]);

          addText(
            `You spent ${formatFocusMinutes(
              pomodoro + regular
            )} in focused work and ${formatFocusMinutes(
              breakTime
            )} in breaks. ${
              breakTime > 0 && pomodoro + regular > 0
                ? `Your break-to-work ratio is ${Math.round(
                    (breakTime / (pomodoro + regular)) * 100
                  )}%.`
                : ""
            }`,
            9,
            0,
            5.5
          );
        }
      }

      if (
        timerAnalysis.categoryBreakdown &&
        timerAnalysis.categoryBreakdown.length > 0
      ) {
        addSubHeader("Focus Time by Category");

        const categoryRows = [["Category", "Time Spent", "Share"]];

        const totalCategoryMinutes = timerAnalysis.categoryBreakdown.reduce(
          (sum, c) => sum + c.minutes,
          0
        );

        timerAnalysis.categoryBreakdown.forEach((cat) => {
          const share =
            totalCategoryMinutes > 0
              ? Math.round((cat.minutes / totalCategoryMinutes) * 100)
              : 0;
          categoryRows.push([
            cat.name,
            formatFocusMinutes(cat.minutes),
            `${share}%`,
          ]);
        });

        drawTable(categoryRows, [70, 50, 30]);

        if (timerAnalysis.topCategory) {
          addText(
            `Your top focus category was "${timerAnalysis.topCategory.name}" with ${formatFocusMinutes(
              timerAnalysis.topCategory.minutes
            )} of dedicated time.`,
            9,
            0,
            5.5
          );
        }
      }

      addSubHeader("Task Completion Details");

      const detailRows = [["Task", "Category", "Progress", "Status"]];
      const sortedTasks = [...timerAnalysis.list].sort(
        (a, b) => Number(b.completed) - Number(a.completed)
      );

      sortedTasks.forEach((t) => {
        const actual = t.actualMinutes ?? t.duration ?? 0;
        const planned = t.plannedMinutes ?? actual;

        const actualText = formatFocusMinutes(actual);
        const plannedText = planned
          ? formatFocusMinutes(planned)
          : "—";

        let progressText = "—";
        if (planned > 0) {
          const pct = Math.round((actual / planned) * 100);
          progressText = `${actualText} / ${plannedText} (${Math.min(
            pct,
            100
          )}%)`;
        } else {
          progressText = actualText;
        }

        const status = t.completed
          ? "Completed"
          : actual > 0
          ? "In Progress"
          : "Planned";

        detailRows.push([
          t.name.length > 40 ? t.name.slice(0, 37) + "..." : t.name,
          t.category,
          progressText,
          status,
        ]);
      });

      drawTable(detailRows, [55, 40, 65, 30]);

      addSubHeader("Timer Insights");

      y += 3;

      const insights = [];

      if (timerAnalysis.completedTasks === 0) {
        insights.push(
          "No tasks completed yet. Start a timer session to build your focus time."
        );
      } else if (completionRate >= 80) {
        insights.push(
          `Excellent completion rate of ${completionRate}%! You're consistently following through on your planned work.`
        );
      } else if (completionRate >= 50) {
        insights.push(
          `Your completion rate is ${completionRate}%. Consider reviewing incomplete tasks to understand what prevented completion.`
        );
      } else {
        insights.push(
          `Completion rate is ${completionRate}%. Try breaking tasks into smaller chunks or reducing planned durations to improve follow-through.`
        );
      }

      if (timerAnalysis.pendingTasks > 0) {
        insights.push(
          `You have ${timerAnalysis.pendingTasks} task${
            timerAnalysis.pendingTasks > 1 ? "s" : ""
          } in progress. Focus on completing these before adding new ones.`
        );
      }

      if (timerAnalysis.totalMinutes >= 120) {
        insights.push(
          `You've accumulated ${formatFocusMinutes(
            timerAnalysis.totalMinutes
          )} of focus time. Great dedication!`
        );
      }

      insights.forEach((insight) => {
        addText("• " + insight, 9, 3, 2.5);
      });
    }
    nextPage();

    // ===== conclusion =====
    addSectionHeader("7. CONCLUSION & RECOMMENDATIONS", false);

    addSubHeader("Overall Performance");

    y += 3;

    const conclusion =
      avgCompletion >= 80
        ? `Performance at ${avgCompletion}% indicates excellent consistency and dedication to your habits. Maintain this level and consider gradually introducing more challenging goals.`
        : avgCompletion >= 60
        ? `Performance at ${avgCompletion}% shows that you are building strong habits. Focus on maintaining this level while improving weaker days.`
        : avgCompletion >= 40
        ? `Performance at ${avgCompletion}% suggests that your habits are developing but not yet stable. Identify what works on your best days and replicate those conditions more often.`
        : `Current performance is ${avgCompletion}%. Focus on building a foundation with smaller, more achievable habits and aim for daily completion, even with minimal effort.`;
    addText(conclusion, 9, 3, 5.5);


    addSubHeader("Key Insights");
    const insights = [];

    if (longestStreak >= 14) {
      insights.push(
        `• Your longest streak of ${longestStreak} days reflects strong commitment. Protect this momentum.`
      );
    } else if (longestStreak >= 7) {
      insights.push(
        "• You have established a week-long streak. Aim to extend this towards a two-week period."
      );
    } else {
      insights.push(
        "• Building a 7-day streak should be a priority. Consistency is more important than intensity."
      );
    }

    if (currNoActivity > period.days.length * 0.3) {
      insights.push(
        "• There are many days with no completions. Consider setting a minimum goal of at least one habit per day."
      );
    }

    if (dow.length) {
      const bestDay = dow.reduce(
        (max, d) => (d.avg > max.avg ? d : max),
        dow[0]
      );
      const worstDay = dow.reduce(
        (min, d) => (d.avg < min.avg ? d : min),
        dow[0]
      );
      if (bestDay && worstDay && bestDay.avg - worstDay.avg > 30) {
        insights.push(
          `• There is a large gap between ${bestDay.name} (${bestDay.avg}%) and ${worstDay.name} (${worstDay.avg}%). Consider simplifying or rescheduling habits on ${worstDay.name}.`
        );
      }
    }

    if (activeCats.length > 0) {
      const topCat = activeCats[0];
      const label =
        topCat.label.charAt(0).toUpperCase() + topCat.label.slice(1);
      insights.push(
        `• Strongest category: ${label} (${topCat.rate}%). Techniques that work in this area may be transferable to other categories.`
      );
    }

    y += 3; 
    pdf.setFontSize(9);
    setColor(colors.textLight);

    insights.forEach((insight) => {
      const lines = pdf.splitTextToSize(insight, contentWidth - 5);
      pdf.text(lines, margin + 3, y);
      y += lines.length * 5.5 + 2;
    });

    y += 5.5;

    addSubHeader("Recommended Action Items");
    const actions = [
      "1. Review the lowest-performing days and identify specific obstacles or time conflicts.",
      "2. For habits with completion rates below 50%, reduce difficulty or duration to make them more achievable.",
      "3. Set a daily minimum target: complete at least one habit each day without exception.",
      "4. Log mood regularly to understand how emotional state affects habit performance.",
      "5. Acknowledge progress regularly to maintain motivation and momentum."
    ];

    y += 3; 
    pdf.setFontSize(9);
    setColor(colors.textLight);

    actions.forEach((action) => {
      const lines = pdf.splitTextToSize(action, contentWidth - 5);
      pdf.text(lines, margin + 3, y);
      y += lines.length * 5.5 + 2;
    });

    y = pageHeight - margin - 35;
    setDrawColor(colors.secondary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);

    y += 8;
    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    setColor(colors.textGray);

    const meta = [
      `Report Type: ${
        periodMode === "week" ? "Weekly" : "Monthly"
      } Performance Analysis`,
      `Period: ${fmtDisplayDate(period.start)} to ${fmtDisplayDate(
        period.end
      )} (${period.days.length} days)`,
      `Generated: ${fmtDisplayDate(new Date())} at ${new Date().toLocaleTimeString()}`,
      `Account: ${accountName}`
    ];

    meta.forEach((m) => {
      pdf.text(m, margin, y);
      y += 5;
    });

    setDrawColor(colors.secondary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    pdf.setFontSize(9);
    setColor(colors.textGray);
    pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 10, {
      align: "center"
    });
    pdf.text("BloomUp Habit Tracker", margin, pageHeight - 10);

    const fileName = `BloomUp-${
      periodMode === "week" ? "Weekly" : "Monthly"
    }-Report-${fmtLocal(period.start)}.pdf`;
    pdf.save(fileName);
  } catch (e) {
    console.error("PDF export failed:", e);
    alert("Failed to generate PDF report. Please try again.");
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
                      { scale: 1.05, 
                        duration: 0.2, 
                        yoyo: true, 
                        repeat: 1 
                      }
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
      </section>
    </div>
  );
}