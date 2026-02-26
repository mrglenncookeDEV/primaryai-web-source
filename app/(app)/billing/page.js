export default function BillingPage() {
  return (
    <main className="page-wrap">
      <h1>Billing</h1>
      <p className="muted">Manage your subscription and payment methods.</p>
      <div className="card">
        <div className="stack">
          <form action="/api/checkout" method="post">
            <input type="hidden" name="plan" value="starter" />
            <button className="button" type="submit">
              Start / Upgrade Subscription
            </button>
          </form>
          <form action="/api/billing/portal" method="post">
            <button className="button" type="submit">
              Open Billing Portal
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
