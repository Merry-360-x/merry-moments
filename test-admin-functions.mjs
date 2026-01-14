import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminFunctions() {
  console.log('\n🔍 TESTING ADMIN DASHBOARD FUNCTIONS\n');
  
  // Test 1: admin_list_users
  console.log('📋 TEST 1: admin_list_users');
  console.log('------------------------------------------------------------');
  const { data: users, error: usersError } = await supabase.rpc('admin_list_users', { _search: '' });
  
  if (usersError) {
    console.log('❌ Error:', usersError.message);
  } else {
    console.log(`✅ Success: Retrieved ${users?.length || 0} users`);
    if (users && users.length > 0) {
      console.log('First user:', users[0]);
    }
  }
  
  // Test 2: ad_banners table
  console.log('\n📋 TEST 2: ad_banners table');
  console.log('------------------------------------------------------------');
  const { data: banners, error: bannersError } = await supabase
    .from('ad_banners')
    .select('*');
    
  if (bannersError) {
    console.log('❌ Error:', bannersError.message);
  } else {
    console.log(`✅ Success: Retrieved ${banners?.length || 0} banners`);
  }
  
  // Test 3: Check if we can insert a test banner (as anon - should fail)
  console.log('\n📋 TEST 3: Banner permissions (should fail as anon)');
  console.log('------------------------------------------------------------');
  const { error: insertError } = await supabase
    .from('ad_banners')
    .insert({
      message: 'Test banner',
      is_active: false
    });
    
  if (insertError) {
    console.log('✅ Expected failure:', insertError.message);
  } else {
    console.log('❌ Unexpected: Anon user could insert banner!');
  }
}

testAdminFunctions().catch(console.error);
