import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCreationFunctionality() {
  console.log('Testing tour, transport, and package creation functionality...\n');
  
  // Test 1: Check table structures
  console.log('1. Verifying table structures...');
  
  const tables = {
    tours: ['id', 'title', 'location', 'price_per_person', 'currency', 'is_published', 'created_by'],
    transport_vehicles: ['id', 'title', 'vehicle_type', 'price_per_day', 'currency', 'is_published', 'created_by'],
    tour_packages: ['id', 'title', 'city', 'price_per_adult', 'currency', 'status', 'host_id']
  };
  
  for (const [table, fields] of Object.entries(tables)) {
    const { data, error } = await supabase
      .from(table)
      .select(fields.join(', '))
      .limit(1);
    
    if (error) {
      console.error(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table} - accessible`);
    }
  }
  
  // Test 2: Check current counts
  console.log('\n2. Current data counts...');
  
  for (const table of Object.keys(tables)) {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true });
    console.log(`   ${table}: ${count || 0} records`);
  }
  
  // Test 3: Check published status
  console.log('\n3. Published vs unpublished items...');
  
  const { data: tours } = await supabase
    .from('tours')
    .select('id, title, is_published');
  
  const { data: vehicles } = await supabase
    .from('transport_vehicles')
    .select('id, title, is_published');
  
  const { data: packages } = await supabase
    .from('tour_packages')
    .select('id, title, status');
  
  console.log(`   Tours:`);
  console.log(`     Published: ${tours?.filter(t => t.is_published).length || 0}`);
  console.log(`     Unpublished: ${tours?.filter(t => !t.is_published).length || 0}`);
  
  console.log(`   Vehicles:`);
  console.log(`     Published: ${vehicles?.filter(v => v.is_published).length || 0}`);
  console.log(`     Unpublished: ${vehicles?.filter(v => !v.is_published).length || 0}`);
  
  console.log(`   Packages:`);
  console.log(`     Approved: ${packages?.filter(p => p.status === 'approved').length || 0}`);
  console.log(`     Pending: ${packages?.filter(p => p.status === 'pending').length || 0}`);
  
  // Test 4: Display sample items
  console.log('\n4. Sample published items visible to public...');
  
  if (tours && tours.length > 0) {
    const published = tours.filter(t => t.is_published);
    if (published.length > 0) {
      console.log(`   ✅ Tours: ${published.map(t => t.title).join(', ')}`);
    }
  }
  
  if (vehicles && vehicles.length > 0) {
    const published = vehicles.filter(v => v.is_published);
    if (published.length > 0) {
      console.log(`   ✅ Vehicles: ${published.map(v => v.title).join(', ')}`);
    }
  }
  
  if (packages && packages.length > 0) {
    const approved = packages.filter(p => p.status === 'approved');
    if (approved.length > 0) {
      console.log(`   ✅ Packages: ${approved.map(p => p.title).join(', ')}`);
    }
  }
  
  console.log('\n---\n');
  console.log('SUMMARY:');
  console.log('✅ All creation forms should be functional if:');
  console.log('   - Tables are accessible');
  console.log('   - New items are created with is_published=true (tours & vehicles)');
  console.log('   - New packages are created with status=approved');
  console.log('   - Items appear in their respective listings');
}

testCreationFunctionality().catch(console.error);
