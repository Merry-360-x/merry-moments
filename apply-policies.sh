#!/bin/bash
# Apply Tour and Transport RLS Policies

echo "🚀 Applying RLS Policies..."
echo ""

# Read the Supabase project details from .env
source .env

# Extract project ref from URL
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed 's/.*https:\/\///' | sed 's/\.supabase\.co.*//')

echo "📡 Connecting to Supabase project: $PROJECT_REF"
echo ""

# Apply tour creation policies
echo "📋 Applying tour creation policies..."
cat supabase/migrations/20260122000010_enable_tour_creation.sql | \
  psql "postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

if [ $? -eq 0 ]; then
  echo "✅ Tour policies applied successfully"
else
  echo "❌ Failed to apply tour policies"
fi

echo ""

# Apply transport creation policies
echo "📋 Applying transport creation policies..."
cat supabase/migrations/20260122000011_enable_transport_creation.sql | \
  psql "postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

if [ $? -eq 0 ]; then
  echo "✅ Transport policies applied successfully"
else
  echo "❌ Failed to apply transport policies"
fi

echo ""
echo "✨ Done! Tours and transport can now be created by hosts and admins."
