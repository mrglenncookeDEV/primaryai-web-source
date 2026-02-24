#!/usr/bin/env bash
set -euo pipefail

if [ -f ".env.local" ]; then
  echo ".env.local already exists. Leaving it unchanged."
  exit 0
fi

cp .env.example .env.local
echo "Created .env.local from .env.example"
echo "Fill in STRIPE_* and SUPABASE_* values before running live billing/auth."
