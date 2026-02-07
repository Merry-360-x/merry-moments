#!/usr/bin/env node
/**
 * Apply the official BNR exchange rates to admin_dashboard_metrics
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = "uwgiostcetoxotfnulfm";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("\n🔧 Applying official BNR exchange rates to admin_dashboard_metrics...\n");

const sql = readFileSync("supabase/migrations/20260207150000_update_official_fx_rates.sql", "utf-8");

async function run() {
  // Try Supabase Management API
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (accessToken) {
    console.log("Using Management API...");
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (response.ok) {
      console.log("\n✅ Exchange rates updated successfully!");
      return;
    }
    console.log("Management API failed:", response.status);
  }
  
  // Fallback: Output SQL for manual execution
  console.log("⚠️  Please run the SQL in the Supabase SQL Editor:\n");
  console.log(`🔗 Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
  console.log("📋 Copy this SQL:");
  console.log("─".repeat(60));
  console.log(sql);
  console.log("─".repeat(60));
}

run();
