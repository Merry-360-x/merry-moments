import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminMetrics() {
  console.log('\n🔍 TESTING ADMIN DASHBOARD METRICS\n');
  
  const { data, error } = await supabase.rpc('admin_dashboard_metrics');
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ Metrics returned successfully\n');
    console.log('Data:', JSON.stringify(data, null, 2));
  }
  
  console.log('\n📊 DIRECT TABLE QUERIES\n');
  
  const { data: props, error: propsErr } = await supabase
    .from('properties')
    .select('id, is_published');
  console.log(`Properties: ${props?.length || 0} total, Error:`, propsErr?.message || 'none');
  
  const { data: tours, error: toursErr } = await supabase
    .from('tours')
    .select('id, is_published');
  console.log(`Tours: ${tours?.length || 0} total, Error:`, toursErr?.message || 'none');
  
  const { data: vehicles, error: vehiclesErr } = await supabase
    .from('transport_vehicles')
    .select('id, is_published');
  console.log(`Vehicles: ${vehicles?.length || 0} total, Error:`, vehiclesErr?.message || 'none');
  
  const { data: bookings, error: bookingsErr } = await supabase
    .from('bookings')
    .select('id');
  console.log(`Bookings: ${bookings?.length || 0} total, Error:`, bookingsErr?.message || 'none');
}

testAdminMetrics().catch(console.error);
