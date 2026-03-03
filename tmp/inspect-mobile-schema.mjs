import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.trim().startsWith('#') || !raw.includes('=')) continue;
    const i = raw.indexOf('=');
    const key = raw.slice(0, i).trim();
    const value = raw.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: property, error: propError } = await supabase.from('properties').select('*').limit(1).maybeSingle();
const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').limit(1).maybeSingle();

console.log(JSON.stringify({
  propError: propError?.message || null,
  bookingError: bookingError?.message || null,
  propertyKeys: property ? Object.keys(property) : [],
  bookingKeys: booking ? Object.keys(booking) : []
}, null, 2));
