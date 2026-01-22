# Apply RLS Policies via Supabase Dashboard

Since Docker isn't available for local development and the CLI migration has schema conflicts, we'll apply the RLS policies directly via the Supabase SQL Editor.

## Steps:

1. **Go to Supabase Dashboard SQL Editor**:
   - Visit: https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/sql/new
   
2. **Copy and paste the entire contents** of `APPLY_RLS_POLICIES.sql`

3. **Run the SQL** by clicking "Run" or pressing Cmd+Enter

4. **Verify the policies were created** - the query at the end will show all policies

## Alternative: Use this command to get the SQL and copy it:

```bash
cat APPLY_RLS_POLICIES.sql | pbcopy
```

Then paste into the SQL Editor.

## Why this approach?

- The CLI requires Docker for schema diffing
- Migration version conflicts exist in the migration history
- Direct SQL execution via dashboard bypasses all migration tracking issues
- This is the most reliable way to apply policies to the live database

## After applying:

Test tour creation via the Host Dashboard to verify the policies work correctly.
