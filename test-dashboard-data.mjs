#!/usr/bin/env node

/**
 * Test script to verify dashboard data access
 * Tests RLS policies, helper functions, and data consistency
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('==========================================');
console.log('Testing Dashboard Data Access');
console.log('==========================================\n');

// Test 1: Admin Dashboard Metrics
console.log('1. Testing admin_dashboard_metrics function...');
try {
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Function executed successfully');
    console.log(`   📊 Tours Total: ${data.tours_total || 0}`);
    console.log(`   📊 Bookings Total: ${data.bookings_total || 0}`);
    console.log(`   📊 Checkout Requests Total: ${data.checkout_requests_total || 0}`);
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 2: Tours Count (both tables)
console.log('\n2. Testing tours count (both tables)...');
try {
  const { count: toursCount, error: toursError } = await supabase
    .from('tours')
    .select('*', { count: 'exact', head: true });
  
  const { count: packagesCount, error: packagesError } = await supabase
    .from('tour_packages')
    .select('*', { count: 'exact', head: true });

  if (toursError || packagesError) {
    console.log(`   ❌ Error: ${toursError?.message || packagesError?.message}`);
  } else {
    console.log('   ✅ Successfully accessed both tables');
    console.log(`   📊 Tours: ${toursCount || 0}`);
    console.log(`   📊 Tour Packages: ${packagesCount || 0}`);
    console.log(`   📊 Combined: ${(toursCount || 0) + (packagesCount || 0)}`);
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 3: Bookings Access
console.log('\n3. Testing bookings access...');
try {
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Successfully accessed bookings table');
    console.log(`   📊 Total Bookings: ${count || 0}`);
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 4: Checkout Requests Access
console.log('\n4. Testing checkout_requests access...');
try {
  const { count, error } = await supabase
    .from('checkout_requests')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Successfully accessed checkout_requests table');
    console.log(`   📊 Total Checkout Requests: ${count || 0}`);
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 5: Sample Booking Data
console.log('\n5. Testing sample booking data...');
try {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, guest_name, total_price')
    .limit(3);

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Successfully fetched booking data');
    console.log(`   📊 Sample records: ${data?.length || 0}`);
    if (data && data.length > 0) {
      data.forEach((booking, i) => {
        console.log(`      ${i+1}. ${booking.guest_name} - $${booking.total_price} (${booking.status})`);
      });
    }
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 6: Sample Checkout Request Data
console.log('\n6. Testing sample checkout request data...');
try {
  const { data, error } = await supabase
    .from('checkout_requests')
    .select('id, name, email, status, total_amount')
    .limit(3);

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Successfully fetched checkout request data');
    console.log(`   📊 Sample records: ${data?.length || 0}`);
    if (data && data.length > 0) {
      data.forEach((req, i) => {
        console.log(`      ${i+1}. ${req.name} (${req.email}) - $${req.total_amount || 0} (${req.status})`);
      });
    }
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 7: Published Tours
console.log('\n7. Testing published tours access...');
try {
  const { count, error } = await supabase
    .from('tours')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Successfully accessed published tours');
    console.log(`   📊 Published Tours: ${count || 0}`);
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

// Test 8: Approved Tour Packages
console.log('\n8. Testing approved tour packages access...');
try {
  const { count, error } = await supabase
    .from('tour_packages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
  } else {
    console.log('   ✅ Successfully accessed approved tour packages');
    console.log(`   📊 Approved Tour Packages: ${count || 0}`);
  }
} catch (e) {
  console.log(`   ❌ Exception: ${e.message}`);
}

console.log('\n==========================================');
console.log('Test Complete!');
console.log('==========================================');
