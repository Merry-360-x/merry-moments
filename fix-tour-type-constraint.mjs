import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixConstraint() {
  console.log('Updating tour_type constraint to allow "Private & Group"...');
  
  // Use raw SQL via RPC or direct query
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE tour_packages DROP CONSTRAINT IF EXISTS tour_packages_tour_type_check;
      ALTER TABLE tour_packages ADD CONSTRAINT tour_packages_tour_type_check 
        CHECK (tour_type IN ('Private', 'Group', 'Private & Group', 'Group & Private'));
    `
  });

  if (error) {
    console.error('RPC method failed, trying direct approach...');
    
    // Alternative: Try via Supabase Management API or just inform user
    console.log('\n=== MANUAL FIX REQUIRED ===');
    console.log('Run this SQL in Supabase SQL Editor (https://supabase.com/dashboard):');
    console.log('');
    console.log(`ALTER TABLE tour_packages DROP CONSTRAINT IF EXISTS tour_packages_tour_type_check;`);
    console.log(`ALTER TABLE tour_packages ADD CONSTRAINT tour_packages_tour_type_check CHECK (tour_type IN ('Private', 'Group', 'Private & Group', 'Group & Private'));`);
    console.log('');
  } else {
    console.log('✅ Constraint updated successfully!');
  }
}

fixConstraint();
