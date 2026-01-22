# Fix Tours 406 Error - RLS Policy Issue

## Problem
Getting 406 errors when fetching tours from the API. This is caused by Row Level Security (RLS) policies blocking anonymous access to the tours table.

## Solution
Apply the RLS fix migration to grant proper access to tours and tour_packages tables.

## Quick Fix (Recommended)

### Option 1: Using Supabase Dashboard (Easiest)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire content of `supabase/migrations/20260122030000_fix_tours_rls_access.sql`
4. Click **Run** to execute

### Option 2: Using Supabase CLI
```bash
# Make sure you're logged in to Supabase CLI
npx supabase db push

# Or apply specific migration
npx supabase db execute --file supabase/migrations/20260122030000_fix_tours_rls_access.sql
```

### Option 3: Direct Database Connection
If you have the database connection string:
```bash
psql "YOUR_DATABASE_URL" -f supabase/migrations/20260122030000_fix_tours_rls_access.sql
```

## What This Fix Does

1. **Enables RLS** on tours and tour_packages tables
2. **Drops conflicting policies** (removes duplicates)
3. **Creates proper policies:**
   - Anonymous users can view published tours
   - Authenticated users can view their own tours
   - Admins can manage all tours
   - Hosts can create and manage their tours
4. **Grants permissions** to anon and authenticated roles

## Testing After Fix

After applying the migration, test the fix by visiting:
- Tour listings page: `/tours`
- Individual tour details: `/tours/[tour-id]`

You should no longer see 406 errors in the browser console.

## Verification

Run this query in SQL Editor to verify policies are applied:
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles
FROM pg_policies 
WHERE tablename IN ('tours', 'tour_packages')
ORDER BY tablename, policyname;
```

You should see policies like:
- "Anyone can view published tours"
- "Creators can view own tours"
- "Admins can view all tours"
- etc.

## Common Issues

### Still getting 406 errors?
1. Check if tours have `is_published = true`
2. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tours';`
3. Check anon role has SELECT permission: `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'tours';`

### Cannot access draft tours?
This is expected! Only:
- The creator can see their own draft tours
- Admins can see all draft tours
- Anonymous users can only see published tours
