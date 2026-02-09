#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Find low-price bookings (the "22 RWF" ones)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, total_price, currency, property_id, order_id, created_at, guest_name, guest_email, host_id')
    .lt('total_price', 100)
    .limit(10);
  
  console.log('\n=== Low-price bookings (< 100) ===');
  console.log(JSON.stringify(bookings, null, 2));
  
  // Get property details for these bookings
  if (bookings && bookings.length > 0) {
    const propertyIds = bookings.filter(b => b.property_id).map(b => b.property_id);
    if (propertyIds.length > 0) {
      const { data: properties } = await supabase
        .from('properties')
        .select('id, title, price_per_night, currency')
        .in('id', propertyIds);
      
      console.log('\n=== Properties for those bookings ===');
      console.log(JSON.stringify(properties, null, 2));
    }
    
    // Check related checkout_requests
    const orderIds = bookings.filter(b => b.order_id).map(b => b.order_id);
    if (orderIds.length > 0) {
      const { data: checkouts } = await supabase
        .from('checkout_requests')
        .select('id, total_amount, currency, metadata, created_at')
        .in('id', orderIds);
      
      console.log('\n=== Related checkout requests ===');
      console.log(JSON.stringify(checkouts, null, 2));
    }
  }
  
  // Sample of normal property prices
  const { data: propertyPrices } = await supabase
    .from('properties')
    .select('id, title, price_per_night, currency')
    .limit(5);
  
  console.log('\n=== Sample property prices ===');
  console.log(JSON.stringify(propertyPrices, null, 2));
}

check();
