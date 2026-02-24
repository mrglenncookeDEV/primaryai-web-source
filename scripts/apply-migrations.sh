#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required."
  echo "Example: export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to apply migrations."
  exit 1
fi

for file in db/migrations/*.sql; do
  echo "Applying $file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "Applying db/seed.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql

echo "Migrations and seed applied."
