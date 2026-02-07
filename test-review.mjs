#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  // Get a property and booking
  const { data: props, error: pe } = await supabase.from('properties').select('id').limit(1);
  console.log('Properties query:', props, pe?.message);
  
  const { data: bookings, error: be } = await supabase.from('bookings').select('id, user_id, property_id').limit(1);
  console.log('Bookings query:', bookings, be?.message);
  
  if (!props || props.length === 0) {
    console.log('No properties found');
    return;
  }
  
  if (!bookings || bookings.length === 0) {
    console.log('No bookings found, using property directly');
    
    // Get any user
    const { data: users } = await supabase.from('profiles').select('user_id').limit(1);
    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }
    
    // Insert a test review without booking
    const { data: review, error } = await supabase
      .from('property_reviews')
      .insert({
        property_id: props[0].id,
        reviewer_id: users[0].user_id,
        rating: 5,
        comment: 'Test review - excellent property with great amenities!',
        is_hidden: false
      })
      .select()
      .single();
    
    if (error) {
      console.log('Insert error:', error.message);
    } else {
      console.log('Test review created:', review);
    }
  } else {
    // Insert with booking
    const { data: review, error } = await supabase
      .from('property_reviews')
      .insert({
        property_id: bookings[0].property_id,
        reviewer_id: bookings[0].user_id,
        booking_id: bookings[0].id,
        rating: 5,
        comment: 'Test review - excellent property with great amenities!',
        is_hidden: false
      })
      .select()
      .single();
    
    if (error) {
      console.log('Insert error:', error.message);
    } else {
      console.log('Test review created:', review);
    }
  }
  
  // Verify it's in the database
  const { data: allReviews } = await supabase.from('property_reviews').select('*');
  console.log('Total reviews now:', allReviews?.length);
  if (allReviews?.length) console.log('Reviews:', allReviews);
}

test();
