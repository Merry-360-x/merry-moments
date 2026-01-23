import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const client = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Checking all tour packages including all statuses...\n');

// Get ALL packages regardless of status
const { data: allPackages, error } = await client
  .from('tour_packages')
  .select('id, title, status, host_id, created_at')
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log(`📊 Total packages in database: ${allPackages?.length || 0}\n`);
  
  // Group by status
  const grouped = {};
  allPackages?.forEach(pkg => {
    const status = pkg.status || 'null';
    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(pkg);
  });
  
  Object.entries(grouped).forEach(([status, packages]) => {
    console.log(`\n📋 Status: "${status}" (${packages.length} packages)`);
    packages.forEach((pkg, i) => {
      console.log(`  ${i + 1}. ${pkg.title}`);
      console.log(`     ID: ${pkg.id}`);
      console.log(`     Host: ${pkg.host_id}`);
      console.log(`     Created: ${pkg.created_at}`);
    });
  });
}

console.log('\n');
