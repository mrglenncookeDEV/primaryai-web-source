import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST(request) {
  const session = await getAuthSession();
  const base = new URL(request.url).origin;

  if (!session) {
    const loginUrl = new URL("/login", base);
    loginUrl.searchParams.set("next", "/billing");
    return NextResponse.redirect(loginUrl);
  }

  const portalUrl = await createBillingPortalSession({ session });
  return NextResponse.redirect(portalUrl);
}
