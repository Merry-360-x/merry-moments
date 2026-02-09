#!/usr/bin/env node

/**
 * Fix Booking Currency Mismatch
 * This script corrects bookings where the currency was incorrectly set to RWF
 * when the price was actually in USD (from the item's original currency).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixBookingCurrencies() {
  console.log('\n🔧 Fixing booking currency mismatches...\n');
  
  // Get all bookings with their checkout metadata
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, order_id, total_price, currency, property_id, tour_id, transport_id')
    .not('order_id', 'is', null);
  
  if (error) {
    console.error('Failed to fetch bookings:', error);
    return;
  }
  
  console.log(`Found ${bookings.length} bookings with order_ids to check\n`);
  
  let fixed = 0;
  
  for (const booking of bookings) {
    // Get the checkout request
    const { data: checkout } = await supabase
      .from('checkout_requests')
      .select('id, metadata')
      .eq('id', booking.order_id)
      .single();
    
    if (!checkout?.metadata?.items) continue;
    
    // Find the matching item
    const item = checkout.metadata.items.find(i => 
      (booking.property_id && i.reference_id === booking.property_id) ||
      (booking.tour_id && i.reference_id === booking.tour_id) ||
      (booking.transport_id && i.reference_id === booking.transport_id)
    );
    
    if (!item) continue;
    
    // Check if currency mismatch exists
    const correctCurrency = item.currency || 'USD';
    const correctPrice = item.calculated_price || item.price;
    
    if (booking.currency !== correctCurrency || booking.total_price !== correctPrice) {
      console.log(`Fixing booking ${booking.id}:`);
      console.log(`  Before: ${booking.total_price} ${booking.currency}`);
      console.log(`  After:  ${correctPrice} ${correctCurrency}`);
      
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          currency: correctCurrency,
          total_price: correctPrice
        })
        .eq('id', booking.id);
      
      if (updateError) {
        console.log(`  ❌ Failed: ${updateError.message}`);
      } else {
        console.log(`  ✅ Fixed!`);
        fixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} bookings\n`);
}

fixBookingCurrencies();
