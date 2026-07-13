#!/usr/bin/env bash
# Link local Supabase CLI to hosted project for migration push.
# Requires SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD (or POSTGRES_PASSWORD) in env/.env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-cptyjloveecusgvituzo}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
PASSWORD="${SUPABASE_DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)" >&2
  exit 1
fi
if [[ -z "$PASSWORD" ]]; then
  echo "Missing SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database)" >&2
  exit 1
fi

npx supabase login --token "$TOKEN"
npx supabase link --project-ref "$PROJECT_REF" --password "$PASSWORD" --yes
npx supabase migration list --linked

echo "Linked $PROJECT_REF. DBA can run: npx supabase db push --linked"
