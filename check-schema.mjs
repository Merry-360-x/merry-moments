import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.Tz9oZ6dLFJfBqCjY1wU4ZXF6WCMDTxB_hIOW6SAnkLo';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Profiles table columns:', Object.keys(data[0]));
  } else {
    console.log('No profiles found');
  }
}

checkColumns();
