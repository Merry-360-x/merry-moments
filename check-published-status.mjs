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

async function checkDataStatus() {
  console.log('Checking published status of tours and transport...\n');
  
  // Check all tours (including unpublished)
  console.log('1. All tours in database:');
  const { count: allToursCount } = await supabase
    .from('tours')
    .select('id', { count: 'exact', head: true });
  console.log(`   Total tours: ${allToursCount || 0}`);
  
  const { data: toursSample } = await supabase
    .from('tours')
    .select('id, title, is_published')
    .limit(5);
  
  if (toursSample && toursSample.length > 0) {
    console.log('   Sample tours:');
    toursSample.forEach(t => {
      console.log(`     - ${t.title} (published: ${t.is_published ?? 'unknown'})`);
    });
  }
  
  // Check all vehicles
  console.log('\n2. All transport vehicles in database:');
  const { count: allVehiclesCount } = await supabase
    .from('transport_vehicles')
    .select('id', { count: 'exact', head: true });
  console.log(`   Total vehicles: ${allVehiclesCount || 0}`);
  
  const { data: vehiclesSample } = await supabase
    .from('transport_vehicles')
    .select('id, title, is_published')
    .limit(5);
  
  if (vehiclesSample && vehiclesSample.length > 0) {
    console.log('   Sample vehicles:');
    vehiclesSample.forEach(v => {
      console.log(`     - ${v.title} (published: ${v.is_published ?? 'unknown'})`);
    });
  }
  
  // Check routes
  console.log('\n3. All transport routes in database:');
  const { count: allRoutesCount } = await supabase
    .from('transport_routes')
    .select('id', { count: 'exact', head: true });
  console.log(`   Total routes: ${allRoutesCount || 0}`);
  
  const { data: routesSample } = await supabase
    .from('transport_routes')
    .select('id, from_location, to_location, is_active')
    .limit(5);
  
  if (routesSample && routesSample.length > 0) {
    console.log('   Sample routes:');
    routesSample.forEach(r => {
      console.log(`     - ${r.from_location} → ${r.to_location} (active: ${r.is_active ?? 'unknown'})`);
    });
  }
  
  console.log('\n---\n');
  console.log('ISSUE FOUND:');
  console.log('If tours/vehicles show "published: false", the RLS policies are filtering them out.');
  console.log('Anonymous users can only see published items.');
}

checkDataStatus().catch(console.error);
