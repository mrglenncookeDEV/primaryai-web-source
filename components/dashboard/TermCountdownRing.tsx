"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  termName: string;
  termStartDate: string; // YYYY-MM-DD
  termEndDate: string;   // YYYY-MM-DD
};

const RINGS = [
  { key: "S", label: "Seconds", r: 28, color: "#ef4444", light: "#f87171", dark: "#7f1d1d" },
  { key: "M", label: "Minutes", r: 43, color: "#10b981", light: "#34d399", dark: "#064e3b" },
  { key: "H", label: "Hours",   r: 58, color: "#06b6d4", light: "#22d3ee", dark: "#155e75" },
  { key: "D", label: "Days",    r: 73, color: "#3b82f6", light: "#60a5fa", dark: "#1e3a8a" },
  { key: "W", label: "Weeks",   r: 88, color: "#f97316", light: "#fb923c", dark: "#7c2d12" },
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

const RING_COLORS = ["#ef4444", "#10b981", "#06b6d4", "#3b82f6", "#f97316"];

export function TermCountdownRing({ termName, termStartDate, termEndDate }: Props) {
  const [now, setNow]       = useState(() => new Date());
  const [bankHols, setBankHols] = useState<Set<string>>(new Set());
  const [toast, setToast]   = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" && document.documentElement.dataset.theme === "dark"
  );

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme === "dark");
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const [minuteFlash, setMinuteFlash] = useState(false);
  const prevMinute          = useRef<number>(-1);
  const prevDaysRef         = useRef<number>(-1);
  const toastTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Right-button red blink (×3) at the top of every minute
  useEffect(() => {
    if (now.getSeconds() !== 0) return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    const blink = (remaining: number) => {
      if (remaining <= 0) return;
      setMinuteFlash(true);
      flashTimer.current = setTimeout(() => {
        setMinuteFlash(false);
        flashTimer.current = setTimeout(() => blink(remaining - 1), 160);
      }, 220);
    };
    blink(6);
  }, [now]);

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

  const fc = isDark ? {
    base:    ["rgba(10,10,16,1)", "rgba(18,16,26,0.96)", "rgba(6,6,12,1)"],
    sheen:   ["rgba(90,110,200,0.14)", "rgba(70,55,130,0.07)", "rgba(255,255,255,0)"],
    vig:     ["rgba(0,0,0,0)", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.55)"],
    groove:  (_i: number) => 0.62,
    tick:    "rgba(255,255,255,0.70)",
    logo:    "rgba(220,215,210,0.85)",
  } : {
    base:    ["#ffffff", "#f5f4f2", "#e2e0dc"],
    sheen:   ["rgba(210,230,255,0.45)", "rgba(220,210,255,0.18)", "rgba(255,255,255,0)"],
    vig:     ["rgba(0,0,0,0)", "rgba(0,0,0,0.03)", "rgba(0,0,0,0.12)"],
    groove:  (i: number) => [0.52, 0.46, 0.40, 0.28, 0.02][i],
    tick:    "rgba(40,30,18,0.75)",
    logo:    "rgba(30,25,20,0.80)",
  };

  const CX = 100, SW = 11, GSW = 15;

  const sweepDeg = (now.getSeconds() / 60) * 360;

  function pieSector(r: number, fromDeg: number, toDeg: number): string {
    if (toDeg <= fromDeg) return "";
    if (toDeg >= 360) toDeg = 359.99;
    const toRad = (d: number) => -Math.PI / 2 + (d * Math.PI) / 180;
    const sr = toRad(fromDeg), er = toRad(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    const x1 = CX + r * Math.cos(sr), y1 = 100 + r * Math.sin(sr);
    const x2 = CX + r * Math.cos(er), y2 = 100 + r * Math.sin(er);
    return `M ${CX} 100 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <>
    <p style={{
      margin: "0 0 0.6rem",
      padding: "0 0 0 0.65rem",
      fontSize: "0.85rem",
      fontWeight: 600,
      color: "var(--text)",
      letterSpacing: "-0.01em",
    }}>
      {termName}
      <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: "0.4rem", fontSize: "0.8rem" }}>
        {termStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        {" – "}
        {termEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
      </span>
    </p>
    <div className="term-countdown-wrap">
      {/* Left: numeric readout */}
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

      {/* Right: rings */}
      <svg viewBox="0 0 200 200" className="term-countdown-svg" aria-label="Term countdown">
        <defs>
          {/* Dial face base — pearl in light mode, dark in dark mode */}
          <radialGradient id="pearl-base" cx="48%" cy="42%" r="56%">
            <stop offset="0%"   stopColor={fc.base[0]} />
            <stop offset="55%"  stopColor={fc.base[1]} />
            <stop offset="100%" stopColor={fc.base[2]} />
          </radialGradient>
          {/* Dial sheen */}
          <radialGradient id="pearl-sheen" cx="28%" cy="15%" r="65%">
            <stop offset="0%"   stopColor={fc.sheen[0]} />
            <stop offset="50%"  stopColor={fc.sheen[1]} />
            <stop offset="100%" stopColor={fc.sheen[2]} />
          </radialGradient>
          {/* Depth vignette */}
          <radialGradient id="dial-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={fc.vig[0]} />
            <stop offset="72%"  stopColor={fc.vig[1]} />
            <stop offset="100%" stopColor={fc.vig[2]} />
          </radialGradient>

          {/*
            Per-ring 3D pipe gradients — radial, centred on the dial.
            The gradient radius equals the outer edge of each stroke.
            This makes the centre of the stroke (= centre of the tube) the
            brightest point, with shadow at the inner and outer edges,
            giving a consistent cylindrical "bulge" on every ring.
          */}
          {RINGS.map(({ key, light, dark, r }, i) => {
            const outerEdge = r + SW / 2;
            const pct = (v: number) => `${((v / outerEdge) * 100).toFixed(2)}%`;
            // Light mode: use mid-tone edges so the full ring looks vivid, not pulled toward black
            const lightModeEdges = ["#b91c1c", "#059669", "#0e7490", "#1d4ed8", "#c2410c"];
            const edgeColor = isDark ? dark : lightModeEdges[i];
            return (
              <radialGradient key={key} id={`pipe-${key}`}
                cx={CX} cy={100} r={outerEdge}
                gradientUnits="userSpaceOnUse">
                <stop offset={pct(r - SW / 2)} stopColor={edgeColor} />
                <stop offset={pct(r)}           stopColor={light} />
                <stop offset="100%"             stopColor={edgeColor} />
              </radialGradient>
            );
          })}
          {/* ── Brushed-steel case defs ── */}
          {/* Annular mask: outer r=99, inner r=92 (clears the ring area) */}
          <mask id="bezel-mask">
            <circle cx={CX} cy={100} r={99} fill="white" />
            <circle cx={CX} cy={100} r={92} fill="black" />
          </mask>

          {/* Bezel radial gradient: dark inner/outer bevel edges, bright midband (3D torus) */}
          <radialGradient id="bezel-grad" cx={CX} cy={100} r={99} gradientUnits="userSpaceOnUse">
            <stop offset="92%"   stopColor="#1a1a1c" />
            <stop offset="93%"   stopColor="#727276" />
            <stop offset="94.5%" stopColor="#c4c4c8" />
            <stop offset="95.5%" stopColor="#ededef" />
            <stop offset="97%"   stopColor="#b8b8bc" />
            <stop offset="98%"   stopColor="#747478" />
            <stop offset="100%"  stopColor="#242428" />
          </radialGradient>

          {/* Specular glare at ~10 o'clock */}
          <radialGradient id="bezel-specular" cx="30%" cy="18%" r="42%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.62)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Directional brushed-grain filter (high horizontal frequency = fine lateral streaks) */}
          <filter id="steel-grain" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 1.6" numOctaves="2" seed="11" result="noise" />
            <feColorMatrix in="noise" type="matrix"
              values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.2 0" result="grain" />
            <feBlend in="SourceGraphic" in2="grain" mode="soft-light" result="grained" />
            <feComposite in="grained" in2="SourceGraphic" operator="in" />
          </filter>

          {/* Red button gradient — for minute-flash on right side button */}
          <linearGradient id="btn-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7f1d1d" />
            <stop offset="20%"  stopColor="#dc2626" />
            <stop offset="50%"  stopColor="#ef4444" />
            <stop offset="80%"  stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>

          {/* Sweep edge softener — gentle blur to dissolve sector/fan boundaries */}
          <filter id="sweep-blur" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>

          {/* Button/stem gradient — dark→bright→dark vertical banding, lathe-cut metal rod look */}
          <linearGradient id="btn-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2a2a2e" />
            <stop offset="8%"   stopColor="#848488" />
            <stop offset="22%"  stopColor="#bcbcc0" />
            <stop offset="38%"  stopColor="#dedee2" />
            <stop offset="50%"  stopColor="#ebebed" />
            <stop offset="62%"  stopColor="#d0d0d4" />
            <stop offset="78%"  stopColor="#909094" />
            <stop offset="92%"  stopColor="#606064" />
            <stop offset="100%" stopColor="#26262a" />
          </linearGradient>
        </defs>

        {/* Pearlescent dial face */}
        <circle cx={CX} cy={100} r={93} fill="url(#pearl-base)" />
        {/* Iridescent sheen overlay */}
        <circle cx={CX} cy={100} r={93} fill="url(#pearl-sheen)" />
        {/* Subtle centre depth vignette */}
        <circle cx={CX} cy={100} r={93} fill="url(#dial-bg)" />

        {/* ── Persistent elapsed sweep (stays filled as hand moves) ── */}
        {sweepDeg > 0.5 && (
          <path d={pieSector(90, 0, sweepDeg)} fill="#ef4444" opacity={0.13} />
        )}

        {/* Rings */}
        {RINGS.map(({ key, r, color }, i) => {
          const frac   = mounted ? ringFracs[i] : 0;
          const circ   = 2 * Math.PI * r;
          const offset = circ * (1 - frac);
          const isFast = i === 0;
          const transStyle = {
            transition: isFast
              ? "stroke-dashoffset 0.9s linear"
              : "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
          };
          return (
            <g key={key}>
              {/* ── Recessed groove ── */}
              <circle cx={CX} cy={100} r={r} fill="none"
                stroke={isDark ? `rgba(0,0,0,${fc.groove(i)})` : "#f0ede8"}
                strokeWidth={GSW} />

              {/* ── 3D pipe: vibrant gradient cylinder ── */}
              <circle
                cx={CX} cy={100} r={r}
                fill="none" stroke={`url(#pipe-${key})`} strokeWidth={SW}
                strokeLinecap="butt"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${CX} 100)`}
                style={transStyle}
              />
            </g>
          );
        })}


        {/* Centre hub — pearl disc */}
        <circle cx={CX} cy={100} r={16} fill="url(#pearl-base)" opacity={0.95} />
        <circle cx={CX} cy={100} r={16} fill="url(#pearl-sheen)" opacity={0.95} />
        <circle cx={CX} cy={100} r={16} fill="none" stroke="rgba(70,60,50,0.18)" strokeWidth="0.8" />
        <g transform="translate(90 90) scale(0.842)" opacity={0.88}>
          {/* Roof — orange */}
          <path d="M2.5,7.5 L11.5,3.1 c0.3,-0.15, 0.7,-0.15, 1,0 L21.5,7.5"
            stroke="#ff9f43" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* House walls */}
          <path d="M19.5,12 v6.5 c0,1.1, -0.9,2, -2,2 h-11 c-1.1,0, -2,-0.9, -2,-2 V12"
            stroke={fc.logo} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Book right page */}
          <path d="M19.5,12 C17.5,10.2, 14.5,10.2, 12,12"
            stroke={fc.logo} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Book spine */}
          <path d="M12,12.2 v8.1"
            stroke={fc.logo} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Book left page */}
          <path d="M12,12 C9.5,10.2, 6.5,10.2, 4.5,12"
            stroke={fc.logo} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Sweeping second hand — Countdown-style */}
        <g
          transform={`rotate(${-(now.getSeconds() / 60) * 360} ${CX} 100)`}
          style={{ transition: "transform 0.9s linear" }}
        >
          {/* Comet glow near hand */}
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#ef4444" strokeWidth="60" strokeLinecap="butt" opacity="0.06" transform={`rotate(28 ${CX} 100)`} />
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#ef4444" strokeWidth="30" strokeLinecap="butt" opacity="0.10" transform={`rotate(12 ${CX} 100)`} />
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#ef4444" strokeWidth="12" strokeLinecap="butt" opacity="0.15" transform={`rotate(4 ${CX} 100)`} />
          {/* Main hand */}
          <line x1={CX} y1={68} x2={CX} y2={9} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="butt" opacity="0.95" />
        </g>

        {/* Tick marks — 60 total, rendered on top of rings so they're visible */}
        {Array.from({ length: 60 }, (_, i) => {
          const angle = (i * 6 - 90) * Math.PI / 180;
          const isCardinal = i % 15 === 0;
          const isMajor    = i % 5 === 0;
          const outerR = 91.5;
          const innerR = isCardinal ? 83 : isMajor ? 87 : 90;
          const sw     = isCardinal ? 2.4 : isMajor ? 1.7 : 1.1;
          return (
            <line
              key={i}
              x1={CX + Math.cos(angle) * outerR}
              y1={100 + Math.sin(angle) * outerR}
              x2={CX + Math.cos(angle) * innerR}
              y2={100 + Math.sin(angle) * innerR}
              stroke={fc.tick}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Glass crystal dome ── */}
        {/* Edge refraction ring — subtle colour fringe where glass meets bezel */}
        <circle cx={CX} cy={100} r={91.8} fill="none"
          stroke="rgba(160,200,255,0.13)" strokeWidth={2.2} />
        {/* Main glass body — very subtle tinted fill */}
        <circle cx={CX} cy={100} r={92}
          fill="rgba(220,235,255,0.04)" />
        {/* Primary specular highlight — large soft oval near top-left */}
        <ellipse cx={CX - 18} cy={62} rx={28} ry={14}
          fill="rgba(255,255,255,0.18)"
          style={{ filter: "blur(4px)" }} />
        {/* Secondary glare — smaller, brighter, sharper */}
        <ellipse cx={CX - 10} cy={56} rx={12} ry={5}
          fill="rgba(255,255,255,0.38)" />
        {/* Thin crescent rim reflection along top arc */}
        <path
          d={`M ${CX - 58} 52 A 70 70 0 0 1 ${CX + 58} 52`}
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2}
          strokeLinecap="round" />
        {/* Bottom shadow — glass presses light downward */}
        <ellipse cx={CX} cy={156} rx={50} ry={10}
          fill="rgba(0,0,0,0.07)"
          style={{ filter: "blur(3px)" }} />

        {/* ── Brushed steel case ── */}
        {/* Bezel body — filled ring with 3D torus gradient */}
        <circle cx={CX} cy={100} r={99}
          fill="url(#bezel-grad)"
          mask="url(#bezel-mask)"
          filter="url(#steel-grain)"
        />
        {/* Specular glare overlay at ~10 o'clock */}
        <circle cx={CX} cy={100} r={99}
          fill="url(#bezel-specular)"
          mask="url(#bezel-mask)"
        />
        {/* Crisp outer rim highlight */}
        <circle cx={CX} cy={100} r={98.5}
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={0.8} />
        {/* Inner groove — separation between case and dial face */}
        <circle cx={CX} cy={100} r={92.5}
          fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={1.4} />
        <circle cx={CX} cy={100} r={91.8}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.7} />

        {/* Crown stem */}
        <rect x={98} y={-4} width={4} height={8} rx={1.2}
          fill="url(#btn-steel)" filter="url(#steel-grain)" />
        <rect x={98} y={-4} width={4} height={8} rx={1.2}
          fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={0.5} />

        {/* Crown button */}
        <rect x={93} y={-14} width={14} height={10} rx={3.5}
          fill="url(#btn-steel)" filter="url(#steel-grain)" />
        <rect x={93} y={-14} width={14} height={10} rx={3.5}
          fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={0.7} />
        <rect x={93} y={-14} width={14} height={10} rx={3.5}
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.4} />

        {/* Left side button (~10:30) */}
        <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.5}
          fill="url(#btn-steel)" filter="url(#steel-grain)"
          transform="translate(35 22) rotate(230)" />
        <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.5}
          fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={0.7}
          transform="translate(35 22) rotate(230)" />

        {/* Right side button (~1:30) — flashes red on the minute */}
        <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.5}
          fill={minuteFlash ? "url(#btn-red)" : "url(#btn-steel)"}
          filter="url(#steel-grain)"
          transform="translate(165 22) rotate(310)"
          style={{ transition: "fill 0.15s ease" }} />
        <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.5}
          fill="none" stroke={minuteFlash ? "rgba(180,0,0,0.7)" : "rgba(0,0,0,0.55)"} strokeWidth={0.7}
          transform="translate(165 22) rotate(310)" />
        {minuteFlash && (
          <rect x={-4.5} y={-5.5} width={9} height={11} rx={2.5}
            fill="rgba(239,68,68,0.35)"
            transform="translate(165 22) rotate(310)"
            style={{ filter: "blur(2px)" }} />
        )}
      </svg>

    </div>
      {toast && (
        <div className="term-countdown-toast" role="status">
          🎉 {toast}
        </div>
      )}
    </>
  );
}
