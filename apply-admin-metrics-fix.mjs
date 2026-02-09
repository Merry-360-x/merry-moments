#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const path = "supabase/migrations/20260209110000_fix_admin_metrics_official_fx_flat.sql";
  const sql = fs.readFileSync(path, "utf-8");

  console.log("Applying admin_dashboard_metrics fix migration...\n");
  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error("Failed to apply migration:", error.message || error);
    process.exit(1);
  }

  console.log("✅ admin_dashboard_metrics function updated successfully.");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
