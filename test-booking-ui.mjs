#!/usr/bin/env node

/**
 * Test script to verify booking details UI data
 * Checks:
 * 1. Host name is properly fetched and displayed
 * 2. Bulk bookings show all items (property, tour, transport)
 * 3. All related data is correctly enriched
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

async function testBookingDetails() {
  console.log('\n' + '='.repeat(80));
  log('🧪 BOOKING DETAILS UI TEST', colors.bold + colors.cyan);
  console.log('='.repeat(80) + '\n');

  // Get all bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    log(`❌ Error fetching bookings: ${error.message}`, colors.red);
    return;
  }

  log(`📦 Found ${bookings.length} booking(s)\n`, colors.cyan);

  for (const booking of bookings) {
    console.log('─'.repeat(80));
    log(`\n📋 BOOKING: ${booking.id.substring(0, 8)}...`, colors.bold);
    log(`   Type: ${booking.booking_type || 'property'}`, colors.cyan);
    log(`   Status: ${booking.status} | Payment: ${booking.payment_status}`);
    
    if (booking.order_id) {
      log(`   🛒 BULK ORDER: ${booking.order_id.substring(0, 8)}...`, colors.yellow);
    }

    // Test 1: HOST NAME
    console.log('\n' + '─'.repeat(40));
    log('TEST 1: Host Information', colors.bold + colors.cyan);
    console.log('─'.repeat(40));
    
    if (booking.host_id) {
      log(`✓ Host ID exists: ${booking.host_id.substring(0, 8)}...`, colors.green);
      
      // Fetch host profile (using correct column name)
      const { data: hostProfile, error: hostError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nickname, email')
        .eq('user_id', booking.host_id)
        .single();

      if (hostError) {
        log(`✗ Host profile error: ${hostError.message}`, colors.red);
      } else if (hostProfile) {
        const displayName = hostProfile.full_name || hostProfile.nickname || hostProfile.email || 'N/A';
        log(`✓ Host profile found!`, colors.green);
        log(`  Display Name: ${displayName}`, colors.green);
        log(`  Full Name: ${hostProfile.full_name || 'N/A'}`);
        log(`  Nickname: ${hostProfile.nickname || 'N/A'}`);
        log(`  Email: ${hostProfile.email || 'N/A'}`);
      } else {
        log(`✗ No profile found for host ID`, colors.red);
      }
    } else {
      log(`✗ No host_id in booking`, colors.red);
    }

    // Test 2: BOOKING TYPE DETAILS
    console.log('\n' + '─'.repeat(40));
    log('TEST 2: Booking Type Details', colors.bold + colors.cyan);
    console.log('─'.repeat(40));

    const bookingType = booking.booking_type || 'property';

    if (bookingType === 'property' && booking.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('id, title, images, price_per_night, currency')
        .eq('id', booking.property_id)
        .single();

      if (property) {
        log(`✓ PROPERTY found:`, colors.green);
        log(`  Title: ${property.title}`);
        log(`  Price: ${property.price_per_night} ${property.currency}`);
        log(`  Images: ${property.images?.length || 0} image(s)`);
        if (property.images?.[0]) {
          log(`  First image: ${property.images[0].substring(0, 50)}...`);
        }
      } else {
        log(`✗ Property not found`, colors.red);
      }
    }

    if (bookingType === 'tour' && booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('id, title, price_per_person, currency')
        .eq('id', booking.tour_id)
        .single();

      if (tour) {
        log(`✓ TOUR found:`, colors.green);
        log(`  Title: ${tour.title}`);
        log(`  Price: ${tour.price_per_person} ${tour.currency}`);
      } else {
        log(`✗ Tour not found`, colors.red);
      }
    }

    if (bookingType === 'transport' && booking.transport_id) {
      const { data: transport } = await supabase
        .from('transport_services')
        .select('id, title, vehicle_type, price_per_day, currency')
        .eq('id', booking.transport_id)
        .single();

      if (transport) {
        log(`✓ TRANSPORT found:`, colors.green);
        log(`  Title: ${transport.title}`);
        log(`  Vehicle: ${transport.vehicle_type}`);
        log(`  Price: ${transport.price_per_day} ${transport.currency}`);
      } else {
        log(`✗ Transport not found`, colors.red);
      }
    }

    // Test 3: BULK ORDER DETAILS
    if (booking.order_id) {
      console.log('\n' + '─'.repeat(40));
      log('TEST 3: Bulk Order Items', colors.bold + colors.cyan);
      console.log('─'.repeat(40));

      const { data: orderBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('order_id', booking.order_id)
        .order('created_at', { ascending: false });

      log(`✓ Order has ${orderBookings.length} item(s)`, colors.green);

      for (let i = 0; i < orderBookings.length; i++) {
        const item = orderBookings[i];
        const itemType = item.booking_type || 'property';
        
        console.log(`\n  Item ${i + 1}/${orderBookings.length}:`);
        log(`  ID: ${item.id.substring(0, 8)}...`, colors.cyan);
        log(`  Type: ${itemType}`);
        log(`  Amount: ${item.total_price} ${item.currency}`);

        // Fetch item details
        if (itemType === 'property' && item.property_id) {
          const { data: prop } = await supabase
            .from('properties')
            .select('title, images')
            .eq('id', item.property_id)
            .single();
          
          if (prop) {
            log(`  🏠 Property: ${prop.title}`, colors.green);
            log(`     Images: ${prop.images?.length || 0}`);
          }
        }

        if (itemType === 'tour' && item.tour_id) {
          const { data: tour } = await supabase
            .from('tour_packages')
            .select('title')
            .eq('id', item.tour_id)
            .single();
          
          if (tour) {
            log(`  🗺️  Tour: ${tour.title}`, colors.green);
          }
        }

        if (itemType === 'transport' && item.transport_id) {
          const { data: transport } = await supabase
            .from('transport_services')
            .select('title, vehicle_type')
            .eq('id', item.transport_id)
            .single();
          
          if (transport) {
            log(`  🚗 Transport: ${transport.title} (${transport.vehicle_type})`, colors.green);
          }
        }
      }
    }

    // Test 4: GUEST INFORMATION
    console.log('\n' + '─'.repeat(40));
    log('TEST 4: Guest Information', colors.bold + colors.cyan);
    console.log('─'.repeat(40));

    if (booking.is_guest_booking) {
      log(`✓ Guest Booking`, colors.cyan);
      log(`  Name: ${booking.guest_name || 'N/A'}`);
      log(`  Email: ${booking.guest_email || 'N/A'}`);
      log(`  Phone: ${booking.guest_phone || 'N/A'}`);
    } else if (booking.guest_id) {
      const { data: guestProfile } = await supabase
        .from('profiles')
        .select('full_name, nickname, email, phone')
        .eq('user_id', booking.guest_id)
        .single();

      if (guestProfile) {
        log(`✓ Registered Guest`, colors.green);
        log(`  Name: ${guestProfile.full_name || guestProfile.nickname || 'N/A'}`);
        log(`  Email: ${guestProfile.email || 'N/A'}`);
        log(`  Phone: ${guestProfile.phone || 'N/A'}`);
      }
    }

    // Test 5: PAYMENT INFORMATION
    console.log('\n' + '─'.repeat(40));
    log('TEST 5: Payment Information', colors.bold + colors.cyan);
    console.log('─'.repeat(40));

    log(`  Amount: ${booking.total_price} ${booking.currency}`, colors.cyan);
    log(`  Method: ${booking.payment_method || 'N/A'}`);
    log(`  Status: ${booking.payment_status || 'N/A'}`);

    // Check payment transactions
    const { data: transactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('booking_id', booking.id);

    if (transactions && transactions.length > 0) {
      log(`✓ ${transactions.length} payment transaction(s) found`, colors.green);
      transactions.forEach((tx, i) => {
        log(`  TX ${i + 1}: ${tx.amount} ${tx.currency} - ${tx.status}`);
      });
    } else {
      log(`  No payment transactions yet`);
    }

    console.log('\n');
  }

  // SUMMARY
  console.log('\n' + '='.repeat(80));
  log('📊 TEST SUMMARY', colors.bold + colors.cyan);
  console.log('='.repeat(80));
  
  const testResults = {
    totalBookings: bookings.length,
    withHost: bookings.filter(b => b.host_id).length,
    bulkOrders: bookings.filter(b => b.order_id).length,
    propertyBookings: bookings.filter(b => (b.booking_type || 'property') === 'property').length,
    tourBookings: bookings.filter(b => b.booking_type === 'tour').length,
    transportBookings: bookings.filter(b => b.booking_type === 'transport').length
  };

  log(`\n✓ Total Bookings: ${testResults.totalBookings}`, colors.green);
  log(`✓ With Host ID: ${testResults.withHost}`, colors.green);
  log(`✓ Bulk Orders: ${testResults.bulkOrders}`, colors.green);
  log(`✓ Property Bookings: ${testResults.propertyBookings}`, colors.cyan);
  log(`✓ Tour Bookings: ${testResults.tourBookings}`, colors.cyan);
  log(`✓ Transport Bookings: ${testResults.transportBookings}`, colors.cyan);

  console.log('\n' + '='.repeat(80));
  log('✅ TEST COMPLETE', colors.bold + colors.green);
  console.log('='.repeat(80) + '\n');
}

testBookingDetails().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
