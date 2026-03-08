"use client";

import { useEffect, useState } from "react";
import { TermCountdownRing } from "@/components/dashboard/TermCountdownRing";
import Link from "next/link";

type ActiveTerm = {
  termName?: string;
  termStartDate?: string;
  termEndDate?: string;
  daysRemaining?: number;
} | null;

export default function CountdownWidgetPage() {
  const [activeTerm, setActiveTerm] = useState<ActiveTerm>(undefined as unknown as ActiveTerm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setActiveTerm(data?.activeTerm ?? null);
      })
      .catch(() => setActiveTerm(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      width: "min(420px, 100vw)",
      minHeight: "min(560px, 100dvh)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
      padding: "1rem",
      boxSizing: "border-box",
    }}>
      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading…</div>
      ) : activeTerm?.termStartDate && activeTerm?.termEndDate ? (
        <div style={{
          background: "var(--surface)",
          borderRadius: "20px",
          border: "1px solid var(--border-card)",
          overflow: "hidden",
          width: "100%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          <TermCountdownRing
            termName={activeTerm.termName || "Term"}
            termStartDate={activeTerm.termStartDate}
            termEndDate={activeTerm.termEndDate}
          />
        </div>
      ) : (
        <div style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 600, color: "white" }}>No active term</p>
          <p style={{ margin: "0 0 1.25rem" }}>Set your term dates in PrimaryAI to see your countdown.</p>
          <Link
            href="/settings"
            style={{
              display: "inline-block",
              padding: "0.5rem 1.25rem",
              borderRadius: "999px",
              background: "var(--accent)",
              color: "white",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Go to Settings
          </Link>
        </div>
      )}

      <div style={{
        fontSize: "0.65rem",
        color: "rgba(255,255,255,0.2)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}>
        PrimaryAI · Term Countdown
      </div>
    </div>
  );
}
