import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCartItemsVisibility() {
  console.log('Testing cart items visibility for tours and transport...\n');
  
  // Check if we can fetch tours
  console.log('1. Testing tours table access...');
  const { data: tours, error: toursError } = await supabase
    .from('tours')
    .select('id, title, price_per_person, currency, images, duration_days')
    .limit(3);
  
  if (toursError) {
    console.error('❌ Cannot access tours:', toursError);
  } else {
    console.log(`✅ Can access tours: ${tours?.length || 0} found`);
    if (tours && tours.length > 0) {
      console.log('   Sample:', tours[0].title);
    }
  }
  
  // Check transport_vehicles
  console.log('\n2. Testing transport_vehicles table access...');
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('transport_vehicles')
    .select('id, title, price_per_day, currency, image_url, vehicle_type, seats')
    .limit(3);
  
  if (vehiclesError) {
    console.error('❌ Cannot access transport_vehicles:', vehiclesError);
  } else {
    console.log(`✅ Can access transport_vehicles: ${vehicles?.length || 0} found`);
    if (vehicles && vehicles.length > 0) {
      console.log('   Sample:', vehicles[0].title);
    }
  }
  
  // Check transport_routes
  console.log('\n3. Testing transport_routes table access...');
  const { data: routes, error: routesError } = await supabase
    .from('transport_routes')
    .select('id, from_location, to_location, base_price, currency')
    .limit(3);
  
  if (routesError) {
    console.error('❌ Cannot access transport_routes:', routesError);
  } else {
    console.log(`✅ Can access transport_routes: ${routes?.length || 0} found`);
    if (routes && routes.length > 0) {
      console.log('   Sample:', routes[0].from_location, '→', routes[0].to_location);
    }
  }
  
  // Check properties for comparison
  console.log('\n4. Testing properties table access...');
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('id, title, price_per_night, currency, images, location')
    .limit(3);
  
  if (propsError) {
    console.error('❌ Cannot access properties:', propsError);
  } else {
    console.log(`✅ Can access properties: ${properties?.length || 0} found`);
    if (properties && properties.length > 0) {
      console.log('   Sample:', properties[0].title);
    }
  }
  
  console.log('\n---\n');
  console.log('DIAGNOSIS:');
  console.log('If any table shows an access error, it means RLS policies are blocking anonymous access.');
  console.log('Cart items need these tables to be readable to display item details.');
}

testCartItemsVisibility().catch(console.error);
