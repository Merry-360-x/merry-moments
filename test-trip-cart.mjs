import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test localStorage cart
const GUEST_CART_KEY = 'merry360_guest_cart';

console.log('🔍 Testing Trip Cart...\n');

// 1. Check localStorage guest cart
console.log('1️⃣ Checking localStorage guest cart:');
try {
  const guestCartRaw = process.env.GUEST_CART_TEST || '[]';
  const guestCart = JSON.parse(guestCartRaw);
  console.log(`   Found ${guestCart.length} items in guest cart`);
  if (guestCart.length > 0) {
    console.log('   Items:', JSON.stringify(guestCart, null, 2));
  }
} catch (err) {
  console.log('   No guest cart or invalid JSON');
}

// 2. Test fetching a tour
console.log('\n2️⃣ Testing tour fetch (for cart items):');
try {
  const { data: tours, error } = await supabase
    .from('tours')
    .select('id, title, price_per_person, currency, images, duration_days, is_published')
    .limit(3);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
  } else {
    console.log(`   ✅ Found ${tours?.length || 0} tours`);
    tours?.forEach(tour => {
      console.log(`   - ${tour.title} (${tour.is_published ? 'published' : 'draft'})`);
    });
  }
} catch (err) {
  console.error('   ❌ Exception:', err.message);
}

// 3. Test fetching tour packages
console.log('\n3️⃣ Testing tour packages fetch:');
try {
  const { data: packages, error } = await supabase
    .from('tour_packages')
    .select('id, title, price_per_adult, currency, cover_image')
    .limit(3);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
  } else {
    console.log(`   ✅ Found ${packages?.length || 0} tour packages`);
    packages?.forEach(pkg => {
      console.log(`   - ${pkg.title}`);
    });
  }
} catch (err) {
  console.error('   ❌ Exception:', err.message);
}

// 4. Test fetching properties
console.log('\n4️⃣ Testing properties fetch:');
try {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, price_per_night, currency, images, location, is_published')
    .limit(3);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
  } else {
    console.log(`   ✅ Found ${properties?.length || 0} properties`);
    properties?.forEach(prop => {
      console.log(`   - ${prop.title} (${prop.is_published ? 'published' : 'draft'})`);
    });
  }
} catch (err) {
  console.error('   ❌ Exception:', err.message);
}

// 5. Test fetching transport vehicles
console.log('\n5️⃣ Testing transport vehicles fetch:');
try {
  const { data: vehicles, error } = await supabase
    .from('transport_vehicles')
    .select('id, title, price_per_day, currency, image_url, vehicle_type')
    .limit(3);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
  } else {
    console.log(`   ✅ Found ${vehicles?.length || 0} transport vehicles`);
    vehicles?.forEach(vehicle => {
      console.log(`   - ${vehicle.title} (${vehicle.vehicle_type})`);
    });
  }
} catch (err) {
  console.error('   ❌ Exception:', err.message);
}

// 6. Test trip cart items table (for logged-in users)
console.log('\n6️⃣ Testing trip_cart_items table access:');
try {
  const { data, error } = await supabase
    .from('trip_cart_items')
    .select('id, item_type, reference_id, quantity')
    .limit(5);
  
  if (error) {
    console.error('   ❌ Error:', error.message);
    console.error('   This is expected for anonymous users (need to be logged in)');
  } else {
    console.log(`   ✅ Found ${data?.length || 0} cart items`);
    if (data && data.length > 0) {
      data.forEach(item => {
        console.log(`   - ${item.item_type}: ${item.reference_id} (qty: ${item.quantity})`);
      });
    }
  }
} catch (err) {
  console.error('   ❌ Exception:', err.message);
}

console.log('\n✅ Trip Cart test complete!\n');

// Instructions
console.log('📝 Instructions to debug your issue:');
console.log('   1. Check browser console localStorage:');
console.log('      localStorage.getItem("merry360_guest_cart")');
console.log('   2. Check if items exist in the database or localStorage');
console.log('   3. Make sure referenced items (tours, properties) exist and are published');
console.log('   4. Check browser Network tab for failed requests when loading /trip-cart page');
