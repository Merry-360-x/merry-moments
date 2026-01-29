import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixStoriesPolicy() {
  console.log('Fixing stories RLS policy...\n');
  
  // Try to use the postgres REST endpoint to run raw SQL
  // This requires using the Management API or running in Supabase dashboard
  
  console.log('The current RLS policy only shows stories from the last 24 hours.');
  console.log('This is why guests see "No stories yet".\n');
  
  console.log('To fix this, run the following SQL in your Supabase dashboard:');
  console.log('Go to: https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/sql/new\n');
  console.log('----------------------------------------');
  console.log(`
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;

CREATE POLICY "Anyone can view stories"
ON stories FOR SELECT
TO authenticated, anon
USING (true);
`);
  console.log('----------------------------------------\n');
  
  // Verify current state
  const { data, error } = await supabase.from('stories').select('id, title');
  console.log('Current stories (via service role):', data?.length || 0, 'total');
}

fixStoriesPolicy();
