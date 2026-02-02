import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qileexlxhnanqrwpsxjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbGVleGx4aG5hbnFyd3BzeGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2MTQ4NzIsImV4cCI6MjA1MjE5MDg3Mn0.xrPRBJzpMBqdu3OMsLKLMSS3cJPQxNoNKqE2IxHZhLE'
);

const { data, error } = await supabase
  .from('legal_content')
  .select('*');

console.log('All legal_content entries:');
console.log(JSON.stringify(data, null, 2));
if (error) console.log('Error:', error);
