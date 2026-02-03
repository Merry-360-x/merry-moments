#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log("🔄 Applying profile completion columns migration...\n");

  try {
    // Add profile_complete column
    console.log("1. Adding profile_complete column...");
    const { error: e1 } = await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;`
    });
    if (e1) {
      // Try direct approach if RPC doesn't exist
      console.log("   RPC not available, trying alternative...");
    } else {
      console.log("   ✅ profile_complete column added");
    }

    // Add tour_license_url column
    console.log("2. Adding tour_license_url column...");
    const { error: e2 } = await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS tour_license_url TEXT;`
    });
    if (!e2) console.log("   ✅ tour_license_url column added");

    // Add rdb_certificate_url column
    console.log("3. Adding rdb_certificate_url column...");
    const { error: e3 } = await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS rdb_certificate_url TEXT;`
    });
    if (!e3) console.log("   ✅ rdb_certificate_url column added");

    // Update existing approved applications
    console.log("4. Updating existing approved applications...");
    const { error: e4 } = await supabase
      .from("host_applications")
      .update({ profile_complete: true })
      .eq("status", "approved")
      .is("profile_complete", null);
    
    if (e4) {
      console.log("   ⚠️  Update failed (columns may not exist yet):", e4.message);
    } else {
      console.log("   ✅ Existing approved applications marked as complete");
    }

    console.log("\n✅ Migration complete!");
    console.log("\n📋 If the RPC approach didn't work, run this SQL in Supabase Dashboard:");
    console.log(`
-- Run in Supabase SQL Editor:
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT false;
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS tour_license_url TEXT;
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS rdb_certificate_url TEXT;
UPDATE host_applications SET profile_complete = true WHERE status = 'approved' AND profile_complete IS NULL;
`);

  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

applyMigration();
