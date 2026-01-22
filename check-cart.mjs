import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Checking trip_cart_items...\n');

// Check total items
const { count, error: countError } = await client
  .from('trip_cart_items')
  .select('*', { count: 'exact', head: true });

console.log('Total cart items:', count, countError ? `Error: ${countError.message}` : '');

// Check sample data
const { data, error } = await client
  .from('trip_cart_items')
  .select('*')
  .limit(5);

console.log('\nSample items:', data);
if (error) console.log('Error:', error.message);

// Check if there are RLS policies causing issues
const { data: testInsert, error: insertError } = await client
  .from('trip_cart_items')
  .insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    item_type: 'tour',
    reference_id: 'test-123',
    quantity: 1
  })
  .select();

console.log('\nTest insert:', testInsert ? 'SUCCESS' : 'FAILED');
if (insertError) console.log('Insert error:', insertError.message);

if (testInsert?.[0]?.id) {
  await client.from('trip_cart_items').delete().eq('id', testInsert[0].id);
  console.log('Test cleaned up');
}

console.log('\n✅ Complete\n');
