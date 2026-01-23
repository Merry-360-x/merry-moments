import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Fixing Booking Data Issues...\n');

async function inspectSchema() {
  console.log('📋 Inspecting actual table schemas...\n');
  
  // Check profiles table structure
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (profiles && profiles.length > 0) {
    console.log('✅ Profiles table columns:', Object.keys(profiles[0]));
  } else {
    console.log('❌ Profiles error:', profilesError?.message);
  }
  
  // Check host_applications table structure
  const { data: apps, error: appsError } = await supabase
    .from('host_applications')
    .select('*')
    .limit(1);
  
  if (apps && apps.length > 0) {
    console.log('✅ Host applications columns:', Object.keys(apps[0]));
  } else {
    console.log('❌ Host applications error:', appsError?.message);
  }
  
  console.log('\n');
}

async function fixBookingGuestInfo() {
  console.log('🔧 Fixing existing bookings with missing guest info...\n');
  
  // Get all bookings with missing guest info
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, guest_id, guest_name, guest_email, guest_phone')
    .not('guest_id', 'is', null);
  
  if (bookingsError) {
    console.log('❌ Error fetching bookings:', bookingsError.message);
    return;
  }
  
  console.log(`Found ${bookings.length} bookings with registered users\n`);
  
  for (const booking of bookings) {
    const needsUpdate = !booking.guest_name || !booking.guest_email;
    
    if (!needsUpdate) {
      console.log(`✅ Booking ${booking.id} already has complete info`);
      continue;
    }
    
    console.log(`\n🔍 Booking ${booking.id}:`);
    console.log(`   Current: name="${booking.guest_name}", email="${booking.guest_email}", phone="${booking.guest_phone}"`);
    
    // Get profile data for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .eq('user_id', booking.guest_id)
      .single();
    
    if (profileError) {
      console.log(`   ❌ Profile error: ${profileError.message}`);
      continue;
    }
    
    // Get email from auth.users via RPC or use a service role key approach
    // For now, let's update what we can from profiles
    const updates = {};
    
    if (!booking.guest_name && profile.full_name) {
      updates.guest_name = profile.full_name;
    }
    
    if (!booking.guest_phone && profile.phone) {
      updates.guest_phone = profile.phone;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', booking.id);
      
      if (updateError) {
        console.log(`   ❌ Update error: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated:`, updates);
      }
    } else {
      console.log(`   ⚠️  No profile data available to update`);
    }
  }
}

async function main() {
  try {
    await inspectSchema();
    await fixBookingGuestInfo();
    
    console.log('\n✅ Fix process completed!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  }
}

main();
