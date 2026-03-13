"use client";

import { useEffect, useState } from "react";

const INITIAL_CLOCK_TIME = new Date("2024-01-01T09:00:00.000Z");

function coord(value: number) {
  return Number(value.toFixed(3));
}

export function DashboardClock() {
  const [now, setNow] = useState(INITIAL_CLOCK_TIME);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toRad = (d: number) => (d - 90) * Math.PI / 180;
  const hourDeg = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
  const minDeg  = now.getMinutes() * 6 + now.getSeconds() * 0.1;
  const secDeg  = now.getSeconds() * 6;

  return (
    <svg viewBox="0 0 60 60" className="dashboard-clock" aria-label="Current time">
      {/* Face */}
      <rect x={1} y={1} width={58} height={58} rx={13} fill="white" />
      <rect x={1} y={1} width={58} height={58} rx={13} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
      {/* Tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const rad = (i * 30 - 90) * Math.PI / 180;
        const isMain = i % 3 === 0;
        return (
          <line key={i}
            x1={coord(30 + (isMain ? 20 : 22) * Math.cos(rad))} y1={coord(30 + (isMain ? 20 : 22) * Math.sin(rad))}
            x2={coord(30 + 25 * Math.cos(rad))}                  y2={coord(30 + 25 * Math.sin(rad))}
            stroke="#1c1c1e" strokeWidth={isMain ? 1.8 : 0.9} strokeLinecap="round" opacity={isMain ? 1 : 0.5}
          />
        );
      })}
      {/* 12 / 3 / 6 / 9 */}
      {([12, 3, 6, 9] as const).map((n, i) => {
        const rad = (i * 90 - 90) * Math.PI / 180;
        return (
          <text key={n} x={coord(30 + 15 * Math.cos(rad))} y={coord(30 + 15 * Math.sin(rad))}
            textAnchor="middle" dominantBaseline="central"
            fontSize="7" fontWeight="700" fill="#1c1c1e" fontFamily="-apple-system, system-ui, sans-serif"
          >{n}</text>
        );
      })}
      {/* Hour hand */}
      <line x1={30} y1={30} x2={coord(30 + 11 * Math.cos(toRad(hourDeg)))} y2={coord(30 + 11 * Math.sin(toRad(hourDeg)))}
        stroke="#1c1c1e" strokeWidth="3.2" strokeLinecap="round" />
      {/* Minute hand */}
      <line x1={30} y1={30} x2={coord(30 + 18 * Math.cos(toRad(minDeg)))} y2={coord(30 + 18 * Math.sin(toRad(minDeg)))}
        stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" />
      {/* Second hand */}
      <line
        x1={coord(30 - 6 * Math.cos(toRad(secDeg)))} y1={coord(30 - 6 * Math.sin(toRad(secDeg)))}
        x2={coord(30 + 22 * Math.cos(toRad(secDeg)))} y2={coord(30 + 22 * Math.sin(toRad(secDeg)))}
        stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"
      />
      {/* Centre dot */}
      <circle cx={30} cy={30} r={2.2} fill="#f59e0b" />
      <circle cx={30} cy={30} r={0.9} fill="white" />
    </svg>
  );
}
