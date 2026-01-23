import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, supabaseKey);

const orphanTourIds = [
  '4daa2772-376c-44b6-acfd-151a33616531',
  '3f1b420c-dce2-45f1-8016-4c276ec14797'
];

console.log('\n🔍 Checking and deleting orphan tours...\n');

for (const id of orphanTourIds) {
  // First check if tour exists
  const { data: tour, error: fetchError } = await client
    .from('tours')
    .select('id, title, created_by, created_at')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.log(`❌ Tour ${id}: ${fetchError.message}`);
    continue;
  }
  
  console.log(`✓ Found tour: "${tour.title}"`);
  console.log(`  Owner: ${tour.created_by}`);
  console.log(`  Created: ${tour.created_at}`);
  
  // Delete using service role key (bypasses RLS)
  const { error: deleteError } = await client
    .from('tours')
    .delete()
    .eq('id', id);
  
  if (deleteError) {
    console.log(`  ❌ Delete failed: ${deleteError.message}\n`);
  } else {
    console.log(`  ✅ Deleted successfully\n`);
  }
}

console.log('✅ Complete\n');
