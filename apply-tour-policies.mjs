#!/usr/bin/env node
/**
 * Apply RLS policies to enable tour and transport creation
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('Please add your service role key to .env file:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('\nYou can find it in Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('🚀 Applying RLS policy migrations...\n');

  const migrations = [
    {
      name: 'Enable Tour Creation',
      file: 'supabase/migrations/20260122000010_enable_tour_creation.sql'
    },
    {
      name: 'Enable Transport Creation',
      file: 'supabase/migrations/20260122000011_enable_transport_creation.sql'
    }
  ];

  for (const migration of migrations) {
    try {
      console.log(`📋 Applying: ${migration.name}...`);
      const sql = readFileSync(migration.file, 'utf-8');
      
      const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).single();
      
      if (error) {
        // Try direct query if rpc fails
        const { error: directError } = await supabase.from('_sql').select('*').eq('query', sql);
        
        if (directError) {
          console.log(`⚠️  ${migration.name}: ${error.message}`);
          console.log('   Manual application required via Supabase SQL Editor');
        }
      } else {
        console.log(`✅ ${migration.name} applied successfully`);
      }
    } catch (err) {
      console.log(`⚠️  ${migration.name}: Manual application required`);
      console.log(`   Run the SQL from: ${migration.file}`);
    }
  }

  console.log('\n✨ Migration process complete!');
  console.log('\n📌 Next steps:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Copy and paste the SQL from these files:');
  console.log('   - supabase/migrations/20260122000010_enable_tour_creation.sql');
  console.log('   - supabase/migrations/20260122000011_enable_transport_creation.sql');
  console.log('3. Click "Run" to apply the policies');
  console.log('\n4. After applying, hosts and admins can create:');
  console.log('   ✅ Tours (from Host Dashboard)');
  console.log('   ✅ Transport Vehicles');
  console.log('   ✅ Transport Routes');
}

applyMigrations().catch(console.error);
