"use client";

import { useEffect, useRef, useState } from "react";

const MOOD_EMOJIS = ["😫", "😟", "😐", "🙂", "😊"];

type WeekStats = {
  weekStart: string;
  scheduledMins: number;
  cappedMins: number;
  eveningsProtected: number;
  eveningsTotal: number;
  lunchesProtected: number;
  lunchesTotal: number;
  overloadDays: number;
  avgMood: number | null;
};

type Summary = {
  thisWeek: {
    scheduledMins: number;
    workCapacityMins: number;
    eveningsProtected: number;
    lunchesProtected: number;
    overloadDays: number;
    trend: "improving" | "stable" | "worsening";
  };
  allTime: {
    eveningsProtected: number;
    eveningsTotal: number;
    lunchesProtected: number;
    lunchesTotal: number;
    weeksAnalysed: number;
  };
  settings: {
    workDayStart: string;
    workDayEnd: string;
    effectiveDayMins: number;
  };
  weeks: WeekStats[];
};

function prettyDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMins(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type CapsulePoint = {
  value: number;
  index: number;
  x: number;
  y: number;
  y1: number;
  y2: number;
  h: number;
  isMax: boolean;
  isMin: boolean;
};

function capsuleChart(values: Array<number | null>, min: number, max: number, width = 430, height = 190) {
  const plotTop = 42;
  const plotBottom = height - 34;
  const barWidth = values.length > 8 ? 14 : 18;
  const usable = values
    .map((value, index) => ({ value, index }))
    .filter((item): item is { value: number; index: number } => item.value !== null && Number.isFinite(item.value));
  if (usable.length === 0) return { width, height, barWidth, points: [] as CapsulePoint[] };

  const maxValue = Math.max(...usable.map((item) => item.value));
  const minValue = Math.min(...usable.map((item) => item.value));
  const firstMax = usable.find((item) => item.value === maxValue)?.index;
  const firstMin = usable.find((item) => item.value === minValue)?.index;
  const xStep = values.length > 1 ? (width - 52) / (values.length - 1) : 0;
  const range = Math.max(1, max - min);

  const points = usable.map((item) => {
    const normal = (clamp(item.value, min, max) - min) / range;
    const x = values.length > 1 ? 26 + item.index * xStep : width / 2;
    const y = plotBottom - normal * (plotBottom - plotTop);
    const h = 34 + normal * 54;
    return {
      value: item.value,
      index: item.index,
      x,
      y,
      y1: clamp(y - h / 2, plotTop, plotBottom - 22),
      y2: clamp(y + h / 2, plotTop + 22, plotBottom),
      h,
      isMax: item.index === firstMax,
      isMin: item.index === firstMin,
    };
  });

  return { width, height, barWidth, points };
}

function calloutX(x: number, width: number) {
  return clamp(x - 20, 10, width - 84);
}

function AppleLineChart({
  title,
  value,
  subtitle,
  values,
  min,
  max,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  values: Array<number | null>;
  min: number;
  max: number;
  color: string;
}) {
  const chart = capsuleChart(values, min, max);
  const maxPoint = chart.points.find((point) => point.isMax);
  const minPoint = chart.points.find((point) => point.isMin);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "0.9rem 1rem", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "0.15rem" }}>
        <div>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.76rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{title}</p>
          <p style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1, fontWeight: 800, color }}>{value}</p>
        </div>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.74rem", textAlign: "right", lineHeight: 1.4, maxWidth: 150 }}>{subtitle}</p>
      </div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} width="100%" height="178" role="img" aria-label={`${title} trend`}>
        {chart.points.map((point) => (
          <rect
            key={`ghost-${point.index}`}
            x={point.x - chart.barWidth / 2}
            y={Math.max(28, point.y1 - 18)}
            width={chart.barWidth}
            height={Math.min(86, point.y2 - point.y1 + 32)}
            rx={chart.barWidth / 2}
            fill="currentColor"
            opacity="0.1"
          />
        ))}
        {chart.points.map((point) => (
          <rect
            key={point.index}
            x={point.x - chart.barWidth / 2}
            y={point.y1}
            width={chart.barWidth}
            height={Math.max(20, point.y2 - point.y1)}
            rx={chart.barWidth / 2}
            fill={color}
            opacity={point.isMax || point.isMin ? 1 : 0.92}
          />
        ))}
        {maxPoint && (
          <>
            <circle cx={maxPoint.x} cy={maxPoint.y1 + 10} r="5.2" fill="var(--surface)" stroke={color} strokeWidth="3" />
            <text x={calloutX(maxPoint.x, chart.width)} y="24" fill={color} fontSize="18" fontWeight="800" letterSpacing="4">MAX</text>
            <text x={calloutX(maxPoint.x, chart.width)} y="58" fill={color} fontSize="34" fontWeight="500">{Math.round(maxPoint.value)}</text>
          </>
        )}
        {minPoint && minPoint.index !== maxPoint?.index && (
          <>
            <circle cx={minPoint.x} cy={minPoint.y2 - 10} r="5.2" fill="var(--surface)" stroke={color} strokeWidth="3" />
            <text x={calloutX(minPoint.x, chart.width)} y={chart.height - 32} fill={color} fontSize="18" fontWeight="800" letterSpacing="4">MIN</text>
            <text x={calloutX(minPoint.x, chart.width)} y={chart.height - 2} fill={color} fontSize="34" fontWeight="500">{Math.round(minPoint.value)}</text>
          </>
        )}
        {values.map((item, index) => item === null && (
          <rect
            key={`empty-${index}`}
            x={(values.length > 1 ? 26 + index * ((chart.width - 52) / (values.length - 1)) : chart.width / 2) - chart.barWidth / 2}
            y="54"
            width={chart.barWidth}
            height="66"
            rx={chart.barWidth / 2}
            fill="currentColor"
            opacity="0.16"
          />
        ))}
      </svg>
    </div>
  );
}

