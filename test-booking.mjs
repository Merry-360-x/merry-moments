import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testBooking() {
  console.log('Testing booking submission...\n');
  
  // First, get a property to book
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, title, price_per_night, currency, host_id')
    .limit(1);
    
  if (propError) {
    console.error('Error fetching property:', propError);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('No active properties found');
    return;
  }
  
  const property = properties[0];
  console.log('Using property:', property.title, '(ID:', property.id, ')');
  console.log('Host ID:', property.host_id);
  console.log('');
  
  // Test booking data
  const testBooking = {
    property_id: property.id,
    host_id: property.host_id,
    check_in: '2026-02-01',
    check_out: '2026-02-05',
    guests: 2,
    total_price: property.price_per_night * 4,
    currency: property.currency || 'RWF',
    status: 'pending_confirmation',
    payment_method: 'mtn_momo',
    special_requests: 'Test booking - automated test',
    guest_phone: '+250792527083',
    is_guest_booking: true,
    guest_name: 'Test User',
    guest_email: 'test@example.com'
  };
  
  console.log('Submitting booking with data:');
  console.log(JSON.stringify(testBooking, null, 2));
  console.log('');
  
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert(testBooking)
    .select()
    .single();
    
  if (bookingError) {
    console.error('❌ Booking failed:', bookingError);
    return;
  }
  
  console.log('✅ Booking created successfully!');
  console.log('Booking ID:', booking.id);
  console.log('Status:', booking.status);
  console.log('Guest Phone:', booking.guest_phone);
  console.log('Payment Method:', booking.payment_method);
  console.log('Special Requests:', booking.special_requests);
  console.log('Host ID:', booking.host_id);
  
  // Clean up test booking
  console.log('\nCleaning up test booking...');
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', booking.id);
    
  if (deleteError) {
    console.error('Failed to delete test booking:', deleteError);
  } else {
    console.log('✅ Test booking cleaned up');
  }
}

testBooking().catch(console.error);
