import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyFix() {
  console.log('🔧 Fixing checkout_requests INSERT policy...\n');
  
  // Use service role to run SQL via postgres connection
  // Since we can't run raw SQL, we need to go through the Supabase dashboard
  // Instead, let's test if the INSERT works with service role
  
  const testCheckout = {
    user_id: null,
    name: 'Test User',
    email: 'test@example.com',
    phone: '+254700000000',
    total_amount: 1000,
    currency: 'RWF',
    payment_status: 'pending',
    payment_method: 'mobile_money',
    metadata: { test: true }
  };
  
  console.log('📝 Testing checkout insert with service role...');
  const { data, error } = await supabase
    .from('checkout_requests')
    .insert(testCheckout)
    .select('id')
    .single();
  
  if (error) {
    console.error('❌ Insert failed:', error.message);
    console.log('\n⚠️  You need to apply the RLS fix in Supabase Dashboard SQL Editor:');
    console.log(`
-- Copy and run this in Supabase Dashboard > SQL Editor:

DROP POLICY IF EXISTS "Users can create checkout requests" ON checkout_requests;
DROP POLICY IF EXISTS "Anyone can create checkout requests" ON checkout_requests;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON checkout_requests;
DROP POLICY IF EXISTS "Allow insert for guests" ON checkout_requests;
DROP POLICY IF EXISTS "checkout_requests_insert_policy" ON checkout_requests;
DROP POLICY IF EXISTS "Allow checkout request creation" ON checkout_requests;

CREATE POLICY "Allow checkout request creation"
  ON checkout_requests FOR INSERT
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
    `);
  } else {
    console.log('✅ Insert succeeded with service role - ID:', data.id);
    
    // Clean up test record
    await supabase.from('checkout_requests').delete().eq('id', data.id);
    console.log('🧹 Cleaned up test record');
    console.log('\n⚠️  Service role works, but users may still have issues.');
    console.log('Apply the RLS fix in Supabase Dashboard SQL Editor.');
  }
}

applyFix().catch(console.error);
