#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAutoNickname() {
  console.log('🔧 Setting up auto-nickname from surname...\n');

  // First, update existing profiles manually
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, full_name, nickname');

  console.log(`📋 Found ${profiles?.length || 0} profiles\n`);

  let updated = 0;
  for (const profile of profiles || []) {
    if (profile.full_name && (!profile.nickname || profile.nickname.trim() === '')) {
      // Extract surname (last word)
      const words = profile.full_name.trim().split(/\s+/);
      const surname = words[words.length - 1];

      const { error } = await supabase
        .from('profiles')
        .update({ nickname: surname })
        .eq('user_id', profile.user_id);

      if (!error) {
        console.log(`✓ ${profile.full_name} → "${surname}"`);
        updated++;
      } else {
        console.log(`✗ ${profile.full_name}: ${error.message}`);
      }
    } else if (profile.nickname) {
      console.log(`  ${profile.full_name} → "${profile.nickname}" (already set)`);
    }
  }

  console.log(`\n✅ Updated ${updated} profile(s)\n`);

  // Show final results
  const { data: updatedProfiles } = await supabase
    .from('profiles')
    .select('full_name, nickname')
    .order('full_name');

  console.log('📊 All profiles:');
  updatedProfiles?.forEach(p => {
    console.log(`  ${p.full_name || 'N/A'} → "${p.nickname || 'N/A'}"`);
  });
}

setupAutoNickname().catch(console.error);
