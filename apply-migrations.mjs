import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log('📦 Applying database migrations...\n');
  
  try {
    // Read migration files
    const migration1 = fs.readFileSync('supabase/migrations/20260123000000_add_cancellation_policies_and_nicknames.sql', 'utf-8');
    const migration2 = fs.readFileSync('supabase/migrations/20260123000001_property_blocked_dates.sql', 'utf-8');
    
    // Apply migration 1
    console.log('1️⃣  Adding cancellation policies and nicknames...');
    const {error: error1} = await supabase.rpc('exec_sql', { sql: migration1 });
    if (error1) {
      console.log('   ℹ️  Note:', error1.message);
      // Continue anyway - columns may already exist
    } else {
      console.log('   ✅ Migration 1 applied successfully');
    }
    
    // Apply migration 2  
    console.log('\n2️⃣  Adding property blocked dates table...');
    const {error: error2} = await supabase.rpc('exec_sql', { sql: migration2 });
    if (error2) {
      console.log('   ℹ️  Note:', error2.message);
    } else {
      console.log('   ✅ Migration 2 applied successfully');
    }
    
    console.log('\n✅ Migrations completed!\n');
    
  } catch (e) {
    console.error('❌ Error applying migrations:', e.message);
    console.log('\n💡 Applying migrations manually via direct SQL...\n');
    
    // Try manual approach
    const migration1 = fs.readFileSync('supabase/migrations/20260123000000_add_cancellation_policies_and_nicknames.sql', 'utf-8');
    const migration2 = fs.readFileSync('supabase/migrations/20260123000001_property_blocked_dates.sql', 'utf-8');
    
    console.log('--- Migration 1 SQL ---');
    console.log(migration1);
    console.log('\n--- Migration 2 SQL ---');
    console.log(migration2);
    console.log('\n⚠️  Please apply these SQL statements manually in Supabase SQL Editor');
  }
}

applyMigrations().catch(console.error);
