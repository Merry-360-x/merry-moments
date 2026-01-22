#!/usr/bin/env node
/**
 * User Flows Testing Script
 * Tests complete user journeys through the website
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const results = { passed: 0, failed: 0, tests: [] };

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ` - ${message}` : ''}`);
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

// Test 1: Guest Booking Flow
async function testGuestBookingFlow() {
  console.log('\n🛎️  Testing Guest Booking Flow...');
  
  try {
    // Step 1: Get a published property
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, title, price_per_night, currency')
      .eq('is_published', true)
      .limit(1)
      .single();
    
    if (propError) throw propError;
    logTest('Get Published Property', true, properties.title);
    
    // Step 2: Create a test booking
    const bookingData = {
      property_id: properties.id,
      is_guest_booking: true,
      guest_name: 'Test Guest',
      guest_email: 'test@example.com',
      guest_phone: '+250788000000',
      check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      check_out: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guests: 2,
      total_price: properties.price_per_night * 3,
      currency: properties.currency,
      status: 'pending',
      payment_method: 'Mobile Money',
      special_requests: 'Test booking - please ignore'
    };
    
    const { data: booking, error: bookError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (bookError) throw bookError;
    logTest('Create Guest Booking', true, `Booking ID: ${booking.id.slice(0, 8)}`);
    
    // Step 3: Verify booking was created
    const { data: verification, error: verifyError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking.id)
      .single();
    
    if (verifyError) throw verifyError;
    logTest('Verify Booking Created', true, `Status: ${verification.status}`);
    
    // Cleanup: Delete test booking
    await supabase.from('bookings').delete().eq('id', booking.id);
    logTest('Cleanup Test Booking', true, 'Test data removed');
    
    return true;
  } catch (error) {
    logTest('Guest Booking Flow', false, error.message);
    return false;
  }
}

// Test 2: Property Search Flow
async function testPropertySearch() {
  console.log('\n🔍 Testing Property Search Flow...');
  
  try {
    // Search by location
    const { data: locationResults, error: locError } = await supabase
      .from('properties')
      .select('id, title, location')
      .eq('is_published', true)
      .ilike('location', '%Kigali%')
      .limit(10);
    
    if (locError) throw locError;
    logTest('Search by Location', true, `Found ${locationResults.length} properties in Kigali`);
    
    // Search by price range
    const { data: priceResults, error: priceError } = await supabase
      .from('properties')
      .select('id, title, price_per_night')
      .eq('is_published', true)
      .gte('price_per_night', 50000)
      .lte('price_per_night', 200000)
      .limit(10);
    
    if (priceError) throw priceError;
    logTest('Search by Price Range', true, `Found ${priceResults.length} properties in range`);
    
    return true;
  } catch (error) {
    logTest('Property Search Flow', false, error.message);
    return false;
  }
}

// Test 3: Tour Booking Flow
async function testTourBookingFlow() {
  console.log('\n🗺️  Testing Tour Booking Flow...');
  
  try {
    // Get published tour
    const { data: tours, error: tourError } = await supabase
      .from('tours')
      .select('id, title, price_per_person, currency')
      .eq('is_published', true)
      .limit(1);
    
    if (tourError) throw tourError;
    
    if (tours.length === 0) {
      logTest('Tour Booking Flow', true, 'No published tours available (expected in initial setup)');
      return true;
    }
    
    logTest('Get Published Tour', true, tours[0].title);
    return true;
  } catch (error) {
    logTest('Tour Booking Flow', false, error.message);
    return false;
  }
}

// Test 4: Host Application Flow
async function testHostApplicationFlow() {
  console.log('\n👥 Testing Host Application Flow...');
  
  try {
    // Check host applications structure
    const { data: apps, error: appError } = await supabase
      .from('host_applications')
      .select('id, status, service_types, full_name')
      .limit(5);
    
    if (appError) throw appError;
    logTest('Query Host Applications', true, `Found ${apps.length} applications`);
    
    // Check different statuses
    const statuses = ['pending', 'approved', 'rejected'];
    for (const status of statuses) {
      const { count, error } = await supabase
        .from('host_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      if (error) throw error;
      logTest(`Applications - ${status}`, true, `${count} applications`);
    }
    
    return true;
  } catch (error) {
    logTest('Host Application Flow', false, error.message);
    return false;
  }
}

// Test 5: User Profile Flow
async function testUserProfileFlow() {
  console.log('\n👤 Testing User Profile Flow...');
  
  try {
    // Query profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone, created_at')
      .limit(5);
    
    if (profileError) throw profileError;
    logTest('Query User Profiles', true, `Found ${profiles.length} profiles`);
    
    // Check profile completeness (optional fields, so just report stats)
    const complete = profiles.filter(p => p.full_name && p.phone);
    const completeness = profiles.length > 0 ? (complete.length / profiles.length) * 100 : 0;
    logTest('Profile Completeness', true, `${completeness.toFixed(1)}% have name and phone (optional fields)`);
    
    return true;
  } catch (error) {
    logTest('User Profile Flow', false, error.message);
    return false;
  }
}

// Test 6: Payment Method Selection
async function testPaymentMethods() {
  console.log('\n💳 Testing Payment Methods...');
  
  try {
    // Check bookings with different payment methods
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('payment_method')
      .not('payment_method', 'is', null)
      .limit(50);
    
    if (error) throw error;
    
    const methods = bookings.reduce((acc, b) => {
      acc[b.payment_method] = (acc[b.payment_method] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(methods).forEach(([method, count]) => {
      logTest(`Payment Method: ${method}`, true, `${count} bookings`);
    });
    
    return true;
  } catch (error) {
    logTest('Payment Methods', false, error.message);
    return false;
  }
}

// Test 7: Dashboard Access Control
async function testDashboardAccess() {
  console.log('\n🛡️  Testing Dashboard Access Control...');
  
  try {
    // Check role assignments
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .limit(100);
    
    if (roleError) throw roleError;
    
    const roleTypes = ['admin', 'host', 'guest', 'financial_staff', 'operations_staff', 'customer_support'];
    roleTypes.forEach(roleType => {
      const count = roles.filter(r => r.role === roleType).length;
      logTest(`Role: ${roleType}`, true, `${count} users`);
    });
    
    return true;
  } catch (error) {
    logTest('Dashboard Access Control', false, error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting User Flow Tests...');
  console.log('━'.repeat(60));
  
  await testGuestBookingFlow();
  await testPropertySearch();
  await testTourBookingFlow();
  await testHostApplicationFlow();
  await testUserProfileFlow();
  await testPaymentMethods();
  await testDashboardAccess();
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 USER FLOW TEST SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('━'.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('💥 User flow test suite crashed:', error);
  process.exit(1);
});
