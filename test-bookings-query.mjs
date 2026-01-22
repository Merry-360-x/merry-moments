import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Testing bookings query...\n');

// Test 1: Check if payment_status column exists
try {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, payment_status')
    .limit(1);
  
  if (error) {
    console.error('❌ payment_status column error:', error.message);
  } else {
    console.log('✅ payment_status column exists:', data);
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
}

// Test 2: Full query as in frontend
try {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, property_id, guest_id, guest_name, guest_email, guest_phone, is_guest_booking, check_in, check_out, guests, total_price, currency, status, payment_status, payment_method, special_requests, host_id, created_at, properties(title, images), profiles:guest_id(full_name, email, phone), host_profile:host_id(full_name)')
    .limit(1);
  
  if (error) {
    console.error('❌ Full query error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
  } else {
    console.log('✅ Full query works! Records:', data?.length);
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
}
