#!/usr/bin/env node
/**
 * Apply the checkout_requests email constraint fix
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("\n🔧 Applying checkout_requests email constraint fix...\n");

const sql = `
-- Fix checkout_requests email constraint issue
-- Make email and name nullable to prevent insertion errors

-- Step 1: Make email and name nullable (remove NOT NULL constraint)
ALTER TABLE checkout_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE checkout_requests ALTER COLUMN name DROP NOT NULL;

-- Step 2: Update any NULL emails/names from metadata
UPDATE checkout_requests
SET 
  email = COALESCE(
    email,
    metadata->'guest_info'->>'email',
    'noreply@merry360x.com'
  ),
  name = COALESCE(
    name,
    metadata->'guest_info'->>'name',
    'Guest'
  )
WHERE email IS NULL OR name IS NULL;

-- Step 3: Add default values for future inserts
ALTER TABLE checkout_requests 
  ALTER COLUMN email SET DEFAULT 'noreply@merry360x.com';

ALTER TABLE checkout_requests 
  ALTER COLUMN name SET DEFAULT 'Guest';
`;

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`Executing ${statements.length} SQL statements...\n`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  if (!stmt) continue;
  
  console.log(`${i + 1}. ${stmt.substring(0, 60)}...`);
  
  const { error } = await supabase.rpc('exec', { sql: stmt });
  
  if (error) {
    console.log(`   ⚠️  ${error.message}`);
  } else {
    console.log(`   ✅ Success`);
  }
}

console.log("\n✅ Migration applied!\n");
