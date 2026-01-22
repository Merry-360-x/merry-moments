#!/bin/bash

# Apply tours RLS fix migration
echo "Applying tours RLS fix migration..."

# Get Supabase connection details from environment or .env file
if [ -f .env ]; then
  source .env
fi

SUPABASE_DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL or DATABASE_URL not set"
  echo "Please set the database connection string in .env file"
  exit 1
fi

psql "$SUPABASE_DB_URL" -f supabase/migrations/20260122030000_fix_tours_rls_access.sql

echo "Migration applied successfully!"
echo ""
echo "Testing query access..."
echo "Running: SELECT id, title FROM tours WHERE is_published = true LIMIT 3;"
psql "$SUPABASE_DB_URL" -c "SELECT id, title FROM tours WHERE is_published = true LIMIT 3;"