function printChartSvg(values: Array<number | null>, min: number, max: number, color: string) {
  const chart = capsuleChart(values, min, max);
  const bars = chart.points.map((point) => `
    <rect x="${point.x - chart.barWidth / 2}" y="${Math.max(28, point.y1 - 18)}" width="${chart.barWidth}" height="${Math.min(86, point.y2 - point.y1 + 32)}" rx="${chart.barWidth / 2}" fill="#94a3b8" opacity="0.16"/>
    <rect x="${point.x - chart.barWidth / 2}" y="${point.y1}" width="${chart.barWidth}" height="${Math.max(20, point.y2 - point.y1)}" rx="${chart.barWidth / 2}" fill="${color}" opacity="${point.isMax || point.isMin ? "1" : "0.9"}"/>
    ${point.isMax ? `<circle cx="${point.x}" cy="${point.y1 + 10}" r="5" fill="#fff" stroke="${color}" stroke-width="3"/>` : ""}
    ${point.isMin ? `<circle cx="${point.x}" cy="${point.y2 - 10}" r="5" fill="#fff" stroke="${color}" stroke-width="3"/>` : ""}
  `).join("");
  return `<svg viewBox="0 0 ${chart.width} ${chart.height}" width="100%" height="120" xmlns="http://www.w3.org/2000/svg">
    <rect width="${chart.width}" height="${chart.height}" rx="12" fill="#f8fafc"/>
    ${bars}
  </svg>`;
}

