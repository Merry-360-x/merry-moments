#!/usr/bin/env node
/**
 * Apply RLS Policies Directly to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.error('Please add it to your .env file to apply policies via CLI\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function executeSQLFile(filePath, description) {
  console.log(`\n📋 Applying: ${description}...`);
  
  const sql = readFileSync(filePath, 'utf-8');
  
  // Split by statement and execute each one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    if (statement.includes('DO $$') || statement.includes('END $$')) {
      // Execute DO blocks as single statement
      const doBlock = statements.slice(
        statements.indexOf(statement),
        statements.findIndex((s, i) => i > statements.indexOf(statement) && s.includes('END $$')) + 1
      ).join(';');
      
      const { error } = await supabase.rpc('exec', { sql: doBlock });
      if (error && !error.message.includes('does not exist')) {
        console.log(`  ⚠️  ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }
      continue;
    }
    
    // For CREATE POLICY statements, we need to use raw SQL
    if (statement.includes('CREATE POLICY') || statement.includes('DROP POLICY')) {
      try {
        const { error } = await supabase.rpc('exec', { sql: statement + ';' });
        if (error) {
          if (error.message.includes('already exists') || error.message.includes('does not exist')) {
            // Ignore already exists or does not exist errors
            successCount++;
          } else {
            console.log(`  ⚠️  ${error.message.substring(0, 100)}`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.log(`  ⚠️  ${err.message}`);
        errorCount++;
      }
    }
  }
  
  if (errorCount === 0) {
    console.log(`  ✅ Successfully applied (${successCount} statements)`);
    return true;
  } else {
    console.log(`  ⚠️  Applied with ${errorCount} warnings`);
    return false;
  }
}

async function applyPolicies() {
  console.log('🚀 Applying RLS Policies to Supabase Database\n');
  console.log('This will enable tour and transport creation for hosts and admins');
  
  // Note: Supabase client doesn't support raw SQL execution directly
  // We need to use the REST API or create a custom RPC function
  
  console.log('\n❌ Direct SQL execution requires service role key and RPC function');
  console.log('\n📌 Please run these commands manually:');
  console.log('\n1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run this command to create exec function:\n');
  console.log(`
CREATE OR REPLACE FUNCTION exec(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
  `.trim());
  
  console.log('\n3. Then run the contents of these files:');
  console.log('   - supabase/migrations/20260122000010_enable_tour_creation.sql');
  console.log('   - supabase/migrations/20260122000011_enable_transport_creation.sql\n');
}

applyPolicies();
