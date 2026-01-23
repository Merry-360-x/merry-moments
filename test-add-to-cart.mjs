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

async function testAddToCart() {
  console.log('Testing "Add to Cart" flow...\n');
  
  // Step 1: Check auth session
  console.log('Step 1: Checking authentication...');
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.error('❌ Auth error:', authError);
  } else if (!session) {
    console.log('⚠️  No active session - user is not logged in');
    console.log('   This explains why items go to localStorage instead of database!\n');
  } else {
    console.log('✅ User is authenticated:', session.user.email);
    console.log('   User ID:', session.user.id, '\n');
    
    // Step 2: Try to add an item to cart
    console.log('Step 2: Attempting to add item to cart...');
    
    // First, get a real tour ID
    const { data: tours, error: tourError } = await supabase
      .from('tours')
      .select('id, title')
      .limit(1);
    
    if (tourError || !tours || tours.length === 0) {
      console.error('❌ No tours found to test with');
      return;
    }
    
    const testTour = tours[0];
    console.log(`   Using tour: "${testTour.title}" (${testTour.id})`);
    
    // Try to insert
    const { data: insertData, error: insertError } = await supabase
      .from('trip_cart_items')
      .insert({
        user_id: session.user.id,
        item_type: 'tour',
        reference_id: testTour.id,
        quantity: 1
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      console.log('   This might be an RLS policy issue!');
    } else {
      console.log('✅ Successfully added to cart:', insertData);
      
      // Step 3: Try to retrieve it
      console.log('\nStep 3: Attempting to retrieve cart items...');
      const { data: cartItems, error: fetchError } = await supabase
        .from('trip_cart_items')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
      } else {
        console.log(`✅ Retrieved ${cartItems.length} cart item(s):`, cartItems);
      }
      
      // Cleanup
      if (insertData && insertData[0]) {
        await supabase
          .from('trip_cart_items')
          .delete()
          .eq('id', insertData[0].id);
        console.log('\n🧹 Cleaned up test data');
      }
    }
  }
  
  console.log('\n---');
  console.log('DIAGNOSIS:');
  console.log('If user is NOT logged in, items are stored in localStorage (guest cart)');
  console.log('The badge shows guest cart count, but the cart page can\'t display them');
  console.log('because it expects database records for authenticated users.');
  console.log('\nSOLUTION: Check if user authentication is working properly on the site.');
}

testAddToCart().catch(console.error);
