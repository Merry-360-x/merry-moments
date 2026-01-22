#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required');
  console.error('Get from: Supabase Dashboard → Settings → API');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function exec(sql) {
  const { error } = await supabase.rpc('query', { query_text: sql });
  return error;
}

async function main() {
  console.log('📋 Reading APPLY_RLS_POLICIES.sql...\n');
  const sql = fs.readFileSync('APPLY_RLS_POLICIES.sql', 'utf-8');
  
  console.log('🚀 Executing policies...');
  const error = await exec(sql);
  
  if (error) {
    console.log('\n⚠️  Method 1 failed:', error.message);
    console.log('\n📌 Use Supabase Dashboard instead:');
    console.log('   1. Go to SQL Editor');
    console.log('   2. Paste contents of APPLY_RLS_POLICIES.sql');
    console.log('   3. Click Run\n');
    process.exit(1);
  }
  
  console.log('✅ Policies applied successfully!\n');
}

main();
