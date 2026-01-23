#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}${details ? ': ' + details : ''}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// ==================== DATA PULL TESTS ====================

async function testPropertiesPull() {
  console.log('\n📦 Testing Properties Data Pull...');
  
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, location, price_per_night, currency, max_guests, is_published')
      .limit(10);
    
    if (error) throw error;
    logTest('Properties table query', true, `${data?.length || 0} properties found`);
    
    if (data && data.length > 0) {
      const hasRequiredFields = data.every(p => p.id && p.title);
      logTest('Properties have required fields', hasRequiredFields);
    }
    
    return data;
  } catch (error) {
    logTest('Properties table query', false, error.message);
    return null;
  }
}

async function testBookingsPull() {
  console.log('\n📅 Testing Bookings Data Pull...');
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, property_id, guest_id, guest_name, guest_email, guest_phone, check_in, check_out, total_price, currency, status, is_guest_booking')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    logTest('Bookings table query', true, `${data?.length || 0} bookings found`);
    
    if (data && data.length > 0) {
      const hasGuestInfo = data.filter(b => b.guest_name && b.guest_email && b.guest_phone);
      logTest('Bookings have guest information', hasGuestInfo.length > 0, 
        `${hasGuestInfo.length}/${data.length} bookings have complete guest info`);
    }
    
    return data;
  } catch (error) {
    logTest('Bookings table query', false, error.message);
    return null;
  }
}

async function testToursPull() {
  console.log('\n🗺️ Testing Tours Data Pull...');
  
  try {
    // Test regular tours
    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('id, title, location, price_per_person, currency, is_published')
      .limit(10);
    
    if (toursError) throw toursError;
    logTest('Tours table query', true, `${tours?.length || 0} tours found`);
    
    // Test tour packages
    const { data: packages, error: packagesError } = await supabase
      .from('tour_packages')
      .select('id, title, country, city, price_per_adult, currency, status')
      .limit(10);
    
    if (packagesError) throw packagesError;
    logTest('Tour packages table query', true, `${packages?.length || 0} tour packages found`);
    
    return { tours, packages };
  } catch (error) {
    logTest('Tours/Packages query', false, error.message);
    return null;
  }
}

async function testProfilesPull() {
  console.log('\n👤 Testing Profiles Data Pull...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, nickname, phone, bio')
      .limit(10);
    
    if (error) throw error;
    logTest('Profiles table query', true, `${data?.length || 0} profiles found`);
    
    if (data && data.length > 0) {
      const hasContactInfo = data.filter(p => p.phone);
      logTest('Profiles have contact info', hasContactInfo.length > 0,
        `${hasContactInfo.length}/${data.length} profiles have contact info`);
    }
    
    return data;
  } catch (error) {
    logTest('Profiles table query', false, error.message);
    return null;
  }
}

async function testTransportPull() {
  console.log('\n🚗 Testing Transport Data Pull...');
  
  try {
    // Test vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('transport_vehicles')
      .select('id, title, vehicle_type, seats, price_per_day, currency')
      .limit(10);
    
    if (vehiclesError) throw vehiclesError;
    logTest('Transport vehicles query', true, `${vehicles?.length || 0} vehicles found`);
    
    // Test routes
    const { data: routes, error: routesError } = await supabase
      .from('transport_routes')
      .select('id, from_location, to_location, base_price, currency')
      .limit(10);
    
    if (routesError) throw routesError;
    logTest('Transport routes query', true, `${routes?.length || 0} routes found`);
    
    return { vehicles, routes };
  } catch (error) {
    logTest('Transport query', false, error.message);
    return null;
  }
}

async function testHostApplicationsPull() {
  console.log('\n📋 Testing Host Applications Data Pull...');
  
  try {
    const { data, error } = await supabase
      .from('host_applications')
      .select('id, user_id, status, service_types, full_name, phone')
      .limit(10);
    
    if (error) throw error;
    logTest('Host applications query', true, `${data?.length || 0} applications found`);
    
    if (data && data.length > 0) {
      const statusCount = data.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});
      logTest('Applications have status', true, JSON.stringify(statusCount));
    }
    
    return data;
  } catch (error) {
    logTest('Host applications query', false, error.message);
    return null;
  }
}

async function testStoriesPull() {
  console.log('\n📸 Testing Stories Data Pull...');
  
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, body, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    logTest('Stories table query', true, `${data?.length || 0} stories found`);
    
    return data;
  } catch (error) {
    logTest('Stories table query', false, error.message);
    return null;
  }
}

// ==================== DATA INTEGRITY TESTS ====================

