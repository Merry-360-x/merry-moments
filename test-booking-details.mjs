#!/usr/bin/env node

/**
 * Booking Details Testing Script
 * Tests that booking details show all information from host to guest/user
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Testing Booking Details Display...\n');
console.log('=' .repeat(70));

// Test 1: Get a sample booking with all related data
async function testBookingDetails() {
  console.log('\n📋 Test 1: Fetching Booking with All Details...\n');
  
  try {
    // First, get any booking
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(5);
    
    if (bookingsError) throw bookingsError;
    
    if (bookings.length === 0) {
      console.log('⚠️  No bookings found. Creating test booking...');
      await createTestBooking();
      return;
    }
    
    console.log(`✅ Found ${bookings.length} bookings\n`);
    
    // Test each booking
    for (const booking of bookings) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📌 Booking ID: ${booking.id}`);
      console.log(`   Order ID: ${booking.order_id || 'N/A'}`);
      console.log(`   Type: ${booking.booking_type || 'property'}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Payment Status: ${booking.payment_status || 'N/A'}`);
      
      // Fetch related data separately (as dashboard does to avoid RLS issues)
      const enrichedBooking = await enrichBookingData(booking);
      
      // Check Guest Information
      console.log(`\n   👤 GUEST INFORMATION:`);
      if (booking.is_guest_booking) {
        console.log(`      Guest Name: ${booking.guest_name || '❌ MISSING'}`);
        console.log(`      Guest Email: ${booking.guest_email || '❌ MISSING'}`);
        console.log(`      Guest Phone: ${booking.guest_phone || '❌ MISSING'}`);
      } else {
        console.log(`      User ID: ${booking.guest_id || '❌ MISSING'}`);
        if (enrichedBooking.guest_profile) {
          console.log(`      User Name: ${enrichedBooking.guest_profile.full_name || 'N/A'}`);
          console.log(`      User Email: ${enrichedBooking.guest_profile.email || 'N/A'}`);
        } else {
          console.log(`      ❌ Guest profile not found`);
        }
      }
      
      // Check Host Information
      console.log(`\n   🏢 HOST INFORMATION:`);
      if (booking.host_id) {
        console.log(`      Host ID: ${booking.host_id}`);
        if (enrichedBooking.host_profile) {
          console.log(`      Host Name: ${enrichedBooking.host_profile.full_name || 'N/A'}`);
          console.log(`      Host Email: ${enrichedBooking.host_profile.email || 'N/A'}`);
        } else {
          console.log(`      ⚠️  Host profile not found`);
        }
      } else {
        console.log(`      ⚠️  No host_id assigned`);
      }
      
      // Check Service Information
      console.log(`\n   🏠 SERVICE INFORMATION:`);
      if (booking.property_id) {
        if (enrichedBooking.property) {
          console.log(`      Property: ${enrichedBooking.property.title}`);
          console.log(`      Location: ${enrichedBooking.property.location}`);
          console.log(`      Price/Night: ${enrichedBooking.property.price_per_night} ${enrichedBooking.property.currency || 'RWF'}`);
          console.log(`      Images: ${enrichedBooking.property.images?.length || 0} photos`);
        } else {
          console.log(`      ❌ Property not found (ID: ${booking.property_id})`);
        }
      } else if (booking.tour_id) {
        if (enrichedBooking.tour) {
          console.log(`      Tour: ${enrichedBooking.tour.title}`);
          console.log(`      Location: ${enrichedBooking.tour.city}, ${enrichedBooking.tour.country}`);
          console.log(`      Price/Person: ${enrichedBooking.tour.price_per_person || 'N/A'}`);
          console.log(`      Images: ${enrichedBooking.tour.images?.length || 0} photos`);
        } else {
          console.log(`      ❌ Tour not found (ID: ${booking.tour_id})`);
        }
      } else if (booking.transport_id) {
        if (enrichedBooking.vehicle) {
          console.log(`      Vehicle: ${enrichedBooking.vehicle.title}`);
          console.log(`      Type: ${enrichedBooking.vehicle.vehicle_type}`);
          console.log(`      Seats: ${enrichedBooking.vehicle.seats}`);
          console.log(`      Price/Day: ${enrichedBooking.vehicle.price_per_day} ${enrichedBooking.vehicle.currency || 'RWF'}`);
          console.log(`      Images: ${enrichedBooking.vehicle.images?.length || 0} photos`);
        } else {
          console.log(`      ❌ Vehicle not found (ID: ${booking.transport_id})`);
        }
      }
      
      // Check Booking Details
      console.log(`\n   📅 BOOKING DETAILS:`);
      console.log(`      Check-in: ${booking.check_in}`);
      console.log(`      Check-out: ${booking.check_out}`);
      console.log(`      Guests: ${booking.guests || 'N/A'}`);
      console.log(`      Total Price: ${booking.total_price} ${booking.currency || 'RWF'}`);
      console.log(`      Payment Method: ${booking.payment_method || 'N/A'}`);
      if (booking.special_requests) {
        console.log(`      Special Requests: ${booking.special_requests}`);
      }
      
      // Data completeness check
      const missingData = [];
      if (!booking.guest_name && !enrichedBooking.guest_profile) missingData.push('Guest Info');
      if (!booking.host_id || !enrichedBooking.host_profile) missingData.push('Host Info');
      if (!enrichedBooking.property && !enrichedBooking.tour && !enrichedBooking.vehicle) missingData.push('Service Info');
      
      if (missingData.length > 0) {
        console.log(`\n   ⚠️  MISSING DATA: ${missingData.join(', ')}`);
      } else {
        console.log(`\n   ✅ All essential data present`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 2: Get bulk order details
async function testBulkOrderDetails() {
  console.log('\n\n📦 Test 2: Fetching Bulk Order Details...\n');
  
  try {
    // Find bookings with same order_id (bulk orders)
    const { data: allBookings, error } = await supabase
      .from('bookings')
      .select('order_id')
      .not('order_id', 'is', null)
      .limit(100);
    
    if (error) throw error;
    
    // Group by order_id
    const orderIds = allBookings.map(b => b.order_id);
    const orderIdCounts = {};
    orderIds.forEach(id => {
      orderIdCounts[id] = (orderIdCounts[id] || 0) + 1;
    });
    
    // Find bulk orders (more than 1 booking)
    const bulkOrderIds = Object.keys(orderIdCounts).filter(id => orderIdCounts[id] > 1);
    
    if (bulkOrderIds.length === 0) {
      console.log('⚠️  No bulk orders found. Creating test bulk order...');
      await createTestBulkOrder();
      return;
    }
    
    console.log(`✅ Found ${bulkOrderIds.length} bulk orders\n`);
    
    // Test the first bulk order
    const testOrderId = bulkOrderIds[0];
    console.log(`${'─'.repeat(70)}`);
    console.log(`📦 Bulk Order ID: ${testOrderId}`);
    console.log(`   Contains ${orderIdCounts[testOrderId]} items\n`);
    
    const { data: orderBookings, error: orderError } = await supabase
      .from('bookings')
      .select('*')
      .eq('order_id', testOrderId)
      .order('created_at', { ascending: true });
    
    if (orderError) throw orderError;
    
    let totalPrice = 0;
    const serviceTypes = new Set();
    const hosts = new Set();
    
    for (let i = 0; i < orderBookings.length; i++) {
      const booking = orderBookings[i];
      const enriched = await enrichBookingData(booking);
      
      totalPrice += booking.total_price || 0;
      serviceTypes.add(booking.booking_type || 'property');
      if (booking.host_id) hosts.add(booking.host_id);
      
      console.log(`   ${i + 1}. Item Details:`);
      
      // Show service name
      let serviceName = 'Unknown Service';
      let serviceImage = null;
      
      if (enriched.property) {
        serviceName = enriched.property.title;
        serviceImage = enriched.property.images?.[0];
        console.log(`      Type: Property`);
      } else if (enriched.tour) {
        serviceName = enriched.tour.title;
        serviceImage = enriched.tour.images?.[0];
        console.log(`      Type: Tour`);
      } else if (enriched.vehicle) {
        serviceName = enriched.vehicle.title;
        serviceImage = enriched.vehicle.images?.[0];
        console.log(`      Type: Transport`);
      }
      
      console.log(`      Name: ${serviceName}`);
      console.log(`      Image: ${serviceImage ? '✅ Available' : '❌ No image'}`);
      console.log(`      Price: ${booking.total_price} ${booking.currency || 'RWF'}`);
      console.log(`      Status: ${booking.status}`);
      
      if (enriched.host_profile) {
        console.log(`      Host: ${enriched.host_profile.full_name || 'N/A'}`);
      } else {
        console.log(`      Host: ⚠️  Not found`);
      }
      
      console.log('');
    }
    
    console.log(`${'─'.repeat(70)}`);
    console.log(`📊 BULK ORDER SUMMARY:`);
    console.log(`   Total Items: ${orderBookings.length}`);
    console.log(`   Total Price: ${totalPrice} RWF`);
    console.log(`   Service Types: ${Array.from(serviceTypes).join(', ')}`);
    console.log(`   Unique Hosts: ${hosts.size}`);
    
    // Check if guest info is consistent
    const firstBooking = orderBookings[0];
    const sameGuest = orderBookings.every(b => 
      b.guest_name === firstBooking.guest_name && 
      b.guest_email === firstBooking.guest_email
    );
    
    if (sameGuest) {
      console.log(`   ✅ Guest info consistent across all items`);
    } else {
      console.log(`   ⚠️  Guest info varies between items`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Helper function to enrich booking data (like dashboard does)
async function enrichBookingData(booking) {
  const enriched = { ...booking };
  
  try {
    // Fetch property if property_id exists
    if (booking.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('id, title, location, price_per_night, currency, images')
        .eq('id', booking.property_id)
        .single();
      enriched.property = property;
    }
    
    // Fetch tour if tour_id exists
    if (booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('id, title, city, country, price_per_person, images')
        .eq('id', booking.tour_id)
        .single();
      enriched.tour = tour;
    }
    
    // Fetch vehicle if transport_id exists
    if (booking.transport_id) {
      const { data: vehicle } = await supabase
        .from('transport_vehicles')
        .select('id, title, vehicle_type, seats, price_per_day, currency, images')
        .eq('id', booking.transport_id)
        .single();
      enriched.vehicle = vehicle;
    }
    
    // Fetch host profile
    if (booking.host_id) {
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('user_id', booking.host_id)
        .single();
      enriched.host_profile = hostProfile;
    }
    
    // Fetch guest profile if not guest booking
    if (!booking.is_guest_booking && booking.guest_id) {
      const { data: guestProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('user_id', booking.guest_id)
        .single();
      enriched.guest_profile = guestProfile;
    }
    
  } catch (error) {
    console.error('⚠️  Error enriching booking data:', error.message);
  }
  
  return enriched;
}

// Helper to create test booking if none exist
async function createTestBooking() {
  console.log('Creating test booking...');
  // This would require authentication, so we'll skip for now
  console.log('⚠️  Cannot create test booking without authentication');
}

// Helper to create test bulk order if none exist
async function createTestBulkOrder() {
  console.log('Creating test bulk order...');
  // This would require authentication, so we'll skip for now
  console.log('⚠️  Cannot create test bulk order without authentication');
}

// Run all tests
async function runTests() {
  await testBookingDetails();
  await testBulkOrderDetails();
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Booking Details Testing Complete!\n');
}

runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
