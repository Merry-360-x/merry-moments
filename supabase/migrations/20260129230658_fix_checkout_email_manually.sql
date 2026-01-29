-- Fix checkout_requests email/name constraint to prevent null violations
-- Make columns nullable and add defaults

-- Step 1: Remove NOT NULL constraints
ALTER TABLE checkout_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE checkout_requests ALTER COLUMN name DROP NOT NULL;

-- Step 2: Update any existing NULL values from metadata
UPDATE checkout_requests
SET 
  email = COALESCE(email, metadata->'guest_info'->>'email', 'noreply@merry360x.com'),
  name = COALESCE(name, metadata->'guest_info'->>'name', 'Guest')
WHERE email IS NULL OR name IS NULL;

-- Step 3: Set default values for future inserts
ALTER TABLE checkout_requests ALTER COLUMN email SET DEFAULT 'noreply@merry360x.com';
ALTER TABLE checkout_requests ALTER COLUMN name SET DEFAULT 'Guest';
