#!/usr/bin/env node

/**
 * Currency Verification Script
 * 
 * This script ensures all bookings and payments display the correct currency
 * throughout the system.
 */

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

console.log('🔍 Currency Verification Report\n');
console.log('=' .repeat(80));

async function verifyBookingCurrencies() {
  console.log('\n📦 BOOKINGS:\n');
  
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
      payment_status
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const currencySummary = {};
  let totalBookings = 0;
  let mismatches = 0;

  for (const booking of bookings) {
    totalBookings++;
    const curr = booking.currency || 'NULL';
    currencySummary[curr] = (currencySummary[curr] || 0) + 1;

    // Verify against source
    let sourceCurrency = null;
    
    if (booking.property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('currency')
        .eq('id', booking.property_id)
        .single();
      sourceCurrency = prop?.currency;
    } else if (booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('currency')
        .eq('id', booking.tour_id)
        .single();
      sourceCurrency = tour?.currency;
    } else if (booking.transport_id) {
      const { data: transport } = await supabase
        .from('transport_services')
        .select('currency')
        .eq('id', booking.transport_id)
        .single();
      sourceCurrency = transport?.currency;
    }

    if (sourceCurrency && booking.currency !== sourceCurrency) {
      mismatches++;
      console.log(`⚠️  Mismatch: Booking ${booking.id.substring(0, 8)} has ${booking.currency} but source has ${sourceCurrency}`);
    }
  }

  console.log(`Total Bookings: ${totalBookings}`);
  console.log(`Currency Breakdown:`);
  Object.entries(currencySummary).forEach(([curr, count]) => {
    console.log(`  ${curr}: ${count} bookings`);
  });
  
  if (mismatches === 0) {
    console.log('\n✅ All bookings match their source currency!');
  } else {
    console.log(`\n⚠️  ${mismatches} currency mismatches found!`);
  }
}

async function verifyPaymentTransactions() {
  console.log('\n\n💳 PAYMENT TRANSACTIONS:\n');
  
  const { data: transactions, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!transactions || transactions.length === 0) {
    console.log('No payment transactions yet.');
    return;
  }

  const currencySummary = {};
  let totalTx = 0;
  let mismatches = 0;

  for (const tx of transactions) {
    totalTx++;
    const curr = tx.currency || 'NULL';
    currencySummary[curr] = (currencySummary[curr] || 0) + 1;

    // Verify against booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('currency, total_price')
      .eq('id', tx.booking_id)
      .single();

    if (booking && tx.currency !== booking.currency) {
      mismatches++;
      console.log(`⚠️  Mismatch: Transaction has ${tx.currency} but booking has ${booking.currency}`);
      console.log(`   Transaction: ${tx.amount} ${tx.currency}`);
      console.log(`   Booking: ${booking.total_price} ${booking.currency}`);
    }
  }

  console.log(`Total Transactions: ${totalTx}`);
  console.log(`Currency Breakdown:`);
  Object.entries(currencySummary).forEach(([curr, count]) => {
    console.log(`  ${curr}: ${count} transactions`);
  });
  
  if (mismatches === 0) {
    console.log('\n✅ All payment transactions match their booking currency!');
  } else {
    console.log(`\n⚠️  ${mismatches} currency mismatches found!`);
  }
}

async function verifyListings() {
  console.log('\n\n🏠 LISTINGS:\n');
  
  // Check properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, currency')
    .limit(1000);

  const propCurrencies = {};
  properties?.forEach(p => {
    const curr = p.currency || 'NULL';
    propCurrencies[curr] = (propCurrencies[curr] || 0) + 1;
  });

  console.log(`Properties (${properties?.length || 0} total):`);
  Object.entries(propCurrencies).forEach(([curr, count]) => {
    console.log(`  ${curr}: ${count} properties`);
  });

  // Check tours
  const { data: tours } = await supabase
    .from('tour_packages')
    .select('id, currency')
    .limit(1000);

  const tourCurrencies = {};
  tours?.forEach(t => {
    const curr = t.currency || 'NULL';
    tourCurrencies[curr] = (tourCurrencies[curr] || 0) + 1;
  });

  console.log(`\nTours (${tours?.length || 0} total):`);
  Object.entries(tourCurrencies).forEach(([curr, count]) => {
    console.log(`  ${curr}: ${count} tours`);
  });

  // Check transport
  const { data: transports } = await supabase
    .from('transport_services')
    .select('id, currency')
    .limit(1000);

  const transportCurrencies = {};
  transports?.forEach(t => {
    const curr = t.currency || 'NULL';
    transportCurrencies[curr] = (transportCurrencies[curr] || 0) + 1;
  });

  console.log(`\nTransport (${transports?.length || 0} total):`);
  Object.entries(transportCurrencies).forEach(([curr, count]) => {
    console.log(`  ${curr}: ${count} services`);
  });
}

async function main() {
  await verifyBookingCurrencies();
  await verifyPaymentTransactions();
  await verifyListings();
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Currency verification complete!\n');
}

main().catch(console.error);
