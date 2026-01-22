# Fix Tour and Transport Creation

## Problem
Tours and transport services created through the website UI were not being saved to the database due to restrictive Row Level Security (RLS) policies.

## Solution
Created RLS policies that allow:
- **Hosts** and **Admins** to create tours, transport vehicles, and routes
- **Creators** to view, update, and delete their own content
- **Public** to view published content
- **Admins** to manage all content

## How to Apply the Fix

### Step 1: Apply RLS Policies
Go to your **Supabase Dashboard**:
1. Navigate to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of **BOTH** files below:

#### File 1: `supabase/migrations/20260122000010_enable_tour_creation.sql`
This enables tour creation for hosts and admins.

#### File 2: `supabase/migrations/20260122000011_enable_transport_creation.sql`
This enables transport vehicle and route creation.

4. Click **Run** to execute both migrations

### Step 2: Verify Policies Applied
Run this query in Supabase SQL Editor to check:
```sql
-- Check tour policies
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'tours'
ORDER BY policyname;

-- Check transport policies
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('transport_vehicles', 'transport_routes')
ORDER BY tablename, policyname;
```

You should see policies like:
- "Hosts can create tours"
- "Creators can update own tours"
- "Admins can manage all tours"
- etc.

### Step 3: Create Sample Tours (Optional)
After applying policies, you can:

**Option A: Via SQL** - Run `create-sample-tours.sql` in Supabase SQL Editor

**Option B: Via UI** - Login as host/admin and create tours through:
- Host Dashboard → Tours → Add New Tour
- Admin Dashboard → Tours → Create Tour

## What This Fixes

### Before ❌
- Creating tours/transport from UI → **400 Error: RLS violation**
- Tours not saved to database
- "Tour Not Found" errors on detail pages

### After ✅
- Hosts can create and manage their own tours/transport
- Admins can create and manage all content
- Tours saved to database successfully
- Tour detail pages load correctly
- Public can view published tours

## Testing the Fix

After applying migrations:

```bash
# Test tour creation is now allowed
node test-tour-details.mjs

# Create sample tours via script (if service role key available)
node create-sample-tours.mjs

# Test all pages display tours correctly
node test-all-pages.mjs
```

## Permissions Summary

| Role | Tours | Transport | View Own | View All Published |
|------|-------|-----------|----------|-------------------|
| **Host** | ✅ Create, Edit, Delete | ✅ Create, Edit, Delete | ✅ Yes | ✅ Yes |
| **Admin** | ✅ Full Control | ✅ Full Control | ✅ Yes | ✅ Yes |
| **Guest** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Anon** | ❌ No | ❌ No | ❌ No | ✅ Yes |

## Files Modified

- `supabase/migrations/20260122000010_enable_tour_creation.sql` - Tour RLS policies
- `supabase/migrations/20260122000011_enable_transport_creation.sql` - Transport RLS policies
- `create-sample-tours.sql` - Sample tour data (optional)
- `create-sample-tours.mjs` - Script to create sample tours
- `apply-tour-policies.mjs` - Policy application helper
- `test-tour-details.mjs` - Test tour functionality

## Need Help?

If tours still aren't saving after applying migrations:
1. Check you're logged in as a user with 'host' or 'admin' role
2. Verify the user_roles table has the correct role assignment
3. Check browser console for any errors
4. Ensure `created_by` field is set to `auth.uid()` when creating tours
