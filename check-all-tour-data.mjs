import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const client = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Detailed check of ALL items in both tables...\n');

// Check tours table with ALL possible columns
const { data: tours, error: toursErr } = await client
  .from('tours')
  .select('*');

console.log('📍 TOURS table:');
if (toursErr) {
  console.log('  Error:', toursErr.message);
} else if (!tours || tours.length === 0) {
  console.log('  ✓ Empty (0 records)\n');
} else {
  console.log(`  Found ${tours.length} records:`);
  tours.forEach((t, i) => {
    console.log(`\n  ${i + 1}. "${t.title || 'Untitled'}"`);
    console.log(`     ID: ${t.id}`);
    console.log(`     Created by: ${t.created_by}`);
    console.log(`     Location: ${t.location || 'N/A'}`);
    console.log(`     Price: ${t.price_per_person || 0} ${t.currency || 'RWF'}`);
    console.log(`     Published: ${t.is_published ? 'Yes' : 'No'}`);
    console.log(`     Created: ${t.created_at}`);
  });
}

// Check tour_packages
const { data: packages, error: pkgErr } = await client
  .from('tour_packages')
  .select('*');

console.log('\n\n📦 TOUR_PACKAGES table:');
if (pkgErr) {
  console.log('  Error:', pkgErr.message);
} else if (!packages || packages.length === 0) {
  console.log('  ✓ Empty (0 records)\n');
} else {
  console.log(`  Found ${packages.length} records:`);
  packages.forEach((p, i) => {
    console.log(`\n  ${i + 1}. "${p.title || 'Untitled'}"`);
    console.log(`     ID: ${p.id}`);
    console.log(`     Host ID: ${p.host_id}`);
    console.log(`     Location: ${p.city}, ${p.country}`);
    console.log(`     Price: ${p.price_per_adult || 0} ${p.currency || 'RWF'}`);
    console.log(`     Status: ${p.status}`);
    console.log(`     Created: ${p.created_at}`);
  });
}

console.log(`\n\n✅ Grand total: ${(tours?.length || 0) + (packages?.length || 0)} items\n`);
