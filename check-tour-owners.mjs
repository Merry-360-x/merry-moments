import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const client = createClient(supabaseUrl, supabaseKey);

// Get the user who owns these packages
const userIds = [
  'cab21106-dead-40e0-a164-0966d2cf36a2',
  '3b94377e-8dd2-4c9f-bcc2-5749aa8952a6'
];

console.log('\n👤 Checking user profiles and roles...\n');

for (const userId of userIds) {
  const { data: profile } = await client
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();
  
  const { data: roles } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  console.log(`User: ${profile?.full_name || 'Unknown'} (${profile?.email || 'No email'})`);
  console.log(`  ID: ${userId}`);
  console.log(`  Roles: ${roles?.map(r => r.role).join(', ') || 'None'}\n`);
}

// Check if there are any tours that were soft-deleted or hidden
const { data: allPackages } = await client
  .from('tour_packages')
  .select('id, title, status, host_id')
  .neq('status', 'deleted');

console.log(`\n📊 All non-deleted packages: ${allPackages?.length || 0}`);
