import Nav from "@/components/marketing/Nav";

export default function FeaturesPage() {
  return (
    <main className="page-wrap">
      <Nav />
      <h1>Features</h1>
      <div className="grid two">
        <section className="card">
          <h2>Subscription Entitlements</h2>
          <p className="muted">Gate premium product features based on active plan.</p>
        </section>
        <section className="card">
          <h2>Self-Serve Billing</h2>
          <p className="muted">Checkout and portal routes for upgrades, downgrades, and cancellations.</p>
        </section>
      </div>
    </main>
  );
}
