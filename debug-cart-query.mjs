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

async function testCartQuery() {
  console.log('Testing cart query...\n');
  
  // Test 1: Check if we can query trip_cart_items at all
  console.log('Test 1: Checking trip_cart_items table access...');
  const { data: allItems, error: allError } = await supabase
    .from('trip_cart_items')
    .select('*')
    .limit(5);
  
  if (allError) {
    console.error('❌ Error querying trip_cart_items:', allError);
  } else {
    console.log(`✅ Found ${allItems?.length || 0} items (limited to 5)`);
    if (allItems && allItems.length > 0) {
      console.log('Sample item:', JSON.stringify(allItems[0], null, 2));
    }
  }
  
  console.log('\n---\n');
  
  // Test 2: Check if any items exist
  console.log('Test 2: Counting total cart items...');
  const { count, error: countError } = await supabase
    .from('trip_cart_items')
    .select('id', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting items:', countError);
  } else {
    console.log(`✅ Total items in database: ${count || 0}`);
  }
  
  console.log('\n---\n');
  
  // Test 3: Try to fetch with related data (like in TripCart.tsx)
  console.log('Test 3: Fetching cart items with full query...');
  const { data: cartData, error: cartError } = await supabase
    .from('trip_cart_items')
    .select(`
      id,
      item_type,
      reference_id,
      quantity,
      created_at,
      user_id
    `)
    .limit(5);
  
  if (cartError) {
    console.error('❌ Error with full query:', cartError);
  } else {
    console.log(`✅ Retrieved ${cartData?.length || 0} items with full query`);
    if (cartData && cartData.length > 0) {
      console.log('Items:', JSON.stringify(cartData, null, 2));
    }
  }
  
  console.log('\n---\n');
  
  // Test 4: Check tours table to ensure related data exists
  console.log('Test 4: Checking if referenced tours exist...');
  if (cartData && cartData.length > 0) {
    const tourIds = cartData
      .filter(item => item.item_type === 'tour')
      .map(item => item.reference_id);
    
    if (tourIds.length > 0) {
      const { data: tours, error: toursError } = await supabase
        .from('tours')
        .select('id, title, price_per_person, currency')
        .in('id', tourIds);
      
      if (toursError) {
        console.error('❌ Error fetching tours:', toursError);
      } else {
        console.log(`✅ Found ${tours?.length || 0} tours:`, tours);
      }
    } else {
      console.log('No tour items in cart');
    }
  }
}

testCartQuery().catch(console.error);
