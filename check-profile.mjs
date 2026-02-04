import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  // Check host_applications table data
  const { data, error } = await supabase
    .from('host_applications')
    .select('id, user_id, status, profile_complete, national_id_photo_url, selfie_photo_url')
    .limit(5);
  
  console.log('Host applications (first 5):');
  if (error) {
    console.log('Error:', error);
  } else {
    data.forEach(app => {
      console.log({
        id: app.id?.slice(0,8),
        status: app.status,
        profile_complete: app.profile_complete,
        has_id: !!app.national_id_photo_url,
        has_selfie: !!app.selfie_photo_url
      });
    });
  }
}
test();
