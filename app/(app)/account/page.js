import { getAuthSession } from "@/lib/auth";

export default async function AccountPage() {
  const session = await getAuthSession();

  return (
    <main className="page-wrap">
      <h1>My Account</h1>
      <div className="card">
        <p>Email: {session?.email || "unknown"}</p>
        <p>User ID: {session?.userId || "unknown"}</p>
      </div>
    </main>
  );
}
