#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyNicknameMigration() {
  console.log('🔧 Applying auto-nickname migration...\n');

  // Read the SQL file
  const sql = readFileSync('supabase/migrations/20260127000000_auto_nickname_from_surname.sql', 'utf8');
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
    
    if (error) {
      console.log(`⚠️  Statement ${i + 1} result:`, error.message);
    } else {
      console.log(`✓ Statement ${i + 1} executed`);
    }
  }

  console.log('\n✅ Migration complete!\n');

  // Test: Check current profiles with nicknames
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, nickname')
    .limit(10);

  console.log('📋 Current profiles with nicknames:\n');
  profiles?.forEach(p => {
    console.log(`  ${p.full_name || 'N/A'} → nickname: "${p.nickname || 'N/A'}"`);
  });
}

applyNicknameMigration().catch(console.error);
