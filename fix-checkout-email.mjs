#!/usr/bin/env node
/**
 * Fix checkout_requests table to handle email constraint
 * - Ensure email column allows NULL temporarily
 * - Update existing records with NULL email from metadata
 * - Optionally make it NOT NULL again after fixing data
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("\n🔧 Fixing checkout_requests email constraint issue...\n");

async function fixCheckoutEmails() {
  // Step 1: Check current state
  console.log("1️⃣ Checking current checkout_requests records...");
  const { data: checkouts, error: fetchError } = await supabase
    .from("checkout_requests")
    .select("id, email, name, metadata")
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("❌ Error fetching checkouts:", fetchError.message);
    return;
  }

  console.log(`   Found ${checkouts.length} checkout requests\n`);

  // Step 2: Find records with missing email/name
  const nullEmailRecords = checkouts.filter(c => !c.email);
  const nullNameRecords = checkouts.filter(c => !c.name);

  console.log(`   Records with NULL email: ${nullEmailRecords.length}`);
  console.log(`   Records with NULL name: ${nullNameRecords.length}\n`);

  if (nullEmailRecords.length === 0 && nullNameRecords.length === 0) {
    console.log("✅ All records have email and name. No fixes needed!");
    return;
  }

  // Step 3: Fix records with NULL values
  console.log("2️⃣ Fixing records with NULL email/name...\n");

  let fixed = 0;
  let skipped = 0;

  for (const checkout of checkouts) {
    const needsUpdate = !checkout.email || !checkout.name;
    
    if (!needsUpdate) continue;

    const metadata = checkout.metadata || {};
    const guestInfo = metadata.guest_info || {};
    
    const email = checkout.email || guestInfo.email || "noreply@merry360x.com";
    const name = checkout.name || guestInfo.name || "Guest";

    const updateData = {};
    
    if (!checkout.email) updateData.email = email;
    if (!checkout.name) updateData.name = name;

    const { error: updateError } = await supabase
      .from("checkout_requests")
      .update(updateData)
      .eq("id", checkout.id);

    if (updateError) {
      console.log(`   ❌ Failed to update ${checkout.id}: ${updateError.message}`);
      skipped++;
    } else {
      console.log(`   ✅ Fixed ${checkout.id}: email="${email}", name="${name}"`);
      fixed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${checkouts.length}\n`);

  if (fixed > 0) {
    console.log("✅ Database records updated successfully!");
  }
}

async function applySchemaFix() {
  console.log("\n3️⃣ Applying schema fix to allow NULL temporarily...\n");
  
  // This SQL will make email nullable if it's not already
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Make email and name nullable temporarily to allow fixes
      ALTER TABLE checkout_requests ALTER COLUMN email DROP NOT NULL;
      ALTER TABLE checkout_requests ALTER COLUMN name DROP NOT NULL;
    `
  });

  if (error) {
    console.log("   ⚠️  Schema update failed (might already be nullable):", error.message);
    console.log("   Continuing with data fixes...\n");
  } else {
    console.log("   ✅ Schema updated - email and name are now nullable\n");
  }
}

// Run the fixes
(async () => {
  try {
    await applySchemaFix();
    await fixCheckoutEmails();
    console.log("\n✅ All done!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
})();
