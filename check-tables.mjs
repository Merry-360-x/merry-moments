import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wmcjdwgllbwjpfanofbn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtY2pkd2dsbGJ3anBmYW5vZmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDY4OTAsImV4cCI6MjA1MTIyMjg5MH0.iHrzzriFkbLEHuOXC_lOI9zNNPr-FvPmkCVDcU4sB_w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = [
    'bookings',
    'host_applications', 
    'properties',
    'tour_packages',
    'tours',
    'transport',
    'profiles',
    'user_roles'
  ];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: Does NOT exist - ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS (${count} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error - ${err.message}`);
    }
  }
}

checkTables();
