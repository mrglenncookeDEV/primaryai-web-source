import Nav from "@/components/marketing/Nav";

export default function FaqPage() {
  return (
    <main className="page-wrap">
      <Nav />
      <h1>FAQ</h1>
      <div className="card">
        <h2>When does billing start?</h2>
        <p className="muted">Billing starts when checkout completes successfully.</p>
      </div>
      <div className="card">
        <h2>Can I cancel anytime?</h2>
        <p className="muted">Yes, cancellations are handled in the billing portal.</p>
      </div>
    </main>
  );
}
