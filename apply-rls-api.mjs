#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the SQL file
const sql = readFileSync('APPLY_RLS_POLICIES.sql', 'utf8');

console.log('📋 Applying RLS policies to live database...\n');

// Split SQL into individual statements (rough split by semicolons)
// We'll execute the entire file as one block using rpc
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements\n`);

// Execute SQL using Supabase Management API
async function executeSql() {
  try {
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (!projectRef) {
      console.error('❌ Could not extract project ref from URL');
      process.exit(1);
    }

    // Use Supabase Management API (pgmeta endpoint)
    const apiUrl = `${supabaseUrl}/pg/query`;
    
    console.log(`🔗 Executing SQL via Management API: ${apiUrl}\n`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API execution failed:', errorText);
      console.log('\n🔄 Trying psql connection...\n');
      return executeViaConnectionString();
    }
    
    const result = await response.json();
    console.log('✅ RLS policies applied successfully!');
    console.log('\n📊 Policies created:');
    
    // Show the verification results
    if (Array.isArray(result)) {
      console.log(`\n${result.length} policies found`);
      result.forEach(policy => {
        console.log(`  - ${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔄 Trying psql connection...\n');
    return executeViaConnectionString();
  }
}

async function executeViaConnectionString() {
  const { execSync } = await import('child_process');
  
  // Get the connection string from Supabase
  console.log('📡 Getting database connection string...');
  
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('❌ Could not extract project ref from URL');
    process.exit(1);
  }
  
  // Connection string for direct access (transaction mode)
  const connectionString = `postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  console.log('\n⚠️  Direct PostgreSQL connection requires database password.');
  console.log('Get your password from: https://supabase.com/dashboard/project/' + projectRef + '/settings/database\n');
  console.log('Then run:');
  console.log(`PGPASSWORD=<your-password> psql "${connectionString}" < APPLY_RLS_POLICIES.sql\n`);
  
  process.exit(1);
}

executeSql();
