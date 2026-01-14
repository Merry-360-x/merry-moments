import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.Tz9oZ6dLFJfBqCjY1wU4ZXF6WCMDTxB_hIOW6SAnkLo';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUsers() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log('\n=== Users in Database ===\n');
  users.users.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log('---');
  });
  
  // Check user roles
  console.log('\n=== User Roles ===\n');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');
    
  if (rolesError) {
    console.error('Roles error:', rolesError.message);
  } else {
    roles.forEach(r => {
      const user = users.users.find(u => u.id === r.user_id);
      console.log(`${user?.email || r.user_id}: ${r.role}`);
    });
  }
}

checkUsers().catch(console.error);
