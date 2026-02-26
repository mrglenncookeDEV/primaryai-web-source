import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const PRICE_ID_BY_PLAN = {
  starter: process.env.STRIPE_PRICE_STARTER,
};

function getStripeClient() {
  if (!stripeSecretKey) {
    return null;
  }
  return new Stripe(stripeSecretKey);
}

function getPlanByPriceId(priceId) {
  const pairs = Object.entries(PRICE_ID_BY_PLAN);
  const match = pairs.find(([, configuredPriceId]) => configuredPriceId && configuredPriceId === priceId);
  return match?.[0] || "starter";
}

function isSubscriptionActive(status) {
  return status === "active" || status === "trialing";
}

function getFeatureFlags(planName, subscriptionStatus) {
  if (!isSubscriptionActive(subscriptionStatus)) {
    return ["public-pages"];
  }

  if (planName === "pro") {
    return ["public-pages", "dashboard", "advanced-tools", "priority-support"];
  }

  return ["public-pages", "dashboard", "core-tools"];
}

async function recordWebhookEvent({ supabase, event }) {
  const { error } = await supabase.from("webhook_events").insert({
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });

  if (!error) {
    return { duplicate: false };
  }

  if (error.code === "23505") {
    return { duplicate: true };
  }

  throw new Error(`Failed to record webhook event: ${error.message}`);
}

async function ensureUserRecord({ supabase, userId, email }) {
  if (!userId || !email) {
    return;
  }

  const { error } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      role: "owner",
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }
}

async function resolveUserId({ supabase, userId, customerId, email }) {
  if (userId) {
    return userId;
  }

  if (customerId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (data?.user_id) {
      return data.user_id;
    }
  }

  if (email) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  }

  return null;
}

async function upsertSubscriptionAndEntitlements({
  supabase,
  userId,
  customerId,
  subscriptionId,
  planId,
  status,
  currentPeriodEndUnix,
}) {
  if (!userId || !subscriptionId) {
    return;
  }

  const currentPeriodEnd = currentPeriodEndUnix
    ? new Date(currentPeriodEndUnix * 1000).toISOString()
    : null;

  const { error: subscriptionError } = await supabase.from("subscriptions").upsert(
    {
      id: subscriptionId,
      user_id: userId,
      plan_id: planId,
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscriptionId,
      status,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: status === "canceled",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (subscriptionError) {
    throw new Error(`Failed to upsert subscription: ${subscriptionError.message}`);
  }

  const { error: entitlementError } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      plan_name: planId,
      feature_flags: getFeatureFlags(planId, status),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (entitlementError) {
    throw new Error(`Failed to upsert entitlements: ${entitlementError.message}`);
  }
}

function getMetadataValue(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getObjectId(value) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.length > 0) {
    return value.id;
  }
  return null;
}

async function processCheckoutCompleted({ supabase, event }) {
  const checkoutSession = event.data.object;
  const userId = getMetadataValue(checkoutSession.metadata?.user_id) || checkoutSession.client_reference_id;
  const userEmail = getMetadataValue(checkoutSession.metadata?.user_email) || checkoutSession.customer_email;
  const planFromMetadata = getMetadataValue(checkoutSession.metadata?.plan);
  const planByPrice = getPlanByPriceId(checkoutSession.metadata?.price_id);
  const planId = planFromMetadata || planByPrice || "starter";

  await ensureUserRecord({ supabase, userId, email: userEmail });

  await upsertSubscriptionAndEntitlements({
    supabase,
    userId,
    customerId: getObjectId(checkoutSession.customer),
    subscriptionId: getObjectId(checkoutSession.subscription),
    planId,
    status: "active",
    currentPeriodEndUnix: null,
  });

  return { status: "accepted", type: event.type, id: event.id };
}

async function processSubscriptionUpdated({ supabase, event }) {
  const subscription = event.data.object;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id || null;
  const planId = getPlanByPriceId(priceId);
  const email = getMetadataValue(subscription.metadata?.user_email) || null;
  const metadataUserId = getMetadataValue(subscription.metadata?.user_id) || null;

  const userId = await resolveUserId({
    supabase,
    userId: metadataUserId,
    customerId: getObjectId(subscription.customer),
    email,
  });

  await ensureUserRecord({ supabase, userId, email });
  await upsertSubscriptionAndEntitlements({
    supabase,
    userId,
    customerId: getObjectId(subscription.customer),
    subscriptionId: subscription.id,
    planId,
    status: subscription.status,
    currentPeriodEndUnix: subscription.current_period_end,
  });

  return { status: "accepted", type: event.type, id: event.id };
}

export async function createCheckoutSession({ plan = "starter", session = null }) {
  const stripe = getStripeClient();
  const priceId = PRICE_ID_BY_PLAN[plan] || PRICE_ID_BY_PLAN.starter;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!stripe || !priceId) {
    return new URL("/pricing?checkout=not-configured", appUrl).toString();
  }

  const metadata = {
    plan,
    price_id: priceId,
    user_id: session?.userId || "",
    user_email: session?.email || "",
  };

  const sessionOptions = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata,
    subscription_data: { metadata },
    customer_email: session?.email || undefined,
    client_reference_id: session?.userId || undefined,
  };

  const checkoutSession = await stripe.checkout.sessions.create(sessionOptions);
  return checkoutSession.url;
}

export async function createBillingPortalSession({ session = null }) {
  const stripe = getStripeClient();
  const supabase = getSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!session?.userId || !stripe || !supabase) {
    return new URL("/billing?portal=not-configured", appUrl).toString();
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", session.userId)
    .not("stripe_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.stripe_customer_id) {
    return new URL("/billing?portal=no-customer", appUrl).toString();
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });

  return portal.url;
}

export async function handleStripeWebhook({ payload, signature }) {
  const stripe = getStripeClient();
  const supabase = getSupabaseAdminClient();
  if (!stripe || !signature || !webhookSecret || !supabase) {
    return { status: "not-configured" };
  }

  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  const { duplicate } = await recordWebhookEvent({ supabase, event });
  if (duplicate) {
    return { status: "duplicate", type: event.type, id: event.id };
  }

  switch (event.type) {
    case "checkout.session.completed":
      return processCheckoutCompleted({ supabase, event });
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return processSubscriptionUpdated({ supabase, event });
    case "invoice.paid":
    case "invoice.payment_failed":
      return { status: "accepted", type: event.type, id: event.id };
    default:
      return { status: "ignored", type: event.type, id: event.id };
  }
}
