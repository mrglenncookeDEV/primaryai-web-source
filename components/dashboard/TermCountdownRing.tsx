"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  termName: string;
  termStartDate: string; // YYYY-MM-DD
  termEndDate: string;   // YYYY-MM-DD
};

const RINGS = [
  { key: "S", label: "Seconds", r: 28, color: "#f59e0b" },
  { key: "M", label: "Minutes", r: 43, color: "#10b981" },
  { key: "H", label: "Hours",   r: 58, color: "#06b6d4" },
  { key: "D", label: "Days",    r: 73, color: "#3b82f6" },
  { key: "W", label: "Weeks",   r: 88, color: "#8b5cf6" },
] as const;

// Day window: 7am–4pm = 9 hours (rings start full at 7am, drain to zero at 4pm)
const DAY_START_SECS  = 7  * 3600;  // 07:00
const SCHOOL_START_SECS = 9  * 3600;  // 09:00 (used for school-day counting)
const SCHOOL_END_SECS   = 16 * 3600;  // 16:00
const SCHOOL_SECS_PER_DAY = SCHOOL_END_SECS - SCHOOL_START_SECS; // 25,200
const DAY_SECS_TOTAL  = SCHOOL_END_SECS - DAY_START_SECS; // 32,400 (9 hours)

function isoString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function countSchoolDays(from: Date, to: Date, bankHols: Set<string>): number {
  let count = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !bankHols.has(isoString(d))) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

const RING_COLORS = ["#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6"];

