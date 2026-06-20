import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('[mobile-sync] Missing Supabase environment variables');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!String(authHeader).startsWith('Bearer ')) return '';
  return String(authHeader).slice(7).trim();
}

async function authenticate(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error('Supabase environment is not configured'), { status: 500 });
  }

  const token = getBearerToken(req);
  if (!token) {
    throw Object.assign(new Error('Missing bearer token'), { status: 401 });
  }

  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    throw Object.assign(new Error('Invalid auth token'), { status: 401 });
  }

  return {
    userId: userData.user.id,
    userEmail: userData.user.email || null,
  };
}

function safeStr(value, max = 500) {
  const s = typeof value === 'string' ? value : '';
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const DISABLED_CLOUD_NAMES = ['dxdblhmbm'];

function isWorkingCloudinaryUrl(url) {
  try {
    const uri = new URL(url);
    if (uri.host === 'res.cloudinary.com') {
      const segments = uri.pathname.split('/').filter(Boolean);
      if (segments.length > 0 && DISABLED_CLOUD_NAMES.includes(segments[0])) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeImages(images, mainImage) {
  const candidates = new Set();
  if (Array.isArray(images)) {
    for (const v of images) {
      if (v && typeof v === 'string') candidates.add(v.trim());
    }
  }
  if (mainImage && typeof mainImage === 'string' && mainImage.trim()) {
    candidates.add(mainImage.trim());
  }

  // Prefer working Cloudinary URLs only.
  const working = [...candidates].filter(v => isWorkingCloudinaryUrl(v));
  if (working.length > 0) return working;

  // If no working Cloudinary URLs, return empty — UI will show a placeholder
  // instead of a broken 401 image from a disabled/misconfigured cloud.
  return [];
}

function normalizeProperty(row) {
  const imgs = normalizeImages(row.images, row.main_image);
  const mainImage = imgs[0] || row.main_image?.toString().trim() || null;
  return {
    ...row,
    item_type: 'property',
    images: imgs,
    main_image: mainImage,
    location: row.location || '',
    price_per_night: safeNum(row.price_per_night),
    currency: row.currency || 'RWF',
    rating: row.rating ? safeNum(row.rating) : null,
    review_count: safeNum(row.review_count),
    bedrooms: row.bedrooms ? safeNum(row.bedrooms) : null,
    bathrooms: row.bathrooms ? safeNum(row.bathrooms) : null,
    beds: row.beds ? safeNum(row.beds) : null,
    max_guests: safeNum(row.max_guests) || 1,
    amenities: row.amenities || [],
    host_id: row.host_id || '',
    is_published: Boolean(row.is_published),
    created_at: row.created_at,
  };
}

function normalizeTour(row) {
  const imgs = normalizeImages(row.images, row.main_image);
  const mainImage = imgs[0] || row.main_image?.toString().trim() || null;
  return {
    ...row,
    item_type: 'tour',
    source: 'tours',
    images: imgs,
    main_image: mainImage,
    location: row.location || '',
    price_per_person: safeNum(row.price_per_person),
    currency: row.currency || 'RWF',
    rating: row.rating ? safeNum(row.rating) : null,
    review_count: safeNum(row.review_count),
    category: row.category || null,
    duration_days: safeNum(row.duration_days) || 1,
    created_by: row.created_by || '',
    is_published: Boolean(row.is_published),
    created_at: row.created_at,
  };
}

function normalizeTourPackage(row) {
  return {
    ...row,
    item_type: 'tour_package',
    source: 'tour_packages',
    location: [row.city, row.country].filter(Boolean).join(', '),
    price_per_person: safeNum(row.price_per_person ?? row.price_per_adult),
    currency: row.currency || 'RWF',
    images: [
      ...(row.cover_image ? [row.cover_image] : []),
      ...(row.gallery_images || []),
    ],
    main_image: row.cover_image || row.gallery_images?.[0] || null,
    is_published: row.status === 'approved',
    created_at: row.created_at,
  };
}

function normalizeTransport(row) {
  return {
    ...row,
    item_type: 'transport',
    location: row.provider_name || row.vehicle_type || '',
    price_per_day: safeNum(row.price_per_day ?? row.daily_price),
    currency: row.currency || 'RWF',
    images: [
      ...(row.image_url ? [row.image_url] : []),
      ...(row.media || []),
    ],
    main_image: row.image_url || row.media?.[0] || null,
    is_published: Boolean(row.is_published),
    created_at: row.created_at,
  };
}

async function fetchHomeListings() {
  const [properties, tours, tourPackages, transport] = await Promise.all([
    supabaseAdmin
      .from('properties')
      .select('id, title, location, price_per_night, price_per_month, monthly_only_listing, currency, property_type, rating, review_count, bedrooms, beds, bathrooms, max_guests, images, main_image, host_id, created_at, is_published, amenities, check_in_time, check_out_time, cancellation_policy, weekly_discount, monthly_discount')
      .eq('is_published', true)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(120),
    supabaseAdmin
      .from('tours')
      .select('id, title, location, price_per_person, currency, images, main_image, rating, review_count, category, duration_days, created_by, created_at, is_published, max_group_size')
      .eq('is_published', true)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80),
    supabaseAdmin
      .from('tour_packages')
      .select('id, title, city, country, price_per_adult, price_per_person, currency, status, cover_image, gallery_images, category, duration, host_id, created_at, max_guests')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(80),
    supabaseAdmin
      .from('transport_vehicles')
      .select('id, title, provider_name, vehicle_type, seats, price_per_day, currency, driver_included, image_url, media, created_at, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  const listings = [
    ...(properties.data || []).map(normalizeProperty),
    ...(tours.data || []).map(normalizeTour),
    ...(tourPackages.data || []).map(normalizeTourPackage),
    ...(transport.data || []).map(normalizeTransport),
  ];

  return listings;
}

async function fetchStories() {
  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: stories, error } = await supabaseAdmin
    .from('stories')
    .select('id, user_id, title, body, location, media_url, media_type, image_url, created_at')
    .gte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error || !stories?.length) return [];

  const userIds = [...new Set(stories.map(s => s.user_id).filter(Boolean))];
  if (!userIds.length) return stories;

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, nickname, avatar_url')
    .in('user_id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  return stories.map(story => {
    const profile = profileMap.get(story.user_id);
    return {
      ...story,
      username: profile?.full_name || profile?.nickname || 'User',
      avatar_url: profile?.avatar_url || '',
    };
  });
}

async function fetchUserProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, nickname, avatar_url, bio, phone, loyalty_points, currency, language, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function fetchUserRoles(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) return [];
  return (data || []).map(r => r.role);
}

async function fetchWishlists(userId) {
  const { data, error } = await supabaseAdmin
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

async function fetchTripCart(userId) {
  const { data, error } = await supabaseAdmin
    .from('trip_cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

async function fetchBookings(userId) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('guest_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

async function fetchNotifications(userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  if (req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const auth = await authenticate(req);
    const { include = 'home,profile,wishlists,tripCart,bookings,notifications' } = req.query;
    const parts = String(include).split(',');

    const result = {
      serverTime: new Date().toISOString(),
      homeListings: [],
      stories: [],
      profile: null,
      roles: [],
      bookings: [],
      wishlists: [],
      tripCart: [],
      notifications: [],
    };

    const promises = [];

    if (parts.includes('home')) {
      promises.push(fetchHomeListings().then(data => { result.homeListings = data; }));
    }
    if (parts.includes('profile')) {
      promises.push(fetchUserProfile(auth.userId).then(data => { result.profile = data; }));
    }
    if (parts.includes('wishlists')) {
      promises.push(fetchWishlists(auth.userId).then(data => { result.wishlists = data; }));
    }
    if (parts.includes('tripCart')) {
      promises.push(fetchTripCart(auth.userId).then(data => { result.tripCart = data; }));
    }
    if (parts.includes('bookings')) {
      promises.push(fetchBookings(auth.userId).then(data => { result.bookings = data; }));
    }
    if (parts.includes('notifications')) {
      promises.push(fetchNotifications(auth.userId).then(data => { result.notifications = data; }));
    }

    // Always fetch stories (public) and roles
    promises.push(
      fetchStories().then(data => { result.stories = data; }),
      fetchUserRoles(auth.userId).then(data => { result.roles = data; })
    );

    await Promise.all(promises);

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    const status = Number(error?.status || 500);
    return json(res, status, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}