import Link from "next/link";
import Nav from "@/components/marketing/Nav";

const plans = [
  { name: "Starter", price: "£19/mo", features: ["Core access", "Email support"] },
  { name: "Pro", price: "£49/mo", features: ["All Starter", "Advanced tools", "Priority support"] },
];

export default function PricingPage() {
  return (
    <main className="page-wrap">
      <Nav />
      <h1>Pricing</h1>
      <div className="grid two">
        {plans.map((plan) => (
          <article key={plan.name} className="card">
            <h2>{plan.name}</h2>
            <p>{plan.price}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <form action="/api/checkout" method="post">
              <input type="hidden" name="plan" value={plan.name.toLowerCase()} />
              <button type="submit">Start {plan.name}</button>
            </form>
          </article>
        ))}
      </div>
      <p className="muted">
        Demo checkout endpoint currently returns a placeholder URL. Wire your Stripe price IDs in
        `lib/stripe.js`.
      </p>
      <Link href="/" className="chip">
        Back to Home
      </Link>
    </main>
  );
}
