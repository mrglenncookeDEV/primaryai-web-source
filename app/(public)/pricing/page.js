import Link from "next/link";
import Nav from "@/components/marketing/Nav";

export default function PricingPage() {
  return (
    <main className="page-wrap">
      <Nav />
      <h1>Pricing</h1>
      <div className="grid one">
        <article className="card">
          <h2>Starter</h2>
          <p>£19/mo</p>
          <ul>
            <li>Core access</li>
            <li>Email support</li>
          </ul>
          <form action="/api/checkout" method="post">
            <input type="hidden" name="plan" value="starter" />
            <button type="submit">Get Started</button>
          </form>
        </article>
      </div>
      <Link href="/" className="chip">
        Back to Home
      </Link>
    </main>
  );
}