export default function WellbeingReportPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState(6);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks]);

  async function load() {
    setLoading(true);
    const [summaryRes, profileRes] = await Promise.all([
      fetch(`/api/wellbeing/summary?weeks=${weeks}`, { cache: "no-store" }),
      fetch("/api/profile", { cache: "no-store" }),
    ]);
    const summaryData = await summaryRes.json().catch(() => ({}));
    const profileData = await profileRes.json().catch(() => ({}));
    if (summaryData?.summary) setSummary(summaryData.summary);
    if (profileData?.displayName) setDisplayName(profileData.displayName);
    setLoading(false);
  }

  function handlePrint() {
    if (!summary || !printRef.current) return;

    const name = displayName ? `${displayName.split(" ")[0]}'s` : "My";
    const eveningPct = summary.allTime.eveningsTotal > 0
      ? Math.round((summary.allTime.eveningsProtected / summary.allTime.eveningsTotal) * 100) : 100;
    const workloadPct = summary.thisWeek.workCapacityMins > 0
      ? Math.round((summary.thisWeek.scheduledMins / summary.thisWeek.workCapacityMins) * 100) : 0;
    const workloadColor = workloadPct > 110 ? "#ef4444" : workloadPct > 90 ? "#f59e0b" : "#22c55e";
    const workloadSeries = summary.weeks.map((w) =>
      summary.settings.effectiveDayMins > 0 ? Math.round((w.scheduledMins / (summary.settings.effectiveDayMins * 5)) * 100) : 0
    );
    const moodSeries = summary.weeks.map((w) => w.avgMood);
    const eveningsSeries = summary.weeks.map((w) => w.eveningsProtected);

    const weekRows = summary.weeks.map((w) => {
      const pct = summary.settings.effectiveDayMins > 0
        ? Math.round((w.scheduledMins / (summary.settings.effectiveDayMins * 5)) * 100) : 0;
      const barColor = pct > 110 ? "#ef4444" : pct > 90 ? "#f59e0b" : "#22c55e";
      const barWidth = Math.min(pct, 130);
      const moodEmoji = w.avgMood != null ? MOOD_EMOJIS[Math.round(w.avgMood) - 1] : "–";
      return `<tr>
        <td class="date">${prettyDate(w.weekStart)}</td>
        <td class="mins">${fmtMins(w.scheduledMins)}</td>
        <td class="pct" style="color:${barColor};">${pct}%</td>
        <td class="bar"><div style="width:${barWidth}%;height:8px;background:${barColor};border-radius:4px;"></div></td>
        <td class="eve">${w.eveningsProtected}/5</td>
        <td class="mood">${moodEmoji}</td>
        <td class="flags">${w.overloadDays > 0 ? `⚠ ${w.overloadDays} overloaded day${w.overloadDays > 1 ? "s" : ""}` : "✓ OK"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${name} Wellbeing Report</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 1.5cm; }
  h1 { font-size: 16pt; margin: 0 0 0.15rem; }
  .subtitle { font-size: 10pt; color: #64748b; margin: 0 0 1.5rem; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; margin-bottom: 1.5rem; }
  .stat { border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.6rem 0.8rem; text-align: center; }
  .stat-value { font-size: 20pt; font-weight: 800; margin: 0 0 0.1rem; }
  .stat-label { font-size: 8.5pt; color: #64748b; margin: 0; }
  .charts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; margin-bottom: 1.5rem; }
  .chart { border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.55rem; }
  .chart-title { margin: 0 0 0.1rem; font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: 700; }
  .chart-value { margin: 0 0 0.45rem; font-size: 14pt; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #1e293b; color: #fff; padding: 0.4rem 0.5rem; text-align: left; font-size: 8.5pt; }
  td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  td.date { font-weight: 600; }
  td.pct { font-weight: 700; }
  td.eve { color: #16a34a; font-weight: 600; }
  td.mood { font-size: 12pt; text-align: center; }
  td.flags { font-size: 8.5pt; color: #64748b; }
  .footer { margin-top: 1.5rem; font-size: 8pt; color: #94a3b8; text-align: center; }
  @media print { body { margin: 1cm; } }
</style>
</head>
<body>
  <h1>${name} Workload & Wellbeing Report</h1>
  <p class="subtitle">Generated ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Last ${summary.allTime.weeksAnalysed} weeks · Working hours ${summary.settings.workDayStart.slice(0,5)}–${summary.settings.workDayEnd.slice(0,5)}</p>

  <div class="stats">
    <div class="stat">
      <p class="stat-value" style="color:${workloadColor};">${workloadPct}%</p>
      <p class="stat-label">This week's workload vs capacity</p>
    </div>
    <div class="stat">
      <p class="stat-value" style="color:#16a34a;">${summary.thisWeek.eveningsProtected}/5</p>
      <p class="stat-label">Evenings protected this week</p>
    </div>
    <div class="stat">
      <p class="stat-value" style="color:#2563eb;">${eveningPct}%</p>
      <p class="stat-label">Evenings free (${summary.allTime.weeksAnalysed}-week average)</p>
    </div>
  </div>

  <div class="charts">
    <div class="chart">
      <p class="chart-title">Workload</p>
      <p class="chart-value" style="color:${workloadColor};">${workloadPct}%</p>
      ${printChartSvg(workloadSeries, 0, Math.max(120, ...workloadSeries), workloadColor)}
    </div>
    <div class="chart">
      <p class="chart-title">Mood</p>
      <p class="chart-value" style="color:#a855f7;">${moodSeries.filter((v) => v != null).length ? `${(moodSeries.filter((v): v is number => v != null).reduce((s, v) => s + v, 0) / moodSeries.filter((v) => v != null).length).toFixed(1)}/5` : "No data"}</p>
      ${printChartSvg(moodSeries, 1, 5, "#a855f7")}
    </div>
    <div class="chart">
      <p class="chart-title">Evenings protected</p>
      <p class="chart-value" style="color:#16a34a;">${summary.thisWeek.eveningsProtected}/5</p>
      ${printChartSvg(eveningsSeries, 0, 5, "#16a34a")}
    </div>
  </div>

  <table>
    <thead><tr><th>Week</th><th>Scheduled</th><th>% Capacity</th><th style="width:120px">Load</th><th>Evenings</th><th>Mood</th><th>Notes</th></tr></thead>
    <tbody>${weekRows}</tbody>
  </table>

  <p class="footer">Generated by PrimaryAI · primaryai.org.uk · Workload protection for primary teachers</p>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  if (loading) {
    return <div style={{ padding: "3rem", color: "var(--muted)", fontSize: "0.9rem" }}>Loading report…</div>;
  }

  if (!summary) {
    return <div style={{ padding: "3rem", color: "#ef4444", fontSize: "0.9rem" }}>Could not load wellbeing data.</div>;
  }

  const { thisWeek, allTime, settings } = summary;
  const workloadPct = thisWeek.workCapacityMins > 0
    ? Math.round((thisWeek.scheduledMins / thisWeek.workCapacityMins) * 100) : 0;
  const eveningPct = allTime.eveningsTotal > 0
    ? Math.round((allTime.eveningsProtected / allTime.eveningsTotal) * 100) : 100;
  const workloadColor = workloadPct > 110 ? "#ef4444" : workloadPct > 90 ? "#f59e0b" : "#22c55e";
  const workloadSeries = summary.weeks.map((w) =>
    settings.effectiveDayMins > 0 ? Math.round((w.scheduledMins / (settings.effectiveDayMins * 5)) * 100) : 0
  );
  const moodSeries = summary.weeks.map((w) => w.avgMood);
  const moodValues = moodSeries.filter((value): value is number => value !== null);
  const avgMood = moodValues.length > 0
    ? Math.round((moodValues.reduce((sum, value) => sum + value, 0) / moodValues.length) * 10) / 10
    : null;
  const eveningsSeries = summary.weeks.map((w) => w.eveningsProtected);
  const workloadMax = Math.max(120, ...workloadSeries);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "0 0 0.2rem" }}>Wellbeing Report</h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>
            Last {allTime.weeksAnalysed} weeks · {settings.workDayStart.slice(0,5)}–{settings.workDayEnd.slice(0,5)} working hours
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            style={{ padding: "0.4rem 0.65rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: "0.82rem", fontFamily: "inherit" }}
          >
            <option value={4}>4 weeks</option>
            <option value={6}>6 weeks</option>
            <option value={12}>12 weeks</option>
          </select>
          <button
            type="button"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.9rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print / Share PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{ background: `color-mix(in srgb, ${workloadColor} 8%, var(--surface))`, border: `1px solid color-mix(in srgb, ${workloadColor} 25%, var(--border))`, borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "2rem", fontWeight: 800, color: workloadColor, lineHeight: 1 }}>{workloadPct}%</p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>workload vs capacity</p>
        </div>
        <div style={{ background: "color-mix(in srgb, #22c55e 8%, var(--surface))", border: "1px solid color-mix(in srgb, #22c55e 25%, var(--border))", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "2rem", fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>
            {thisWeek.eveningsProtected}<span style={{ fontSize: "1rem", fontWeight: 600 }}>/5</span>
          </p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>evenings protected this week</p>
        </div>
        <div style={{ background: "color-mix(in srgb, #3b82f6 8%, var(--surface))", border: "1px solid color-mix(in srgb, #3b82f6 25%, var(--border))", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
          <p style={{ margin: "0 0 0.15rem", fontSize: "2rem", fontWeight: 800, color: "#2563eb", lineHeight: 1 }}>{eveningPct}%</p>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)" }}>evenings free ({allTime.weeksAnalysed}-week avg)</p>
        </div>
      </div>

      {/* Trend charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <AppleLineChart
          title="Workload"
          value={`${workloadPct}%`}
          subtitle="Scheduled time against weekly working capacity"
          values={workloadSeries}
          min={0}
          max={workloadMax}
          color={workloadColor}
        />
        <AppleLineChart
          title="Mood"
          value={avgMood != null ? `${avgMood}/5` : "No data"}
          subtitle="Average of daily check-ins logged this period"
          values={moodSeries}
          min={1}
          max={5}
          color="#a855f7"
        />
        <AppleLineChart
          title="Evenings"
          value={`${thisWeek.eveningsProtected}/5`}
          subtitle="Protected evenings across each school week"
          values={eveningsSeries}
          min={0}
          max={5}
          color="#16a34a"
        />
      </div>

      {/* Week-by-week table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.1rem", borderBottom: "1px solid var(--border)" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>Week-by-week breakdown</p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["Week", "Scheduled", "Capacity %", "Load", "Evenings free", "Mood", ""].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 700, fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.weeks.map((w) => {
                const pct = settings.effectiveDayMins > 0
                  ? Math.round((w.scheduledMins / (settings.effectiveDayMins * 5)) * 100) : 0;
                const c = pct > 110 ? "#ef4444" : pct > 90 ? "#f59e0b" : "#22c55e";
                return (
                  <tr key={w.weekStart} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>{prettyDate(w.weekStart)}</td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "var(--muted)" }}>{fmtMins(w.scheduledMins)}</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: c }}>{pct}%</td>
                    <td style={{ padding: "0.55rem 0.75rem", width: "100px" }}>
                      <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(pct, 130)}%`, height: "100%", background: c, borderRadius: "3px" }} />
                      </div>
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", color: "#16a34a", fontWeight: 600 }}>{w.eveningsProtected}/5</td>
                    <td style={{ padding: "0.55rem 0.75rem", fontSize: "1rem", textAlign: "center" }}>
                      {w.avgMood != null ? MOOD_EMOJIS[Math.round(w.avgMood) - 1] : <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>–</span>}
                    </td>
                    <td style={{ padding: "0.55rem 0.75rem", fontSize: "0.75rem", color: w.overloadDays > 0 ? "#f97316" : "#16a34a" }}>
                      {w.overloadDays > 0 ? `⚠ ${w.overloadDays} heavy day${w.overloadDays > 1 ? "s" : ""}` : "✓ On track"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: "1.25rem", fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
        Share this report with your line manager or union rep to evidence your workload.
        Use <strong>Print / Share PDF</strong> to save as a PDF file.
      </p>

      <div ref={printRef} />
    </div>
  );
}
