import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test tour_packages query - uses city and cover_image
console.log('Testing tour_packages query...');
const { data: packagesData, error: packagesError } = await supabase
  .from('tour_packages')
  .select('id, title, city, price_per_adult, currency, cover_image')
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
  .limit(6);

if (packagesError) {
  console.log('Tour Packages Error:', packagesError);
} else {
  console.log('Tour Packages Count:', packagesData?.length || 0);
  if (packagesData?.length > 0) {
    console.log('Tour Packages:', packagesData.map(p => p.title));
  }
}

// Test tours query
console.log('\nTesting tours query...');
const { data: toursData, error: toursError } = await supabase
  .from('tours')
  .select('id, title, location, price_per_person, currency, images')
  .eq('is_published', true)
  .order('created_at', { ascending: false })
  .limit(6);

if (toursError) {
  console.log('Tours Error:', toursError);
} else {
  console.log('Tours Count:', toursData?.length || 0);
  if (toursData?.length > 0) {
    console.log('Tours:', toursData.map(t => t.title));
  }
}

// Test transport_vehicles query
console.log('\nTesting transport_vehicles query...');
const { data: transportData, error: transportError } = await supabase
  .from('transport_vehicles')
  .select('id, title, provider_name, vehicle_type, seats, price_per_day, currency, image_url')
  .eq('is_published', true)
  .order('created_at', { ascending: false })
  .limit(6);

if (transportError) {
  console.log('Transport Error:', transportError);
} else {
  console.log('Transport Count:', transportData?.length || 0);
  if (transportData?.length > 0) {
    console.log('Transport:', transportData.map(t => t.title));
  }
}
