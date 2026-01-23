import { createClient } from '@supabase/supabase-js';
const url = 'https://wmcjdwgllbwjpfanofbn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtY2pkd2dsbGJ3anBmYW5vZmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTY0Njg5MCwiZXhwIjoyMDUxMjIyODkwfQ.VYP_37AhLuXGOXzRMGzN-R9xqYBpd_-L0wD7YG8kR3w';
const client = createClient(url, key);

console.log('Checking database content...\n');

const { data: props, error: pe } = await client.from('properties').select('id, title, is_published');
console.log('Properties:', props?.length || 0, pe ? `ERROR: ${pe.message}` : '');
if (props) props.slice(0, 3).forEach(p => console.log(`  - ${p.title} (published: ${p.is_published})`));

const { data: tours, error: te } = await client.from('tour_packages').select('id, title, status');
console.log('\nTour Packages:', tours?.length || 0, te ? `ERROR: ${te.message}` : '');
if (tours) tours.slice(0, 3).forEach(t => consimport { createClient } from '@supabase/su
const { data: roles, errorconst url = 'https://wmcjdwgllbwjpfanofbn.supabase.ce'const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJp ?const cl ${re.message}` : '');
if (roles) {
  const counts = {};
  roles.forEach(r => counts[r.role] = (counts[r.role] || 0) + 1);
  Object.entries(counts).forEach(([role, count]) => console.log(`  ${role}: ${count}`));
}
