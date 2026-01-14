import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPolicies() {
  console.log('\n=== Testing Properties Access (Anon User) ===\n');
  
  // Test 1: Fetch published properties as anonymous user
  const { data: anonProps, error: anonError } = await supabase
    .from('properties')
    .select('id, title, is_published')
    .eq('is_published', true);
    
  if (anonError) {
    console.error('❌ Anon properties error:', anonError.message);
  } else {
    console.log(`✅ Anon can see ${anonProps?.length || 0} published properties`);
  }
  
  // Test 2: Try to sign in with admin
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'davyoscar63@gmail.com',
    password: 'davy123'
  });
  
  if (signInError) {
    console.error('❌ Sign in error:', signInError.message);
    return;
  }
  
  console.log('\n=== Testing as Authenticated User ===\n');
  console.log('✅ Signed in as:', signInData.user.email);
  
  // Test 3: Check user roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', signInData.user.id);
    
  if (rolesError) {
    console.error('❌ Roles error:', rolesError.message);
  } else {
    console.log(`✅ User roles:`, roles?.map(r => r.role).join(', ') || 'none');
  }
  
  // Test 4: Fetch properties as authenticated user
  const { data: authProps, error: authPropsError } = await supabase
    .from('properties')
    .select('id, title, is_published')
    .eq('is_published', true);
    
  if (authPropsError) {
    console.error('❌ Auth properties error:', authPropsError.message);
  } else {
    console.log(`✅ Authenticated can see ${authProps?.length || 0} published properties`);
  }
  
  // Test 5: Try admin RPC function
  const { data: metrics, error: metricsError } = await supabase.rpc('admin_dashboard_metrics');
  
  if (metricsError) {
    console.error('❌ Admin metrics error:', metricsError.message);
  } else {
    console.log('✅ Admin metrics received');
    console.log('   Properties:', metrics?.properties_total || 0);
    console.log('   Tours:', metrics?.tours_total || 0);
  }
  
  await supabase.auth.signOut();
}

testPolicies().catch(console.error);
