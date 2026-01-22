import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Testing different query syntaxes...\n');

// Test 1: Without profile joins (should work)
try {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, property_id, guest_id, status, payment_status, properties(title, images)')
    .limit(1);
  
  if (error) {
    console.error('❌ Without profiles error:', error.message);
  } else {
    console.log('✅ Query without profiles works!');
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
}

// Test 2: Try different syntax for profiles relation
try {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, guest_id, guest_profile:profiles!guest_id(full_name, email, phone)')
    .limit(1);
  
  if (error) {
    console.error('❌ Alternate syntax error:', error.message);
  } else {
    console.log('✅ Alternate syntax works!', data);
  }
} catch (e) {
  console.error('❌ Exception:', e.message);
}

// Test 3: Check foreign keys exist
try {
  const { data, error } = await supabase
    .rpc('get_foreign_keys', { table_name: 'bookings' })
    .limit(10);
  
  if (error) {
    console.log('ℹ️ Cannot query foreign keys (RPC might not exist)');
  } else {
    console.log('✅ Foreign keys:', data);
  }
} catch (e) {
  console.log('ℹ️ RPC not available');
}
