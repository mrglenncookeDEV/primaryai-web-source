"use client";
export const runtime = 'edge';

import dynamic from "next/dynamic";

const AiSchedulePanel = dynamic(() => import("@/components/dashboard/AiSchedulePanel"), {
  ssr: false,
  loading: () => (
    <div style={{
      borderRadius: "16px", border: "1px solid var(--border-card)",
      background: "var(--surface)", padding: "2rem 1.4rem",
      color: "var(--muted)", fontSize: "0.88rem",
    }}>
      Loading…
    </div>
  ),
});

export default function AiPlannerPage() {
  return (
    <main className="page-wrap" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
          AI Planner
        </h1>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
          Summarise your week, plan it from a description, check for subject gaps, or generate a full term plan from a curriculum document.
        </p>
      </div>
      <AiSchedulePanel />
    </main>
  );
}
