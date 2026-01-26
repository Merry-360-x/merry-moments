#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function displayBookingCurrencies() {
  console.log('📋 Fetching all bookings with currency details...\n');

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      total_price,
      currency,
      booking_type,
      property_id,
      tour_id,
      transport_id,
      payment_status,
      status,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${bookings.length} total bookings\n`);
  console.log('━'.repeat(80));

  for (const booking of bookings) {
    console.log(`\n📦 Booking ID: ${booking.id.substring(0, 8)}...`);
    console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}`);
    console.log(`   Status: ${booking.status} | Payment: ${booking.payment_status}`);
    console.log(`   Type: ${booking.booking_type || 'property'}`);
    console.log(`   💰 Total: ${booking.total_price} ${booking.currency}`);

    // Fetch related item currency
    if (booking.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('title, price_per_night, currency')
        .eq('id', booking.property_id)
        .single();
      
      if (property) {
        console.log(`   🏠 Property: ${property.title}`);
        console.log(`   📍 Property Price: ${property.price_per_night} ${property.currency}`);
        
        if (booking.currency !== property.currency) {
          console.log(`   ⚠️  MISMATCH! Booking=${booking.currency}, Property=${property.currency}`);
        } else {
          console.log(`   ✅ Currencies match!`);
        }
      }
    }

    if (booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('title, price_per_person, currency')
        .eq('id', booking.tour_id)
        .single();
      
      if (tour) {
        console.log(`   🗺️  Tour: ${tour.title}`);
        console.log(`   📍 Tour Price: ${tour.price_per_person} ${tour.currency}`);
        
        if (booking.currency !== tour.currency) {
          console.log(`   ⚠️  MISMATCH! Booking=${booking.currency}, Tour=${tour.currency}`);
        } else {
          console.log(`   ✅ Currencies match!`);
        }
      }
    }

    if (booking.transport_id) {
      const { data: transport } = await supabase
        .from('transport_services')
        .select('title, price_per_day, currency')
        .eq('id', booking.transport_id)
        .single();
      
      if (transport) {
        console.log(`   🚗 Transport: ${transport.title}`);
        console.log(`   📍 Transport Price: ${transport.price_per_day} ${transport.currency}`);
        
        if (booking.currency !== transport.currency) {
          console.log(`   ⚠️  MISMATCH! Booking=${booking.currency}, Transport=${transport.currency}`);
        } else {
          console.log(`   ✅ Currencies match!`);
        }
      }
    }

    console.log('━'.repeat(80));
  }

  // Check payment transactions
  console.log('\n\n💳 Payment Transactions:\n');
  const { data: transactions } = await supabase
    .from('payment_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (transactions && transactions.length > 0) {
    for (const tx of transactions) {
      console.log(`\n💵 Transaction: ${tx.transaction_id}`);
      console.log(`   Booking: ${tx.booking_id?.substring(0, 8)}...`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Provider: ${tx.provider}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Payment Method: ${tx.payment_method}`);
    }
  } else {
    console.log('No payment transactions found.');
  }
}

displayBookingCurrencies().catch(console.error);
