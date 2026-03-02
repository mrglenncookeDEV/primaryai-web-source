import { getAuthSession } from "@/lib/auth";
import { getEntitlementsForUser } from "@/lib/entitlements";

export default async function DashboardPage() {
  const session = await getAuthSession();
  const entitlements = await getEntitlementsForUser(session?.userId);

  return (
    <main className="page-wrap">
      <h1>Dashboard</h1>
      <p className="muted">Your workspace for testing lesson generation and platform access.</p>
      <div className="card">
        <p>User: {session?.email || "unknown"}</p>
        <p>Plan: {entitlements?.planName || "none"}</p>
        <p>Feature Access: {entitlements?.features?.join(", ") || "none"}</p>
      </div>
      <div className="card">
        <h2>Lesson Engine</h2>
        <p className="muted">Generate structured lesson packs with provider fallback + validation.</p>
        <div className="stack">
          <a className="button" href="/lesson-pack">
            Open Lesson Pack Generator
          </a>
          <a className="button" href="/api/subscriptions/status">
            Check Subscription Status API
          </a>
        </div>
      </div>
      <div className="card">
        <h2>What Is Live Right Now</h2>
        <ul>
          <li>`/lesson-pack` UI page and `/api/lesson-pack` route</li>
          <li>Schema validation + provider routing + cache + telemetry</li>
          <li>Vector retrieval and ingestion scripts are wired in code</li>
        </ul>
      </div>
    </main>
  );
}
