import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// User ID from the logs
const userId = '2a9b4642-f20b-42d8-808c-5206eca68206';

console.log('Adding host role to user:', userId);

const { data, error } = await supabase
  .from('user_roles')
  .upsert(
    { user_id: userId, role: 'host' },
    { onConflict: 'user_id,role' }
  );

if (error) {
  console.error('Error adding host role:', error);
} else {
  console.log('Successfully added host role!');
  
  // Verify
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  console.log('User now has roles:', roles);
}
