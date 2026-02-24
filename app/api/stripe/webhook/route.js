import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe";

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  try {
    const result = await handleStripeWebhook({ payload, signature });
    return NextResponse.json({ ok: true, processed: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Webhook processing failed" },
      { status: 400 },
    );
  }
}
