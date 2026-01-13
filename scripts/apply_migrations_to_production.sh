#!/bin/bash
# Apply all migrations to production Supabase database
# Usage: ./scripts/apply_migrations_to_production.sh

set -e

echo "======================================"
echo "Apply Migrations to Production"
echo "======================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    echo "Or with Homebrew: brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f "supabase/.temp/project-ref" ] && [ ! -f ".git/config" ]; then
    echo "⚠️  Not linked to a Supabase project."
    echo ""
    echo "To link this project to your production Supabase instance:"
    echo "1. Run: supabase link --project-ref gzmxelgcdpaeklmabszo"
    echo "2. Enter your database password when prompted"
    echo ""
    read -p "Do you want to link now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase link --project-ref gzmxelgcdpaeklmabszo
    else
        echo "Aborted. Please link manually with: supabase link --project-ref gzmxelgcdpaeklmabszo"
        exit 1
    fi
fi

echo "📋 Checking migration status..."
echo ""
supabase migration list

echo ""
echo "🚀 Applying migrations to production..."
echo ""
echo "⚠️  WARNING: This will modify your production database!"
echo "   Make sure you have a backup before proceeding."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Pushing migrations to production..."
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "The following tables should now be available:"
echo "  - host_applications (with all required columns)"
echo "  - property_reviews"
echo "  - support_tickets"
echo ""
echo "You can verify by running:"
echo "  supabase db diff"
echo ""
