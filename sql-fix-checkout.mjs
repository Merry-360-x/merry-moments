#!/usr/bin/env node
/**
 * Fix checkout_requests schema - Apply via Supabase SQL Editor
 * 
 * Copy and paste this SQL into your Supabase SQL Editor:
 * https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/sql
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  SUPABASE SQL EDITOR - Checkout Requests Email Fix                    ║
╚════════════════════════════════════════════════════════════════════════╝

📋 Copy the SQL below and paste it into your Supabase SQL Editor:
   https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Fix checkout_requests email/name constraint issue
-- This prevents "null value in column violates not-null constraint" errors

-- Step 1: Make email and name nullable
ALTER TABLE checkout_requests 
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE checkout_requests 
  ALTER COLUMN name DROP NOT NULL;

-- Step 2: Set default values for future inserts
ALTER TABLE checkout_requests 
  ALTER COLUMN email SET DEFAULT 'noreply@merry360x.com';

ALTER TABLE checkout_requests 
  ALTER COLUMN name SET DEFAULT 'Guest';

-- Step 3: Update any existing NULL values from metadata
UPDATE checkout_requests
SET 
  email = COALESCE(
    email,
    metadata->'guest_info'->>'email',
    'noreply@merry360x.com'
  )
WHERE email IS NULL;

UPDATE checkout_requests
SET 
  name = COALESCE(
    name,
    metadata->'guest_info'->>'name',
    'Guest'
  )
WHERE name IS NULL;

-- Verify the changes
SELECT 
  COUNT(*) as total_records,
  COUNT(email) as records_with_email,
  COUNT(name) as records_with_name
FROM checkout_requests;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ After running this SQL:
   • Email and name columns will be nullable (prevents errors)
   • Default values will be set for new records
   • Any existing NULL values will be populated
   • The payment flow will work without constraint violations

`);