export function TermCountdownRing({ termName, termStartDate, termEndDate }: Props) {
  const [now, setNow]       = useState(() => new Date());
  const [bankHols, setBankHols] = useState<Set<string>>(new Set());
  const [toast, setToast]   = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const prevMinute          = useRef<number>(-1);
  const prevDaysRef         = useRef<number>(-1);
  const toastTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireConfetti = useCallback(() => {
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 }, colors: RING_COLORS });
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Entrance animation — rings sweep in from empty on mount
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!termStartDate || !termEndDate) return;
    fetch(`/api/calendar/bank-holidays?from=${termStartDate}&to=${termEndDate}`)
      .then(r => r.json())
      .then(data => {
        const dates = new Set<string>(
          (data.events || []).map((e: { scheduled_date: string }) => e.scheduled_date)
        );
        setBankHols(dates);
      })
      .catch(() => {});
  }, [termStartDate, termEndDate]);

  // Confetti + toast on the hour and at 4pm
  useEffect(() => {
    const m = now.getMinutes();
    const h = now.getHours();
    const s = now.getSeconds();
    if (s === 0 && m === 0 && prevMinute.current !== 0) {
      fireConfetti();
      showToast(h === 16 ? "Another day another dollar!" : "Another hour done!");
    }
    prevMinute.current = m;
  }, [now, fireConfetti, showToast]);

  // Parse dates
  const [sy, sm, sd] = termStartDate.split("-").map(Number);
  const [ey, em, ed] = termEndDate.split("-").map(Number);
  const termStart = new Date(sy, (sm || 1) - 1, sd || 1);
  const termEnd   = new Date(ey, (em || 1) - 1, ed || 1);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = isoString(today);
  const todayDow = today.getDay();
  const todayIsSchoolDay = todayDow !== 0 && todayDow !== 6 && !bankHols.has(todayIso);

  const totalSchoolDays     = countSchoolDays(termStart, termEnd, bankHols);
  const schoolDaysRemaining = countSchoolDays(today, termEnd, bankHols);

  // End-of-term mega confetti
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (prevDaysRef.current > 0 && schoolDaysRemaining === 0) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 250, spread: 130, origin: { y: 0.5 }, colors: RING_COLORS });
        setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { x: 0.15, y: 0.65 }, colors: RING_COLORS }), 400);
        setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { x: 0.85, y: 0.65 }, colors: RING_COLORS }), 800);
      });
      showToast("🎓 Term's over! Have an amazing holiday!");
    }
    prevDaysRef.current = schoolDaysRemaining;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolDaysRemaining]);

  // Count school days from tomorrow onwards, then add today's remaining school time
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureSchoolDays = countSchoolDays(tomorrow, termEnd, bankHols);

  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let todaySchoolSecsLeft = 0;
  if (todayIsSchoolDay) {
    if (nowSecs < SCHOOL_START_SECS) {
      todaySchoolSecsLeft = SCHOOL_SECS_PER_DAY;          // before school
    } else if (nowSecs < SCHOOL_END_SECS) {
      todaySchoolSecsLeft = SCHOOL_END_SECS - nowSecs;    // during school — ticks live
    }
    // after 4pm: 0
  }

  const schoolSecsRemaining = futureSchoolDays * SCHOOL_SECS_PER_DAY + todaySchoolSecsLeft;

  // Ring fill: school-days fraction (excludes weekends + bank holidays)
  const termFrac = totalSchoolDays > 0 ? Math.min(1, schoolDaysRemaining / totalSchoolDays) : 0;

  // Seconds ring: starts full at :00, drains to empty at :59, then resets
  const secFrac = 1 - now.getSeconds() / 60;

  // Time until 4pm today (base: 7am → 4pm window)
  const timeToday    = Math.max(0, SCHOOL_END_SECS - nowSecs);   // secs to 4pm (for numbers)
  const timeTodayDay = Math.max(0, Math.min(DAY_SECS_TOTAL, SCHOOL_END_SECS - Math.min(nowSecs, SCHOOL_END_SECS))); // clamped to window

  // Current-day remaining values (based on time to 4pm)
  const dayHoursRemaining = Math.floor(timeToday / 3600);
  const dayMinsRemaining  = Math.floor((timeToday % 3600) / 60);
  const daySecsRemaining  = timeToday % 60;

  // Ring fracs: hours/minutes ring drain from full (7am) to empty (4pm)
  const dayFrac = Math.max(0, SCHOOL_END_SECS - Math.max(nowSecs, DAY_START_SECS)) / DAY_SECS_TOTAL;
  const minFrac = dayMinsRemaining / 60;   // minutes ring: e.g. 45/60

  // Term remaining values (weeks + days)
  const daysRemaining  = schoolDaysRemaining;
  const weeksRemaining = schoolDaysRemaining / 5;

  // RINGS order: [S, M, H, D, W] → indices 0..4
  const remaining = [daySecsRemaining, dayMinsRemaining, dayHoursRemaining, daysRemaining, weeksRemaining];

  // Per-ring fracs: S→secFrac, M→minFrac, H→dayFrac, D→termFrac, W→termFrac
  const ringFracs = [secFrac, minFrac, dayFrac, termFrac, termFrac];

  const CX = 100, SW = 9;

  return (
    <>
    <div className="term-countdown-banner">
      <div>
        <h2 className="term-countdown-banner-title">{termName} Term</h2>
      </div>
      <div className="term-countdown-banner-swatches">
        {[...RING_COLORS].reverse().map((color, i) => (
          <span key={i} className="term-countdown-banner-swatch" style={{ background: color }} />
        ))}
      </div>
    </div>
    <div className="term-countdown-wrap">
      {/* Left: rings */}
      <svg viewBox="0 0 200 200" className="term-countdown-svg" aria-label="Term countdown">
        <defs>
          <radialGradient id="dial-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0.38)" />
            <stop offset="70%"  stopColor="rgba(0,0,0,0.14)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Radial gradient background */}
        <circle cx={CX} cy={100} r={93} fill="url(#dial-bg)" />

        {/* Rings */}
        {RINGS.map(({ key, r, color }, i) => {
          const frac   = mounted ? ringFracs[i] : 0;
          const circ   = 2 * Math.PI * r;
          const offset = circ * (1 - frac);
          const isFast = i === 0;
          return (
            <g key={key}>
              <circle cx={CX} cy={100} r={r} fill="none" stroke={color} strokeWidth={SW} opacity={0.07} />
              <circle
                cx={CX} cy={100} r={r}
                fill="none" stroke={color} strokeWidth={SW}
                strokeLinecap={isFast ? "butt" : "round"}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${CX} 100)`}
                style={{
                  opacity: 0.95 - i * 0.09,
                  transition: isFast
                    ? "stroke-dashoffset 0.9s linear"
                    : "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
              {isFast && <circle cx={CX} cy={100 - r} r={SW / 2} fill={color} opacity={0.95} />}
            </g>
          );
        })}

        {/* 12/3/6/9 o'clock tick marks just outside the weeks ring */}
        {[0, 90, 180, 270].map(deg => {
          const rad = (deg - 90) * Math.PI / 180;
          return (
            <line
              key={deg}
              x1={CX + Math.cos(rad) * 93} y1={100 + Math.sin(rad) * 93}
              x2={CX + Math.cos(rad) * 98} y2={100 + Math.sin(rad) * 98}
              stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"
            />
          );
        })}

        {/* Centre hub — PrimaryAI logo */}
        <circle cx={CX} cy={100} r={16} fill="var(--surface)" opacity={0.88} />
        <g transform="translate(90 90) scale(0.842)" opacity={0.88}>
          {/* Roof — orange */}
          <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5"
            stroke="#ff9f43" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* House walls */}
          <path d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12"
            stroke="var(--text)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Book right page */}
          <path d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12"
            stroke="var(--text)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Book spine */}
          <path d="M12,12.2 v8.1"
            stroke="var(--text)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Book left page */}
          <path d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12"
            stroke="var(--text)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Sweeping second hand — Countdown-style */}
        <g
          transform={`rotate(${-(now.getSeconds() / 60) * 360} ${CX} 100)`}
          style={{ transition: "transform 0.9s linear" }}
        >
          {/* Fading sector trail — wider & fainter further behind the hand */}
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#f59e0b" strokeWidth="30" strokeLinecap="butt" opacity="0.025" transform={`rotate(50 ${CX} 100)`} />
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#f59e0b" strokeWidth="20" strokeLinecap="butt" opacity="0.05"  transform={`rotate(28 ${CX} 100)`} />
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#f59e0b" strokeWidth="12" strokeLinecap="butt" opacity="0.08"  transform={`rotate(14 ${CX} 100)`} />
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#f59e0b" strokeWidth="6"  strokeLinecap="butt" opacity="0.14"  transform={`rotate(5 ${CX} 100)`} />
          {/* Main hand */}
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="butt" opacity="0.95" />
        </g>

        {/* Stopwatch frame — double bezel, crown with stem, side buttons */}
        <g opacity={0.25} stroke="var(--text)" strokeLinecap="round" strokeLinejoin="round">
          {/* Outer bezel */}
          <circle cx={CX} cy={100} r={97} fill="none" strokeWidth="2.2" />
          {/* Inner bezel — creates double-ring case effect */}
          <circle cx={CX} cy={100} r={91} fill="none" strokeWidth="1.2" />
          {/* Crown stem (narrow, connects circle top to button) */}
          <rect x={98} y={-4} width={4} height={7} rx={1} fill="var(--text)" stroke="none" />
          {/* Crown button (wide rounded rectangle) */}
          <rect x={93} y={-13} width={14} height={9} rx={3} fill="none" strokeWidth="2" />
          {/* Left side button (~10:30), rotated to follow the case curvature */}
          <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.2} fill="none" strokeWidth="1.8"
            transform={`translate(35 22) rotate(230)`} />
          {/* Right side button (~1:30) */}
          <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.2} fill="none" strokeWidth="1.8"
            transform={`translate(165 22) rotate(310)`} />
        </g>
      </svg>

      {/* Right: numeric readout */}
      <div className="term-countdown-right">
        <div className="term-countdown-legend">
          {[
            { groupLabel: "Term",      keys: ["W", "D"] },
            { groupLabel: "Today 4pm", keys: ["H", "M", "S"] },
          ].map(({ groupLabel, keys }) => {
            const groupRings = [...RINGS].reverse().filter(({ key }) => keys.includes(key));
            return (
              <div key={groupLabel} className="term-countdown-group">
                <span className="term-countdown-group-name">{groupLabel}</span>
                <div className="term-countdown-group-items">
                  {groupRings.map(({ key, label, color }) => {
                    const vi = RINGS.findIndex(r => r.key === key);
                    const rem = remaining[vi];
                    const fmt = (v: number) => key === "W" ? v.toFixed(1) : v.toLocaleString();
                    return (
                      <React.Fragment key={key}>
                        <span className="term-countdown-legend-unit">{label}</span>
                        <span className="term-countdown-legend-val" style={{ color }}>{fmt(rem)}</span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    <p style={{
      margin: "0.35rem 0 0",
      padding: "0 0.75rem 0.6rem",
      fontSize: "0.72rem",
      color: "var(--muted)",
      textAlign: "center",
      letterSpacing: "0.01em",
    }}>
      {termStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      {" – "}
      {termEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
    </p>
      {toast && (
        <div className="term-countdown-toast" role="status">
          🎉 {toast}
        </div>
      )}
    </>
  );
}
