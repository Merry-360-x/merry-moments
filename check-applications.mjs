import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://uwgiostcetoxotfnulfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0'
);

const { data, error } = await supabase
  .from('host_applications')
  .select('id, user_id, service_types, status, tour_data, tour_package_data')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('Error:', error);
} else {
  data.forEach(app => {
    console.log('---');
    console.log('ID:', app.id);
    console.log('Service Types:', app.service_types);
    console.log('Status:', app.status);
    console.log('Has tour_data:', !!app.tour_data);
    console.log('Has tour_package_data:', !!app.tour_package_data);
  });
}
