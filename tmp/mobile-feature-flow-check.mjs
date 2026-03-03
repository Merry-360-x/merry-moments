import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.trim().startsWith('#') || !raw.includes('=')) continue;
    const i = raw.indexOf('=');
    const k = raw.slice(0, i).trim();
    const v = raw.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv('.env');
loadEnv('.env.local');

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.log(JSON.stringify({ ok: false, error: 'Missing env vars VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY' }, null, 2));
  process.exit(1);
}

const admin = createClient(url, service);
const appLike = createClient(url, anon);

const report = { ok: true, flows: {} };
function pass(name, details = {}) {
  report.flows[name] = { status: 'pass', ...details };
}
function fail(name, error, details = {}) {
  report.ok = false;
  report.flows[name] = { status: 'fail', error: String(error?.message || error), ...details };
}

let hostProfile = null;
let guestProfile = null;
let property = null;
let booking = null;

try {
  const { data, error } = await admin.from('profiles').select('*').limit(2);
  if (error) throw error;
  if (!data?.length) throw new Error('No profiles found');
  hostProfile = data[0];
  guestProfile = data[1] || data[0];
  pass('profiles_seed', { hostId: hostProfile.id, guestId: guestProfile.id });
} catch (e) {
  fail('profiles_seed', e);
}

try {
  if (!hostProfile) throw new Error('No host profile context');
  const cols = Object.keys(hostProfile);
  const rolePatch = {};
  if (cols.includes('role')) rolePatch.role = 'host';
  if (cols.includes('user_role')) rolePatch.user_role = 'host';
  if (cols.includes('is_host')) rolePatch.is_host = true;
  if (cols.includes('host_role')) rolePatch.host_role = true;

  if (!Object.keys(rolePatch).length) {
    pass('become_host', { skipped: true, reason: 'No known host role columns', sampleColumns: cols.slice(0, 20) });
  } else {
    const { error } = await admin.from('profiles').update(rolePatch).eq('id', hostProfile.id);
    if (error) throw error;
    pass('become_host', { updated: rolePatch });
  }
} catch (e) {
  fail('become_host', e);
}

try {
  if (!hostProfile) throw new Error('No host profile context');
  const payload = {
    host_id: hostProfile.id,
    title: `Automated Host Listing ${Date.now()}`,
    name: `Automated Host Listing ${Date.now()}`,
    location: 'Kigali',
    price_per_night: 120000,
    currency: 'RWF',
    is_published: true
  };
  const { data, error } = await admin.from('properties').insert(payload).select('*').single();
  if (error) throw error;
  property = data;
  pass('create_listing', { listingId: property.id, title: property.title || property.name });
} catch (e) {
  fail('create_listing', e);
}

try {
  if (!hostProfile) throw new Error('No host profile context');
  const { data, error } = await admin
    .from('properties')
    .select('id,title,created_at')
    .eq('host_id', hostProfile.id)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  pass('host_dashboard_properties', { count: data?.length || 0 });
} catch (e) {
  fail('host_dashboard_properties', e);
}

try {
  if (!property || !guestProfile || !hostProfile) throw new Error('Missing context for booking create');
  const payload = {
    guest_id: guestProfile.id,
    host_id: hostProfile.id,
    guest_name: guestProfile.full_name || guestProfile.nickname || 'Automated Guest',
    guest_email: guestProfile.email || 'automation@example.com',
    property_id: property.id,
    check_in: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    check_out: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    guests: 2,
    total_price: 120000,
    currency: 'RWF',
    status: 'pending',
    booking_type: 'property',
    payment_status: 'pending',
    payment_method: 'card'
  };
  const { data, error } = await admin.from('bookings').insert(payload).select('*').single();
  if (error) throw error;
  booking = data;
  pass('create_booking', { bookingId: booking.id });
} catch (e) {
  fail('create_booking', e);
}

try {
  if (!hostProfile) throw new Error('No host profile context');
  const { data, error } = await admin
    .from('bookings')
    .select('id,status,created_at')
    .eq('host_id', hostProfile.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  pass('host_dashboard_bookings', { count: data?.length || 0 });
} catch (e) {
  fail('host_dashboard_bookings', e);
}

try {
  if (!guestProfile) throw new Error('No guest profile context');
  const { data, error } = await admin
    .from('bookings')
    .select('id,status,created_at')
    .eq('guest_id', guestProfile.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  pass('guest_dashboard_bookings', { count: data?.length || 0 });
} catch (e) {
  fail('guest_dashboard_bookings', e);
}

try {
  const { data, error } = await appLike
    .from('properties')
    .select('id,title,name,location,price_per_night,currency')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  pass('mobile_featured_listings_read', { count: data?.length || 0 });
} catch (e) {
  fail('mobile_featured_listings_read', e);
}

try {
  const { data, error } = await appLike
    .from('properties')
    .select('id,title,location,is_published')
    .eq('host_id', hostProfile?.id || '')
    .limit(5);
  if (error) throw error;
  pass('mobile_host_tools_read', { count: data?.length || 0 });
} catch (e) {
  fail('mobile_host_tools_read', e);
}

try {
  if (booking) {
    const { error } = await admin.from('bookings').delete().eq('id', booking.id);
    if (error) throw error;
  }
  pass('cleanup_booking');
} catch (e) {
  fail('cleanup_booking', e);
}

try {
  if (property) {
    const { error } = await admin.from('properties').delete().eq('id', property.id);
    if (error) throw error;
  }
  pass('cleanup_listing');
} catch (e) {
  fail('cleanup_listing', e);
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 2);
