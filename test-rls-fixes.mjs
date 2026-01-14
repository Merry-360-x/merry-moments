import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

console.log('\n🔍 TESTING RLS POLICY FIXES\n');
console.log('============================================================\n');

async function testAnonAccess() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📋 TEST 1: Anonymous User Access');
  console.log('------------------------------------------------------------');
  
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, is_published')
    .eq('is_published', true);
    
  if (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
  } else {
    console.log(`✅ PASSED: Anonymous users can see ${properties?.length || 0} published properties\n`);
  }
}

async function testAuthenticatedAccess() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📋 TEST 2: Authenticated User Access (Creating test user)');
  console.log('------------------------------------------------------------');
  
  // Create a test account
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });
  
  if (signUpError) {
    console.log(`❌ FAILED to create test user: ${signUpError.message}\n`);
    return;
  }
  
  if (!signUpData.user) {
    console.log('❌ FAILED: No user returned from signup\n');
    return;
  }
  
  // Try to fetch properties
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, is_published')
    .eq('is_published', true);
    
  if (error) {
    console.log(`❌ FAILED: ${error.message}\n`);
  } else {
    console.log(`✅ PASSED: Authenticated users can see ${properties?.length || 0} published properties\n`);
  }
  
  // Cleanup
  await supabase.auth.signOut();
}

async function testAdminAccess() {
  console.log('📋 TEST 3: Admin Dashboard Access');
  console.log('------------------------------------------------------------');
  console.log('⚠️  Note: This test requires an existing admin account');
  console.log('   Please sign in manually at https://merry360x.com/auth');
  console.log('   Then check if you can access https://merry360x.com/admin');
  console.log('   And verify properties show at https://merry360x.com/accommodations\n');
}

async function runTests() {
  await testAnonAccess();
  await testAuthenticatedAccess();
  await testAdminAccess();
  
  console.log('============================================================');
  console.log('\n✅ TESTS COMPLETED\n');
  console.log('Next Steps:');
  console.log('1. Visit https://merry360x.com/accommodations');
  console.log('   → Should see 10 published properties');
  console.log('2. Sign in at https://merry360x.com/auth');
  console.log('3. If admin: Visit https://merry360x.com/admin');
  console.log('   → Should see admin dashboard with metrics\n');
}

runTests().catch(console.error);
