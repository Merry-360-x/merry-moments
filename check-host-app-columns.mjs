import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking host_applications table columns...');

const { data, error } = await supabase
  .from('host_applications')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (data && data.length > 0) {
  console.log('\nAvailable columns:');
  console.log(Object.keys(data[0]));
  console.log('\nSample data:');
  console.log(JSON.stringify(data[0], null, 2));
} else {
  console.log('No data found');
}
