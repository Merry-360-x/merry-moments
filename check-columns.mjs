#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Checking database schema...\n');

// Check bookings columns
const { data: booking, error: bookingError } = await supabase
  .from('bookings')
  .select('*')
  .limit(1)
  .single();

if (booking) {
  console.log('📅 Bookings columns:');
  console.log(Object.keys(booking).join(', '));
} else {
  console.log('❌ Bookings error:', bookingError?.message || 'No bookings found');
}

console.log('\n');

// Check properties columns
const { data: property, error: propertyError } = await supabase
  .from('properties')
  .select('*')
  .limit(1)
  .single();

if (property) {
  console.log('🏠 Properties columns:');
  console.log(Object.keys(property).join(', '));
} else {
  console.log('❌ Properties error:', propertyError?.message || 'No properties found');
}

console.log('\n');

// Check transport_vehicles columns
const { data: vehicle, error: vehicleError } = await supabase
  .from('transport_vehicles')
  .select('*')
  .limit(1)
  .single();

if (vehicle) {
  console.log('🚗 Transport vehicles columns:');
  console.log(Object.keys(vehicle).join(', '));
} else {
  console.log('❌ Transport vehicles error:', vehicleError?.message || 'No vehicles found');
}
