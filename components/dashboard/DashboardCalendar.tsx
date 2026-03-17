"use client";

import { useEffect, useRef, useState } from "react";

const MONTH_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const INITIAL_DATE = new Date("2024-01-15T12:00:00.000Z");

export function DashboardCalendar() {
  const [now, setNow] = useState(INITIAL_DATE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNow(new Date());

    function scheduleNext() {
      const n = new Date();
      const midnight = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
      const ms = midnight.getTime() - n.getTime();
      timeoutRef.current = setTimeout(() => {
        setNow(new Date());
        scheduleNext();
      }, ms);
    }

    scheduleNext();
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const month = MONTH_ABBR[now.getMonth()];
  const day = now.getDate();

  return (
    <div className="dashboard-calendar" aria-label={`${month} ${day}`}>
      <div className="dashboard-calendar-header">
        <span className="dashboard-calendar-month">{month}</span>
      </div>
      <div className="dashboard-calendar-body">
        <span className="dashboard-calendar-day">{day}</span>
      </div>
    </div>
  );
}
