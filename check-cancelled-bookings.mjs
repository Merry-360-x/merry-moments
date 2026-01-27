import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eynhuxgfuzhujuaqzgxi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmh1eGdmdXpodWp1YXF6Z3hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjEyMDQxMywiZXhwIjoyMDQ3Njk2NDEzfQ.8oV6f7VxJ5odjmgCy5ZU5QddbGGx7KvZ4xxZMGM-Ttg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCancelledPaidBookings() {
  console.log('🔍 Checking for cancelled paid bookings...\n');

  // Find cancelled paid bookings
  const { data: cancelledPaid, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'cancelled')
    .eq('payment_status', 'paid');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${cancelledPaid?.length || 0} cancelled paid bookings:\n`);

  if (cancelledPaid && cancelledPaid.length > 0) {
    for (const booking of cancelledPaid) {
      console.log(`📌 Booking ID: ${booking.id.slice(0, 8)}...`);
      console.log(`   Total: ${booking.total_price} ${booking.currency}`);
      console.log(`   Check-in: ${booking.check_in}`);
      console.log(`   Guest: ${booking.guest_name || 'N/A'}\n`);
    }
  } else {
    console.log('ℹ️  No cancelled paid bookings found.');
    console.log('   Creating a test cancelled paid booking...\n');
    
    // Get a confirmed paid booking to cancel
    const { data: paidBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('payment_status', 'paid')
      .limit(1);

    if (paidBookings && paidBookings.length > 0) {
      const booking = paidBookings[0];
      console.log(`Found paid booking: ${booking.id.slice(0, 8)}...`);
      console.log(`Changing status to cancelled...\n`);
      
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (updateError) {
        console.error('❌ Error updating booking:', updateError);
      } else {
        console.log('✅ Booking cancelled successfully!');
        console.log(`   Booking ID: ${booking.id}`);
        console.log(`   Total: ${booking.total_price} ${booking.currency}`);
        console.log(`   Check-in: ${booking.check_in}`);
        console.log('\n📋 You should now see refund information on the dashboards.');
      }
    } else {
      console.log('❌ No paid bookings available to test with.');
    }
  }

  console.log('\n');
}

checkCancelledPaidBookings();
