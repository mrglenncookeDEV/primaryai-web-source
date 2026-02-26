#!/usr/bin/env bash
set -euo pipefail

# Auto-load .env.local if present and vars not already set.
if [ -f "$(dirname "$0")/../.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env.local"
  set +a
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is required."
  echo "Set it to your Postgres connection string, then rerun:"
  echo "  SUPABASE_DB_URL='postgresql://...' npm run setup:migrate:supabase"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

MIGRATIONS_DIR="$TMP_DIR/supabase/migrations"
mkdir -p "$MIGRATIONS_DIR"

counter=1
for file in db/migrations/*.sql; do
  version="$(printf "2026022400%04d" "$counter")"
  cp "$file" "$MIGRATIONS_DIR/${version}_$(basename "$file")"
  counter=$((counter + 1))
done

# Ensure seed data is applied at the end through the same migration mechanism.
version="$(printf "2026022499%04d" "$counter")"
cp db/seed.sql "$MIGRATIONS_DIR/${version}_seed.sql"

echo "Applying migrations via Supabase CLI..."
npx --yes supabase migration up --db-url "$SUPABASE_DB_URL" --workdir "$TMP_DIR"
echo "Supabase migrations applied successfully."
