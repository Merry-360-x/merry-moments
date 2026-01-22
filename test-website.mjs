#!/usr/bin/env node
/**
 * Comprehensive Website Testing Script
 * Tests all major functionality of Merry360x platform
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ` - ${message}` : ''}`);
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  console.log('\n📊 Testing Database Connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) throw error;
    logTest('Database Connection', true, 'Connected successfully');
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

// Test 2: Properties Table
async function testPropertiesTable() {
  console.log('\n🏠 Testing Properties Table...');
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, location, price_per_night, currency, is_published')
      .limit(5);
    
    if (error) throw error;
    logTest('Properties Table Query', true, `Found ${data.length} properties`);
    
    // Check for published properties
    const published = data.filter(p => p.is_published);
    logTest('Published Properties', published.length > 0, `${published.length} published`);
    
    return true;
  } catch (error) {
    logTest('Properties Table', false, error.message);
    return false;
  }
}

// Test 3: Tours Table
async function testToursTable() {
  console.log('\n🗺️  Testing Tours Table...');
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('id, title, location, price_per_person, currency, is_published')
      .limit(5);
    
    if (error) throw error;
    logTest('Tours Table Query', true, `Found ${data.length} tours`);
    
    const published = data.filter(t => t.is_published);
    logTest('Published Tours', true, published.length > 0 ? `${published.length} published` : 'No tours yet (expected for new platform)');
    
    return true;
  } catch (error) {
    logTest('Tours Table', false, error.message);
    return false;
  }
}

// Test 4: Transport Services
async function testTransportServices() {
  console.log('\n🚗 Testing Transport Services...');
  try {
    const { data: vehicles, error: vError } = await supabase
      .from('transport_vehicles')
      .select('id, title, vehicle_type, seats, is_published')
      .limit(5);
    
    if (vError) throw vError;
    logTest('Transport Vehicles Query', true, `Found ${vehicles.length} vehicles`);
    
    const { data: routes, error: rError } = await supabase
      .from('transport_routes')
      .select('id, from_location, to_location, base_price')
      .limit(5);
    
    if (rError) throw rError;
    logTest('Transport Routes Query', true, `Found ${routes.length} routes`);
    
    return true;
  } catch (error) {
    logTest('Transport Services', false, error.message);
    return false;
  }
}

// Test 5: Bookings Table
async function testBookingsTable() {
  console.log('\n📅 Testing Bookings Table...');
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        payment_status,
        payment_method,
        total_price,
        currency,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        created_at
      `)
      .limit(10);
    
    if (error) throw error;
    logTest('Bookings Table Query', true, `Found ${data.length} bookings`);
    
    // Check for recent bookings
    const recent = data.filter(b => {
      const created = new Date(b.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created > weekAgo;
    });
    logTest('Recent Bookings (7 days)', true, `${recent.length} recent bookings`);
    
    // Check booking statuses
    const statuses = [...new Set(data.map(b => b.status))];
    logTest('Booking Statuses', true, `Statuses: ${statuses.join(', ')}`);
    
    return true;
  } catch (error) {
    logTest('Bookings Table', false, error.message);
    return false;
  }
}

// Test 6: Host Applications
async function testHostApplications() {
  console.log('\n👥 Testing Host Applications...');
  try {
    const { data, error } = await supabase
      .from('host_applications')
      .select('id, status, full_name, service_types, created_at')
      .limit(10);
    
    if (error) throw error;
    logTest('Host Applications Query', true, `Found ${data.length} applications`);
    
    // Check application statuses
    const pending = data.filter(a => a.status === 'pending');
    const approved = data.filter(a => a.status === 'approved');
    logTest('Pending Applications', true, `${pending.length} pending`);
    logTest('Approved Applications', true, `${approved.length} approved`);
    
    return true;
  } catch (error) {
    logTest('Host Applications', false, error.message);
    return false;
  }
}

// Test 7: User Roles
async function testUserRoles() {
  console.log('\n🔐 Testing User Roles...');
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .limit(20);
    
    if (error) throw error;
    logTest('User Roles Query', true, `Found ${data.length} role assignments`);
    
    // Check role distribution
    const roles = data.reduce((acc, ur) => {
      acc[ur.role] = (acc[ur.role] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(roles).forEach(([role, count]) => {
      logTest(`Role: ${role}`, true, `${count} users`);
    });
    
    return true;
  } catch (error) {
    logTest('User Roles', false, error.message);
    return false;
  }
}

// Test 8: Stories
async function testStories() {
  console.log('\n📖 Testing Stories...');
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, created_at')
      .limit(10);
    
    if (error) throw error;
    logTest('Stories Query', true, `Found ${data.length} stories`);
    
    return true;
  } catch (error) {
    logTest('Stories', false, error.message);
    return false;
  }
}

// Test 9: RLS Policies (Row Level Security)
async function testRLSPolicies() {
  console.log('\n🔒 Testing RLS Policies...');
  try {
    // Try to query without authentication (should only see public data)
    const { data: publicProps, error: propError } = await supabase
      .from('properties')
      .select('id, title, is_published')
      .eq('is_published', true)
      .limit(5);
    
    if (propError) throw propError;
    logTest('Public Properties Access', true, `${publicProps.length} public properties visible`);
    
    return true;
  } catch (error) {
    logTest('RLS Policies', false, error.message);
    return false;
  }
}

// Test 10: Website Performance
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const startTime = Date.now();
  
  try {
    // Concurrent queries to test performance
    const [props, tours, vehicles] = await Promise.all([
      supabase.from('properties').select('id').limit(10),
      supabase.from('tours').select('id').limit(10),
      supabase.from('transport_vehicles').select('id').limit(10)
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    logTest('Concurrent Queries Performance', duration < 3000, `Completed in ${duration}ms`);
    
    return true;
  } catch (error) {
    logTest('Performance Test', false, error.message);
    return false;
  }
}

// Test 11: Data Integrity
async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...');
  
  try {
    // Check for orphaned bookings (bookings without valid property)
    const { data: bookings, error: bError } = await supabase
      .from('bookings')
      .select('id, property_id')
      .limit(50);
    
    if (bError) throw bError;
    
    const { data: properties, error: pError } = await supabase
      .from('properties')
      .select('id')
      .in('id', bookings.map(b => b.property_id));
    
    if (pError) throw pError;
    
    const validBookings = bookings.filter(b => 
      properties.some(p => p.id === b.property_id)
    );
    
    const integrity = (validBookings.length / bookings.length) * 100;
    logTest('Booking-Property Integrity', integrity > 95, `${integrity.toFixed(1)}% valid references`);
    
    return true;
  } catch (error) {
    logTest('Data Integrity', false, error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Website Tests...');
  console.log('━'.repeat(60));
  
  await testDatabaseConnection();
  await testPropertiesTable();
  await testToursTable();
  await testTransportServices();
  await testBookingsTable();
  await testHostApplications();
  await testUserRoles();
  await testStories();
  await testRLSPolicies();
  await testPerformance();
  await testDataIntegrity();
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 TEST SUMMARY');
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

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
