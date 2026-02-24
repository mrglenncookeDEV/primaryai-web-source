import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { getAuthSession } from "@/lib/auth";

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  let plan = "starter";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    plan = body.plan || plan;
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    plan = String(form.get("plan") || plan);
  }

  const session = await getAuthSession();
  const checkoutUrl = await createCheckoutSession({ plan, session });
  return NextResponse.redirect(checkoutUrl);
}
