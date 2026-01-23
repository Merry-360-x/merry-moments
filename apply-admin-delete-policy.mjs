import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔐 Applying admin delete override policies...\n');

// Drop existing restrictive policies
await supabase.rpc('exec_sql', { 
  sql: `DROP POLICY IF EXISTS "Users can delete own tours" ON tours;`
}).then(() => console.log('✓ Dropped old tours delete policy'));

await supabase.rpc('exec_sql', {
  sql: `DROP POLICY IF EXISTS "Hosts can delete their own tour packages" ON tour_packages;`
}).then(() => console.log('✓ Dropped old packages delete policy'));

// Create new admin-enabled policies for tours
await supabase.rpc('exec_sql', {
  sql: `
    CREATE POLICY "Owners and admins can delete tours"
    ON tours
    FOR DELETE
    USING (
      (auth.uid() = created_by) 
      OR 
      (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      ))
    );
  `
}).then(() => console.log('✓ Created admin-enabled tours delete policy'));

// Create new admin-enabled policies for tour_packages
await supabase.rpc('exec_sql', {
  sql: `
    CREATE POLICY "Hosts and admins can delete tour packages"
    ON tour_packages
    FOR DELETE
    USING (
      (auth.uid() = host_id)
      OR
      (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
      ))
    );
  `
}).then(() => console.log('✓ Created admin-enabled packages delete policy'));

console.log('\n✅ Migration complete!');
console.log('📋 Admins can now deep delete any tour or tour package\n');
