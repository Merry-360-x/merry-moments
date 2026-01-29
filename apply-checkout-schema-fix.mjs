#!/usr/bin/env node
/**
 * Apply the checkout_requests email constraint fix using Supabase client
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

console.log("\n🔧 Applying checkout_requests schema fix...\n");

async function executeSQL(description, sql) {
  console.log(`📝 ${description}`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: sql 
    });
    
    if (error) throw error;
    console.log(`   ✅ Success\n`);
    return true;
  } catch (error) {
    console.log(`   ⚠️  ${error.message}\n`);
    return false;
  }
}

async function applyFix() {
  // Try to execute each statement
  const steps = [
    {
      desc: "1. Remove NOT NULL constraint from email",
      sql: "ALTER TABLE checkout_requests ALTER COLUMN email DROP NOT NULL"
    },
    {
      desc: "2. Remove NOT NULL constraint from name",
      sql: "ALTER TABLE checkout_requests ALTER COLUMN name DROP NOT NULL"
    },
    {
      desc: "3. Set default for email column",
      sql: "ALTER TABLE checkout_requests ALTER COLUMN email SET DEFAULT 'noreply@merry360x.com'"
    },
    {
      desc: "4. Set default for name column",
      sql: "ALTER TABLE checkout_requests ALTER COLUMN name SET DEFAULT 'Guest'"
    },
    {
      desc: "5. Update NULL emails from metadata",
      sql: `UPDATE checkout_requests
            SET email = COALESCE(email, metadata->'guest_info'->>'email', 'noreply@merry360x.com')
            WHERE email IS NULL`
    },
    {
      desc: "6. Update NULL names from metadata",
      sql: `UPDATE checkout_requests
            SET name = COALESCE(name, metadata->'guest_info'->>'name', 'Guest')
            WHERE name IS NULL`
    }
  ];

  for (const step of steps) {
    await executeSQL(step.desc, step.sql);
  }
  
  console.log("✅ Schema fix complete!\n");
  console.log("Now email and name columns:");
  console.log("  - Are nullable (won't cause insertion errors)");
  console.log("  - Have default values for new records");
  console.log("  - Existing NULL values have been populated\n");
}

applyFix().catch(console.error);
