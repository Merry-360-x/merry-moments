#!/usr/bin/env node

/**
 * Create Test Bookings Script
 * Creates sample bookings with complete data for testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n🔧 Creating Test Bookings with Complete Data...\n');

async function createTestBookings() {
  try {
    // Get a property
    const { data: properties } = await supabase
      .from('properties')
      .select('id, host_id, price_per_night, currency')
      .limit(3);
    
    // Get a tour
    const { data: tours } = await supabase
      .from('tour_packages')
      .select('id, host_id, price_per_person')
      .limit(1);
    
    // Get a vehicle
    const { data: vehicles } = await supabase
      .from('transport_vehicles')
      .select('id, host_id, price_per_day')
      .limit(1);
    
    if (!properties || properties.length === 0) {
      console.log('❌ No properties found');
      return;
    }
    
    const orderId = randomUUID();
    const bookings = [];
    
    // Create a single property booking
    console.log('Creating single property booking...');
    const singleBooking = {
      id: randomUUID(),
      property_id: properties[0].id,
      host_id: properties[0].host_id,
      guest_name: 'John Doe',
      guest_email: 'john.doe@example.com',
      guest_phone: '+250788123456',
      is_guest_booking: true,
      booking_type: 'property',
      check_in: '2026-02-15',
      check_out: '2026-02-20',
      guests: 2,
      total_price: properties[0].price_per_night * 5,
      currency: properties[0].currency || 'RWF',
      payment_method: 'mtn_momo',
      payment_status: 'pending',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    
    bookings.push(singleBooking);
    
    // Create bulk order with multiple items
    if (properties.length >= 2) {
      console.log('Creating bulk order with multiple items...');
      
      // Property 1 in bulk order
      bookings.push({
        id: randomUUID(),
        order_id: orderId,
        property_id: properties[1].id,
        host_id: properties[1].host_id,
        guest_name: 'Jane Smith',
        guest_email: 'jane.smith@example.com',
        guest_phone: '+250788654321',
        is_guest_booking: true,
        booking_type: 'property',
        check_in: '2026-03-01',
        check_out: '2026-03-05',
        guests: 4,
        total_price: properties[1].price_per_night * 4,
        currency: properties[1].currency || 'RWF',
        payment_method: 'mtn_momo',
        payment_status: 'pending',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      
      // Property 2 in bulk order
      if (properties.length >= 3) {
        bookings.push({
          id: randomUUID(),
          order_id: orderId,
          property_id: properties[2].id,
          host_id: properties[2].host_id,
          guest_name: 'Jane Smith',
          guest_email: 'jane.smith@example.com',
          guest_phone: '+250788654321',
          is_guest_booking: true,
          booking_type: 'property',
          check_in: '2026-03-05',
          check_out: '2026-03-08',
          guests: 4,
          total_price: properties[2].price_per_night * 3,
          currency: properties[2].currency || 'RWF',
          payment_method: 'mtn_momo',
          payment_status: 'pending',
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
      
      // Add tour to bulk order if available
      if (tours && tours.length > 0) {
        bookings.push({
          id: randomUUID(),
          order_id: orderId,
          tour_id: tours[0].id,
          host_id: tours[0].host_id,
          guest_name: 'Jane Smith',
          guest_email: 'jane.smith@example.com',
          guest_phone: '+250788654321',
          is_guest_booking: true,
          booking_type: 'tour',
          check_in: '2026-03-10',
          check_out: '2026-03-12',
          guests: 4,
          total_price: (tours[0].price_per_person || 50000) * 4,
          currency: 'RWF',
          payment_method: 'mtn_momo',
          payment_status: 'pending',
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
      
      // Add transport to bulk order if available
      if (vehicles && vehicles.length > 0) {
        bookings.push({
          id: randomUUID(),
          order_id: orderId,
          transport_id: vehicles[0].id,
          host_id: vehicles[0].host_id,
          guest_name: 'Jane Smith',
          guest_email: 'jane.smith@example.com',
          guest_phone: '+250788654321',
          is_guest_booking: true,
          booking_type: 'transport',
          check_in: '2026-03-01',
          check_out: '2026-03-08',
          guests: 4,
          total_price: vehicles[0].price_per_day * 7,
          currency: 'RWF',
          payment_method: 'mtn_momo',
          payment_status: 'pending',
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }
    
    // Insert all bookings
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookings)
      .select();
    
    if (error) {
      console.error('❌ Error creating bookings:', error.message);
      return;
    }
    
    console.log(`\n✅ Created ${data.length} test bookings:`);
    console.log(`   - 1 single booking`);
    console.log(`   - ${data.length - 1} items in bulk order (Order ID: ${orderId})`);
    
    console.log('\n📊 Summary:');
    data.forEach((booking, i) => {
      const type = booking.booking_type || 'property';
      const orderInfo = booking.order_id ? ` (Order: ${booking.order_id.substring(0, 8)}...)` : '';
      console.log(`   ${i + 1}. ${type}${orderInfo} - ${booking.total_price} ${booking.currency}`);
    });
    
    console.log('\n✨ Test bookings created successfully!');
    console.log(`\nRun: node test-booking-details.mjs to verify the data\n`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

createTestBookings();