async function testBookingDataIntegrity(bookings) {
  console.log('\n🔍 Testing Booking Data Integrity...');
  
  if (!bookings || bookings.length === 0) {
    logTest('Booking data integrity check', false, 'No bookings to test');
    return;
  }
  
  // Check for guest information completeness
  const registeredUserBookings = bookings.filter(b => !b.is_guest_booking && b.guest_id);
  const guestBookings = bookings.filter(b => b.is_guest_booking);
  
  logTest('Registered user bookings found', registeredUserBookings.length > 0,
    `${registeredUserBookings.length} registered user bookings`);
  
  logTest('Guest bookings found', guestBookings.length > 0,
    `${guestBookings.length} guest bookings`);
  
  // Check if registered user bookings have guest info
  const registeredWithInfo = registeredUserBookings.filter(b => 
    b.guest_name && b.guest_email && b.guest_phone
  );
  
  if (registeredUserBookings.length > 0) {
    const percentage = (registeredWithInfo.length / registeredUserBookings.length * 100).toFixed(1);
    logTest('Registered bookings have guest info', registeredWithInfo.length > 0,
      `${registeredWithInfo.length}/${registeredUserBookings.length} (${percentage}%)`);
  }
  
  // Check date validity
  const validDates = bookings.filter(b => {
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    return checkOut > checkIn;
  });
  
  logTest('Bookings have valid dates', validDates.length === bookings.length,
    `${validDates.length}/${bookings.length} bookings have valid dates`);
  
  // Check price fields
  const withPrices = bookings.filter(b => b.total_price > 0 && b.currency);
  logTest('Bookings have valid prices', withPrices.length > 0,
    `${withPrices.length}/${bookings.length} bookings have price info`);
}

async function testPropertyDataIntegrity(properties) {
  console.log('\n🏠 Testing Property Data Integrity...');
  
  if (!properties || properties.length === 0) {
    logTest('Property data integrity check', false, 'No properties to test');
    return;
  }
  
  const published = properties.filter(p => p.is_published);
  logTest('Published properties exist', published.length > 0,
    `${published.length}/${properties.length} properties published`);
  
  const withPricing = properties.filter(p => p.price_per_night > 0 && p.currency);
  logTest('Properties have pricing', withPricing.length > 0,
    `${withPricing.length}/${properties.length} have valid pricing`);
  
  const withLocation = properties.filter(p => p.location && p.location.trim());
  logTest('Properties have location', withLocation.length === properties.length,
    `${withLocation.length}/${properties.length} have location info`);
}

// ==================== RELATIONSHIP TESTS ====================

async function testPropertyBookingRelationship() {
  console.log('\n🔗 Testing Property-Booking Relationships...');
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, property_id, properties(id, title)')
      .limit(5);
    
    if (error) throw error;
    
    const withPropertyData = data.filter(b => b.properties && b.properties.title);
    logTest('Booking-Property relationship', withPropertyData.length > 0,
      `${withPropertyData.length}/${data.length} bookings linked to properties`);
    
  } catch (error) {
    logTest('Booking-Property relationship', false, error.message);
  }
}

async function testUserProfileRelationship() {
  console.log('\n🔗 Testing User-Profile Relationships...');
  
  try {
    // Get some user IDs from bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('guest_id')
      .not('guest_id', 'is', null)
      .limit(5);
    
    if (bookingsError) throw bookingsError;
    
    if (bookings && bookings.length > 0) {
      const userIds = bookings.map(b => b.guest_id).filter(Boolean);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      logTest('User-Profile relationship', profiles && profiles.length > 0,
        `Found ${profiles?.length || 0} profiles for ${userIds.length} user IDs`);
    } else {
      logTest('User-Profile relationship', false, 'No user IDs found to test');
    }
    
  } catch (error) {
    logTest('User-Profile relationship', false, error.message);
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Data Test Suite');
  console.log('==========================================\n');
  
  const startTime = Date.now();
  
  // Pull tests
  const properties = await testPropertiesPull();
  const bookings = await testBookingsPull();
  const tours = await testToursPull();
  const profiles = await testProfilesPull();
  const transport = await testTransportPull();
  const applications = await testHostApplicationsPull();
  const stories = await testStoriesPull();
  
  // Integrity tests
  await testBookingDataIntegrity(bookings);
  await testPropertyDataIntegrity(properties);
  
  // Relationship tests
  await testPropertyBookingRelationship();
  await testUserProfileRelationship();
  
  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n==========================================');
  console.log('📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`   - ${t.name}: ${t.details}`));
  }
  
  console.log('\n==========================================\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
