import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking all database data...\n');
  
  const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
  console.log('Admin users:', admins?.length || 0);
  
  const { data: hosts } = await supabase.from('user_roles').select('user_id').eq('role', 'host');
  console.log('Host users:', hosts?.length || 0);
  
  const { data: bookings } = await supabase.from('bookings').select('id, status').limit(10);
  console.log('Bookings:', bookings?.length || 0);
  if (bookings?.length) bookings.forEach(b => console.log('  -', b.id.slice(0,8), b.status));
  
  const { data: tours } = await supabase.from('tours').select('id, title, is_published').limit(10);
  console.log('Tours:', tours?.length || 0);
  if (tours?.length) tours.forEach(t => console.log('  -', t.title, '| published:', t.is_published));
  
  const { data: pkgs } = await supabase.from('tour_packages').select('id, title, status').limit(10);
  console.log('Tour packages:', pkgs?.length || 0);
  if (pkgs?.length) pkgs.forEach(p => console.log('  -', p.title, '| status:', p.status));
  
  const { data: props } = await supabase.from('properties').select('id, title, is_published').limit(10);
  console.log('Properties:', props?.length || 0);
  if (props?.length) props.forEach(p => console.log('  -', p.title, '| published:', p.is_published));
  
  const { data: vehicles } = await supabase.from('transport_vehicles').select('id, title').limit(5);
  console.log('Transport vehicles:', vehicles?.length || 0);
}

check();
