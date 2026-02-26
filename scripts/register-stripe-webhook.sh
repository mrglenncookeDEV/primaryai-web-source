#!/usr/bin/env bash
set -euo pipefail

# Auto-load .env.local if present and vars not already set.
if [ -f "$(dirname "$0")/../.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env.local"
  set +a
fi

if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI is required: https://stripe.com/docs/stripe-cli"
  exit 1
fi

if [ -z "${NEXT_PUBLIC_APP_URL:-}" ]; then
  echo "NEXT_PUBLIC_APP_URL is required."
  exit 1
fi

if [ -z "${STRIPE_SECRET_KEY:-}" ]; then
  echo "STRIPE_SECRET_KEY is required."
  exit 1
fi

WEBHOOK_URL="${NEXT_PUBLIC_APP_URL%/}/api/stripe/webhook"

stripe webhook_endpoints create \
  --api-key "$STRIPE_SECRET_KEY" \
  --url "$WEBHOOK_URL" \
  --enabled-events checkout.session.completed \
  --enabled-events customer.subscription.updated \
  --enabled-events customer.subscription.deleted \
  --enabled-events invoice.paid \
  --enabled-events invoice.payment_failed

echo "Stripe webhook endpoint created: $WEBHOOK_URL"
echo "Set STRIPE_WEBHOOK_SECRET in .env.local using the returned signing secret."
