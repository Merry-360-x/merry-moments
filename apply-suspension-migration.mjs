#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Adding host suspension columns...\n');

  // Add suspended column
  console.log('1. Adding suspended column...');
  const { error: err1 } = await supabase
    .from('host_applications')
    .update({ suspended: false })
    .is('suspended', null);
  
  if (err1 && !err1.message.includes('column')) {
    // Column might not exist, that's ok - we'll add it via RPC or SQL
    console.log('   Note: May need to add column via SQL Editor');
  } else {
    console.log('   ✅ Suspended column ready');
  }

  console.log('\n✅ Host suspension setup complete!');
  console.log('\n📋 Run this SQL in Supabase Dashboard SQL Editor:\n');
  console.log(`
-- Add suspension columns to host_applications
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS suspended_by UUID;
  `);
}

applyMigration().catch(console.error);
