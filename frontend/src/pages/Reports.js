import React, { useEffect, useMemo, useState } from "react";
import "./style/Reports.css";

/** ===== utils ===== */
const fmt = (d) => d.toISOString().slice(0,10);      // YYYY-MM-DD
const startOfWeek = (d) => { const x=new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x; };
const startOfMonth = (d) => { const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; };
const addDays = (d, n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const daysBetween = (a,b) => Math.round((b-a)/(1000*60*60*24));

/** percent helper */
const pct = (num, den) => den === 0 ? 0 : Math.round((num/den)*100);

const calcStreak = (habit) => {
  let s=0;
  for(let i=0;;i++){
    const key = fmt(addDays(new Date(), -i));
    if(habit.history?.[key]) s++;
    else break;
  }
  return s;
};

export default function Reports(){
  /** ===== load habits from localStorage ===== */
  const [habits, setHabits] = useState([]);
  useEffect(() => {
    try{
      const raw = localStorage.getItem("habit-tracker@v3");
      setHabits(raw ? JSON.parse(raw) : []);
    }catch{ setHabits([]); }
  }, []);

  /** ===== period: week | month  + cursor (Date of current viewport) ===== */
  const [mode, setMode] = useState("week"); // 'week' | 'month'
  const [cursor, setCursor] = useState(new Date()); 

  const period = useMemo(() => {
    if(mode === "week"){
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      const days = Array.from({length:7}, (_,i) => addDays(start, i));
      return { start, end, days };
    }else{
      const start = startOfMonth(cursor);
      const last = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0);
      const total = last.getDate();
      const days = Array.from({length: total}, (_,i) => addDays(start, i));
      return { start, end: last, days };
    }
  }, [mode, cursor]);

    /* daily completion */
  const dailyCompletion = useMemo(() => {
    const map = period.days.map((dateObj) => {
      const key = fmt(dateObj);
      const done = habits.filter(h => h.history?.[key]).length;
      const total = habits.length;
      return { key, dateObj, done, total, rate: pct(done, total) };
    });
    return map;
  }, [habits, period]);

  /*summary metric */
  const avgCompletion = useMemo(() => {
    if(dailyCompletion.length === 0) return 0;
    const sum = dailyCompletion.reduce((a,b) => a + b.rate, 0);
    return Math.round(sum / dailyCompletion.length);
  }, [dailyCompletion]);

  const longestStreakAll = useMemo(() => {
    return habits.reduce((m,h) => Math.max(m, calcStreak(h)), 0);
  }, [habits]);

  const filteredHabits = useMemo(() => habits, [habits]); // ไว้เผื่ออนาคตมี filter เพิ่ม

  /*category breakdown*/
  const categoryPct = useMemo(() => {
    const byCat = new Map();
    period.days.forEach((d) => {
      const k = fmt(d);
      habits.forEach(h => {
        const cat = h.category || "general";
        if(!byCat.has(cat)) byCat.set(cat, {cat, done:0, total:0});
        const row = byCat.get(cat);
        row.total += 1;                  
        if(h.history?.[k]) row.done += 1;
      });
    });
    return Array.from(byCat.values()).map(x => ({
      ...x,
      rate: pct(x.done, x.total)
    })).sort((a,b)=>b.rate-a.rate);
  }, [habits, period]);

  /*top habits*/
  const topHabits = useMemo(() => {
    const rows = habits.map(h => {
      let done=0, total=0;
      period.days.forEach(d=>{
        total += 1;
        if(h.history?.[fmt(d)]) done +=1;
      });
      return { name: h.name, category: h.category || "general", rate: pct(done,total) };
    }).sort((a,b)=>b.rate-a.rate);
    return rows.slice(0,5);
  }, [habits, period]);

  /*navigation*/
  const goPrev = () => {
    if(mode === "week") setCursor(addDays(period.start, -1));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1));
  };
  const goNext = () => {
    if(mode === "week") setCursor(addDays(period.end, +1));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1));
  };

  const BarChart = ({ data }) => {
    const maxH = 110;
    const w = Math.max(300, data.length*24);
    const h = 140;
    const barW = 14;
    const gap = 10;
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="svgb">
        {/* baseline */}
        <line x1="0" y1={h-20} x2={w} y2={h-20} stroke="#E5E7EB"/>
        {data.map((d, i) => {
          const x = i*(barW+gap);
          const y = (h-20) - (d.rate/100)*maxH;
          return (
            <g key={d.key} transform={`translate(${x},0)`}>
              <rect rx="6" x="0" y={y} width={barW} height={(d.rate/100)*maxH}
                fill="#7c3aed" opacity="0.9" />
              <text x={barW/2} y={h-6} textAnchor="middle" fontSize="10" fill="#6b7280">
                {new Date(d.dateObj).toLocaleDateString(undefined, { weekday:"short" }).slice(0,1)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const Donut = ({ value }) => {
    const r=38, c=2*Math.PI*r;
    const off = c*(1-value/100);
    return (
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="#E5E7EB" strokeWidth="12" fill="none"/>
        <circle cx="50" cy="50" r={r} stroke="#7c3aed" strokeWidth="12" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 50 50)" />
        <text x="50" y="54" textAnchor="middle" fontWeight="700" fontSize="18" fill="#4b5563">{value}%</text>
      </svg>
    );
  };

  /** ===== render ===== */
  return (
    <div className="reports-root">
      <div className="reports-grid">
        <section className="reports-content">
          {/* header */}
          <header className="reports-header">
            <div>
              <h1 className="rp-title">Reports</h1>
              <p className="rp-sub">View your habit progress by week or month</p>
            </div>

            <div className="rp-controls">
              <div className="seg">
                <button className={`seg-btn ${mode==="week"?"is-active":""}`} onClick={()=>setMode("week")}>Weekly</button>
                <button className={`seg-btn ${mode==="month"?"is-active":""}`} onClick={()=>setMode("month")}>Monthly</button>
              </div>
              <div className="pager">
                <button onClick={goPrev}>&lt;</button>
                <span>
                  {mode==="week"
                    ? `${period.start.toLocaleDateString()} – ${period.end.toLocaleDateString()}`
                    : period.start.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
                <button onClick={goNext}>&gt;</button>
              </div>
            </div>
          </header>

          {/* KPIs */}
          <div className="kpi">
            <div className="kcard">
              <div className="kcap">Average Completion</div>
              <div className="kbody">
                <Donut value={avgCompletion}/>
                <div className="ktext">
                  <div className="kval">{avgCompletion}%</div>
                  <div className="kdesc">average during this {mode}</div>
                </div>
              </div>
            </div>

            <div className="kcard">
              <div className="kcap">Habits Tracked</div>
              <div className="kbig">{habits.length}</div>
              <div className="kfoot">active habits</div>
            </div>

            <div className="kcard">
              <div className="kcap">Longest Streak</div>
              <div className="kbig">{longestStreakAll}d</div>
              <div className="kfoot">across all habits</div>
            </div>
          </div>

          {/* chart */}
          <div className="card rp-chart">
            <div className="card-head">
              <h3>Daily Completion</h3>
              <span className="muted">{mode === "week" ? "7 days" : `${period.days.length} days`}</span>
            </div>
            <BarChart data={dailyCompletion}/>
          </div>

          {/* top habits + category breakdown */}
          <div className="twocol">
            <div className="card">
              <div className="card-head"><h3>Top Habits</h3></div>
              <table className="table">
                <thead>
                  <tr><th>Habit</th><th>Category</th><th>Rate</th></tr>
                </thead>
                <tbody>
                  {topHabits.map((r)=>(
                    <tr key={r.name}>
                      <td className="cap">{r.name}</td>
                      <td className="cap small">{r.category}</td>
                      <td><span className="pill">{r.rate}%</span></td>
                    </tr>
                  ))}
                  {topHabits.length===0 && (
                    <tr><td colSpan={3} className="muted">No data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="card-head"><h3>Category Breakdown</h3></div>
              <ul className="list">
                {categoryPct.map((c)=>(
                  <li key={c.cat} className="list-row">
                    <span className="cap">{c.cat}</span>
                    <div className="bar">
                      <div className="bar-fill" style={{width: `${c.rate}%`}}/>
                    </div>
                    <span className="rate">{c.rate}%</span>
                  </li>
                ))}
                {categoryPct.length===0 && <li className="muted">No data</li>}
              </ul>
            </div>
          </div>

          <footer className="rp-foot">✨</footer>
        </section>
      </div>
    </div>
  );
}

