# Database Migration Guide

## Problem
The production Supabase database (`gzmxelgcdpaeklmabszo.supabase.co`) is missing required tables that exist in your local migrations. This causes 400 errors when the app tries to query:
- `host_applications`
- `property_reviews`
- `support_tickets`

## Solution: Apply Migrations to Production

### Option 1: Using the Script (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   # OR
   brew install supabase/tap/supabase
   ```

2. **Run the migration script**:
   ```bash
   ./scripts/apply_migrations_to_production.sh
   ```

3. **Follow the prompts** to link your project and apply migrations.

### Option 2: Manual Steps

1. **Link to your production project**:
   ```bash
   supabase link --project-ref gzmxelgcdpaeklmabszo
   ```
   Enter your database password when prompted.

2. **Check migration status**:
   ```bash
   supabase migration list
   ```

3. **Push migrations to production**:
   ```bash
   supabase db push
   ```

### Option 3: Using Supabase Dashboard

If you prefer using the web dashboard:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/gzmxelgcdpaeklmabszo
2. Navigate to **SQL Editor**
3. Execute each migration file in order:
   - `supabase/migrations/20260110170000_add_staff_and_host_applications.sql`
   - `supabase/migrations/20260111193000_extend_host_applications_for_listing_and_verification.sql`
   - `supabase/migrations/20260112240000_host_applications_rls.sql`
   - `supabase/migrations/20260113140000_host_applications_schema_and_rls_backfill.sql`

4. For property_reviews and support_tickets, check for their migration files and run those as well.

## Verification

After applying migrations, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('host_applications', 'property_reviews', 'support_tickets');

-- Check host_applications structure
\d public.host_applications
```

## What Was Fixed in the Code

While migrations are being applied, the frontend code has been updated to:

1. **Enhanced error logging** - Now logs full Supabase error details (message, code, details, hint) to help debug issues.

2. **Graceful handling of missing tables** - The app will now:
   - Show a helpful error message instead of a generic "Please try again"
   - Continue working for features that don't depend on missing tables
   - Log warnings in the console instead of throwing errors

3. **Better error messages** - Users will see:
   - "This feature is not yet available. Please contact support." instead of technical database errors
   - Specific messages for different error types (expired sessions, permissions, etc.)

## After Migration

Once migrations are applied:
1. The 400 errors will stop
2. Host application submissions will work
3. Reviews and support tickets will load properly
4. All features will function as expected

## Troubleshooting

If you see errors after running migrations:

1. **Check the error in browser console** - The enhanced logging will now show the exact error message, code, and details.

2. **Verify RLS policies** - Make sure Row Level Security policies are in place:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

3. **Check table permissions** - Ensure the authenticated role has access:
   ```sql
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'host_applications';
   ```

## Need Help?

If migrations fail or you encounter issues:
1. Check the error message in the console (now with full details)
2. Verify your database password is correct
3. Ensure you have admin access to the Supabase project
4. Contact the development team with the specific error message
