import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🧪 Testing trip cart after RLS fix...\n');

// Try to authenticate first
const testEmail = 'test@merry360x.com';
const testPassword = 'TestPass123!';

console.log('1. Attempting sign in...');
const { data: authData, error: authError } = await client.auth.signInWithPassword({
  email: testEmail,
  password: testPassword
});

if (authError) {
  console.log('   ⚠️  Could not sign in (may need to create test user)');
  console.log('   Error:', authError.message);
  console.log('\n   💡 Please test manually by:');
  console.log('   1. Sign in to the app');
  console.log('   2. Add an item to cart');
  console.log('   3. Navigate to trip cart page');
  console.log('   4. Check if items are visible\n');
  process.exit(0);
}

console.log('   ✅ Signed in as:', authData.user.email);

// Test reading cart items
console.log('\n2. Reading cart items...');
const { data: cartItems, error: readError } = await client
  .from('trip_cart_items')
  .select('*');

if (readError) {
  console.log('   ❌ Error reading cart:', readError.message);
} else {
  console.log(`   ✅ Successfully read ${cartItems.length} cart items`);
  if (cartItems.length > 0) {
    console.log('   Sample item:', cartItems[0]);
  }
}

// Test inserting an item
console.log('\n3. Testing insert...');
const { data: newItem, error: insertError } = await client
  .from('trip_cart_items')
  .insert({
    user_id: authData.user.id,
    item_type: 'tour',
    reference_id: 'test-tour-123',
    quantity: 1
  })
  .select()
  .single();

if (insertError) {
  console.log('   ❌ Error inserting:', insertError.message);
} else {
  console.log('   ✅ Successfully inserted item:', newItem.id);
  
  // Clean up test item
  await client.from('trip_cart_items').delete().eq('id', newItem.id);
  console.log('   🧹 Cleaned up test item');
}

// Sign out
await client.auth.signOut();
console.log('\n✅ Test complete!\n');
