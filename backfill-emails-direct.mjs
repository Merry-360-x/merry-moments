import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Use service role key for auth.users access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('📝 Please add your Supabase service role key to .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('📧 Backfilling guest emails from auth.users...\n');

async function backfillEmails() {
  // Get all bookings with missing email but have guest_id
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, guest_id, guest_email')
    .not('guest_id', 'is', null)
    .is('guest_email', null);
  
  if (bookingsError) {
    console.log('❌ Error fetching bookings:', bookingsError.message);
    return;
  }
  
  console.log(`Found ${bookings.length} bookings needing email backfill\n`);
  
  let updated = 0;
  
  for (const booking of bookings) {
    // Get user email from auth.users
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(booking.guest_id);
    
    if (userError) {
      console.log(`❌ Booking ${booking.id}: ${userError.message}`);
      continue;
    }
    
    if (user && user.user.email) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ guest_email: user.user.email })
        .eq('id', booking.id);
      
      if (updateError) {
        console.log(`❌ Booking ${booking.id}: Update failed - ${updateError.message}`);
      } else {
        console.log(`✅ Booking ${booking.id}: Updated with email ${user.user.email}`);
        updated++;
      }
    } else {
      console.log(`⚠️  Booking ${booking.id}: No email found for user`);
    }
  }
  
  console.log(`\n✅ Successfully updated ${updated}/${bookings.length} bookings`);
}

backfillEmails();
