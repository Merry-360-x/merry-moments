#!/bin/bash

# Apply RLS policies via psql
# Usage: ./apply-via-psql.sh <database-password>

if [ -z "$1" ]; then
  echo "❌ Database password required"
  echo ""
  echo "Get your database password from:"
  echo "https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/settings/database"
  echo ""
  echo "Usage: ./apply-via-psql.sh <password>"
  exit 1
fi

DB_PASSWORD="$1"
PROJECT_REF="uwgiostcetoxotfnulfm"

# Direct connection (non-pooler) - for running migrations
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "📋 Applying RLS policies to live database..."
echo ""

# Execute the SQL file
PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -f APPLY_RLS_POLICIES.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ RLS policies applied successfully!"
  echo ""
  echo "Verifying policies..."
  
  # Verify policies were created
  PGPASSWORD="${DB_PASSWORD}" psql "${CONNECTION_STRING}" -c "
    SELECT 
      tablename,
      policyname,
      cmd
    FROM pg_policies
    WHERE tablename IN ('tours', 'transport_vehicles', 'transport_routes')
    ORDER BY tablename, policyname;
  "
else
  echo ""
  echo "❌ Failed to apply RLS policies"
  exit 1
fi
