#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugHost() {
  const hostId = 'bf1af521-e047-41bf-aba2-494a42d2af6b';
  
  console.log('🔍 Checking host profile:', hostId, '\n');
  
  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', hostId)
    .single();
  
  if (profileError) {
    console.log('❌ Profile error:', profileError.message);
  } else if (profile) {
    console.log('✅ Profile found:');
    console.log(JSON.stringify(profile, null, 2));
  } else {
    console.log('⚠️  No profile found for this host ID');
  }
  
  // Check bookings with this host
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, host_id, property_id')
    .eq('host_id', hostId);
  
  console.log('\n📦 Bookings with this host:', bookings?.length || 0);
  
  if (bookings && bookings.length > 0) {
    console.log('Booking IDs:', bookings.map(b => b.id.substring(0, 8)).join(', '));
    
    // Check if host_id came from property
    if (bookings[0].property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('id, title, host_id')
        .eq('id', bookings[0].property_id)
        .single();
      
      console.log('\n🏠 Property info:');
      console.log('  Title:', property?.title);
      console.log('  Property host_id:', property?.host_id);
    }
  }
}

debugHost().catch(console.error);
