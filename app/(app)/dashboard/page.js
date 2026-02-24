import { getAuthSession } from "@/lib/auth";
import { getEntitlementsForUser } from "@/lib/entitlements";

export default async function DashboardPage() {
  const session = await getAuthSession();
  const entitlements = await getEntitlementsForUser(session?.userId);

  return (
    <main className="page-wrap">
      <h1>Dashboard</h1>
      <p className="muted">Protected route. Middleware enforces auth.</p>
      <div className="card">
        <p>User: {session?.email || "unknown"}</p>
        <p>Plan: {entitlements?.planName || "none"}</p>
        <p>Feature Access: {entitlements?.features?.join(", ") || "none"}</p>
      </div>
    </main>
  );
}
