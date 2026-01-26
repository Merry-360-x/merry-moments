#!/usr/bin/env node

/**
 * Create test bulk booking with property, tour, and transport
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createBulkBooking() {
  console.log('🛒 Creating test bulk booking...\n');

  // Generate a proper UUID for order_id
  const { data: uuidData } = await supabase.rpc('gen_random_uuid');
  const orderId = uuidData || crypto.randomUUID();
  const guestId = 'cab21106-dead-40e0-a164-0966d2cf36a2'; // Your user ID
  const checkIn = '2026-02-01';
  const checkOut = '2026-02-05';

  // 1. Get a property
  const { data: property } = await supabase
    .from('properties')
    .select('id, title, price_per_night, currency, host_id')
    .limit(1)
    .single();

  if (!property) {
    console.log('❌ No property found');
    return;
  }

  console.log(`✓ Property: ${property.title} (${property.price_per_night} ${property.currency})`);

  // 2. Check if tours exist
  const { data: tours } = await supabase
    .from('tour_packages')
    .select('id, title, price_per_person, currency, created_by')
    .limit(1);

  // 3. Check if transport exists
  const { data: transports } = await supabase
    .from('transport_services')
    .select('id, title, price_per_day, currency, created_by')
    .limit(1);

  const bookings = [];

  // Create property booking
  const propertyBooking = {
    order_id: orderId,
    guest_id: guestId,
    property_id: property.id,
    booking_type: 'property',
    host_id: property.host_id,
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
    total_price: property.price_per_night * 4, // 4 nights
    currency: property.currency,
    status: 'confirmed',
    payment_status: 'pending',
    payment_method: 'mtn_momo'
  };

  const { data: propBooking, error: propError } = await supabase
    .from('bookings')
    .insert(propertyBooking)
    .select()
    .single();

  if (propError) {
    console.log('❌ Property booking error:', propError.message);
  } else {
    console.log(`✓ Property booking created: ${propBooking.id.substring(0, 8)}...`);
    bookings.push(propBooking);
  }

  // Create tour booking if tours exist
  if (tours && tours.length > 0) {
    const tour = tours[0];
    console.log(`✓ Tour: ${tour.title} (${tour.price_per_person} ${tour.currency})`);

    const tourBooking = {
      order_id: orderId,
      guest_id: guestId,
      tour_id: tour.id,
      booking_type: 'tour',
      host_id: tour.created_by,
      check_in: checkIn,
      check_out: checkOut,
      guests: 2,
      total_price: tour.price_per_person * 2,
      currency: tour.currency,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'mtn_momo'
    };

    const { data: tourBook, error: tourError } = await supabase
      .from('bookings')
      .insert(tourBooking)
      .select()
      .single();

    if (tourError) {
      console.log('❌ Tour booking error:', tourError.message);
    } else {
      console.log(`✓ Tour booking created: ${tourBook.id.substring(0, 8)}...`);
      bookings.push(tourBook);
    }
  } else {
    console.log('ℹ️  No tours available to add to bulk order');
  }

  // Create transport booking if transport exists
  if (transports && transports.length > 0) {
    const transport = transports[0];
    console.log(`✓ Transport: ${transport.title} (${transport.price_per_day} ${transport.currency})`);

    const transportBooking = {
      order_id: orderId,
      guest_id: guestId,
      transport_id: transport.id,
      booking_type: 'transport',
      host_id: transport.created_by,
      check_in: checkIn,
      check_out: checkOut,
      guests: 2,
      total_price: transport.price_per_day * 4,
      currency: transport.currency,
      status: 'confirmed',
      payment_status: 'pending',
      payment_method: 'mtn_momo'
    };

    const { data: transBook, error: transError } = await supabase
      .from('bookings')
      .insert(transportBooking)
      .select()
      .single();

    if (transError) {
      console.log('❌ Transport booking error:', transError.message);
    } else {
      console.log(`✓ Transport booking created: ${transBook.id.substring(0, 8)}...`);
      bookings.push(transBook);
    }
  } else {
    console.log('ℹ️  No transport services available to add to bulk order');
  }

  console.log(`\n✅ Bulk order created with ${bookings.length} item(s)`);
  console.log(`📋 Order ID: ${orderId}`);
  console.log(`\n🔍 Test it with: node test-booking-ui.mjs`);
  console.log(`📱 Or search for this booking ID in the UI: ${bookings[0]?.id || 'N/A'}`);
}

createBulkBooking().catch(console.error);
