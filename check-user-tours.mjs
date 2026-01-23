import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const client = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Checking all tours and packages in database...\n');

// Get all tours
const { data: tours, error: toursError } = await client
  .from('tours')
  .select('id, title, created_by, created_at')
  .order('created_at', { ascending: false });

if (toursError) {
  console.error('❌ Error fetching tours:', toursError);
} else {
  console.log(`📍 TOURS table (${tours.length} total):`);
  tours.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.title}`);
    console.log(`     ID: ${t.id}`);
    console.log(`     Owner: ${t.created_by}`);
    console.log(`     Created: ${t.created_at}\n`);
  });
}

// Get all tour packages
const { data: packages, error: packagesError } = await client
  .from('tour_packages')
  .select('id, title, host_id, created_at, status')
  .order('created_at', { ascending: false });

if (packagesError) {
  console.error('❌ Error fetching packages:', packagesError);
} else {
  console.log(`\n📦 TOUR_PACKAGES table (${packages.length} total):`);
  packages.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} [${p.status}]`);
    console.log(`     ID: ${p.id}`);
    console.log(`     Owner: ${p.host_id}`);
    console.log(`     Created: ${p.created_at}\n`);
  });
}

console.log(`\n✅ Total items: ${(tours?.length || 0) + (packages?.length || 0)}\n`);
