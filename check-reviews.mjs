#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check if property_reviews table exists
  const { data: reviews, error: tableError } = await supabase
    .from('property_reviews')
    .select('*')
    .limit(5);
  
  if (tableError) {
    console.log('Table error:', tableError.message);
  } else {
    console.log('Table exists: property_reviews ✓');
    console.log('Reviews count:', reviews?.length || 0);
    if (reviews?.length) console.log('Sample review:', reviews[0]);
  }
  
  // Get bookings that could be reviewed
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, property_id, user_id, status')
    .eq('status', 'completed')
    .limit(5);
  
  console.log('\nCompleted bookings (for review):', bookings?.length || 0);
  if (bookings?.length) console.log('Sample:', bookings[0]);
  
  // Check if there are any properties
  const { data: props } = await supabase
    .from('properties')
    .select('id, title')
    .limit(3);
  console.log('\nProperties:', props?.length || 0);
  
  // Check all bookings statuses
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('id, status')
    .limit(20);
  
  const statusCounts = {};
  allBookings?.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });
  console.log('\nBooking statuses:', statusCounts);
}

check();
