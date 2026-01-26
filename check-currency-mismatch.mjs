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

async function checkCurrencyMismatch() {
  console.log('🔍 Checking for currency mismatches in bookings...\n');

  // Get all bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      total_price,
      currency,
      booking_type,
      property_id,
      tour_id,
      transport_id
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error fetching bookings:', error.message);
    return;
  }

  console.log(`📊 Found ${bookings.length} bookings\n`);

  const mismatches = [];

  for (const booking of bookings) {
    let expectedCurrency = null;
    let source = null;

    // Determine expected currency based on booking type
    if (booking.booking_type === 'property' && booking.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('currency')
        .eq('id', booking.property_id)
        .single();
      
      if (property) {
        expectedCurrency = property.currency;
        source = 'Property';
      }
    } else if (booking.booking_type === 'tour' && booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('currency')
        .eq('id', booking.tour_id)
        .single();
      
      if (tour) {
        expectedCurrency = tour.currency;
        source = 'Tour';
      }
    } else if (booking.booking_type === 'transport' && booking.transport_id) {
      const { data: transport } = await supabase
        .from('transport_services')
        .select('currency')
        .eq('id', booking.transport_id)
        .single();
      
      if (transport) {
        expectedCurrency = transport.currency;
        source = 'Transport';
      }
    }

    // Check for mismatch
    if (expectedCurrency && booking.currency !== expectedCurrency) {
      mismatches.push({
        bookingId: booking.id,
        bookingCurrency: booking.currency,
        expectedCurrency: expectedCurrency,
        totalPrice: booking.total_price,
        bookingType: booking.booking_type,
        source: source
      });
    }
  }

  if (mismatches.length === 0) {
    console.log('✅ No currency mismatches found!');
  } else {
    console.log(`⚠️  Found ${mismatches.length} currency mismatches:\n`);
    
    mismatches.forEach((m, i) => {
      console.log(`${i + 1}. Booking ID: ${m.bookingId.substring(0, 8)}...`);
      console.log(`   Type: ${m.bookingType} (${m.source})`);
      console.log(`   Booking Currency: ${m.bookingCurrency}`);
      console.log(`   Expected Currency: ${m.expectedCurrency}`);
      console.log(`   Total Price: ${m.totalPrice}`);
      console.log('');
    });

    console.log('\n💡 To fix these mismatches, you can:');
    console.log('   1. Update bookings to use the correct currency from the source');
    console.log('   2. Update the source listings to use the correct currency');
    console.log('   3. Convert prices if currency conversion is needed\n');
  }

  // Check payment_transactions table too
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select(`
      id,
      booking_id,
      amount,
      currency,
      status
    `)
    .limit(100);

  if (!txError && transactions) {
    console.log(`\n💳 Checking ${transactions.length} payment transactions...\n`);
    
    const txMismatches = [];
    
    for (const tx of transactions) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('currency, total_price')
        .eq('id', tx.booking_id)
        .single();
      
      if (booking && tx.currency !== booking.currency) {
        txMismatches.push({
          transactionId: tx.id,
          txCurrency: tx.currency,
          bookingCurrency: booking.currency,
          txAmount: tx.amount,
          bookingAmount: booking.total_price
        });
      }
    }
    
    if (txMismatches.length === 0) {
      console.log('✅ All payment transactions match their booking currencies!');
    } else {
      console.log(`⚠️  Found ${txMismatches.length} transaction currency mismatches:\n`);
      
      txMismatches.forEach((m, i) => {
        console.log(`${i + 1}. Transaction ID: ${m.transactionId.substring(0, 8)}...`);
        console.log(`   Transaction Currency: ${m.txCurrency} (${m.txAmount})`);
        console.log(`   Booking Currency: ${m.bookingCurrency} (${m.bookingAmount})`);
        console.log('');
      });
    }
  }
}

checkCurrencyMismatch().catch(console.error);
