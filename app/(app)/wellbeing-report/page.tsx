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
