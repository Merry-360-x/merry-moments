-- Comprehensive admin features migration

-- 1. Add suspension and verification to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_suspended') THEN
    ALTER TABLE public.profiles ADD COLUMN is_suspended BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'suspension_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN suspension_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'suspended_at') THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'suspended_by') THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Add moderation fields to property_reviews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_reviews' AND column_name = 'is_hidden') THEN
    ALTER TABLE public.property_reviews ADD COLUMN is_hidden BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_reviews' AND column_name = 'hidden_reason') THEN
    ALTER TABLE public.property_reviews ADD COLUMN hidden_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_reviews' AND column_name = 'hidden_by') THEN
    ALTER TABLE public.property_reviews ADD COLUMN hidden_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_reviews' AND column_name = 'hidden_at') THEN
    ALTER TABLE public.property_reviews ADD COLUMN hidden_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Enhance support_tickets with more fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'category') THEN
    ALTER TABLE public.support_tickets ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
    ALTER TABLE public.support_tickets ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'response') THEN
    ALTER TABLE public.support_tickets ADD COLUMN response TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'responded_by') THEN
    ALTER TABLE public.support_tickets ADD COLUMN responded_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_tickets' AND column_name = 'responded_at') THEN
    ALTER TABLE public.support_tickets ADD COLUMN responded_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Create blacklist table for blocked users
CREATE TABLE IF NOT EXISTS public.blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- RLS for blacklist
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage blacklist" ON public.blacklist;
CREATE POLICY "Admin can manage blacklist" ON public.blacklist
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add featured flag to properties, tours
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'is_featured') THEN
    ALTER TABLE public.properties ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tours' AND column_name = 'is_featured') THEN
    ALTER TABLE public.tours ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 6. Add admin notes to bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.bookings ADD COLUMN admin_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancelled_by') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'refund_amount') THEN
    ALTER TABLE public.bookings ADD COLUMN refund_amount NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'refund_status') THEN
    ALTER TABLE public.bookings ADD COLUMN refund_status TEXT;
  END IF;
END $$;

-- 7. Create incident_reports table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id),
  reported_user_id UUID REFERENCES auth.users(id),
  reported_property_id UUID,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can manage incidents" ON public.incident_reports;
CREATE POLICY "Admin can manage incidents" ON public.incident_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 8. Create platform_settings table for content management
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;
CREATE POLICY "Anyone can read settings" ON public.platform_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can update settings" ON public.platform_settings;
CREATE POLICY "Admin can update settings" ON public.platform_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 9. Enhanced admin metrics RPC
DROP FUNCTION IF EXISTS public.admin_dashboard_metrics();
CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'users_total', (SELECT COUNT(*) FROM auth.users),
    'users_suspended', (SELECT COUNT(*) FROM public.profiles WHERE is_suspended = true),
    'hosts_total', (SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role = 'host'),
    'stories_total', (SELECT COUNT(*) FROM public.stories),
    'properties_total', (SELECT COUNT(*) FROM public.properties),
    'properties_published', (SELECT COUNT(*) FROM public.properties WHERE is_published = true),
    'properties_featured', (SELECT COUNT(*) FROM public.properties WHERE is_featured = true),
    'tours_total', (SELECT COUNT(*) FROM public.tours),
    'tours_published', (SELECT COUNT(*) FROM public.tours WHERE is_published = true),
    'transport_services_total', (SELECT COUNT(*) FROM public.transport_services),
    'transport_vehicles_total', (SELECT COUNT(*) FROM public.transport_vehicles),
    'transport_vehicles_published', (SELECT COUNT(*) FROM public.transport_vehicles WHERE is_published = true),
    'transport_routes_total', (SELECT COUNT(*) FROM public.transport_routes),
    'transport_routes_published', (SELECT COUNT(*) FROM public.transport_routes WHERE is_published = true),
    'bookings_total', (SELECT COUNT(*) FROM public.bookings),
    'bookings_pending', (SELECT COUNT(*) FROM public.bookings WHERE status = 'pending'),
    'bookings_confirmed', (SELECT COUNT(*) FROM public.bookings WHERE status = 'confirmed'),
    'bookings_completed', (SELECT COUNT(*) FROM public.bookings WHERE status = 'completed'),
    'bookings_cancelled', (SELECT COUNT(*) FROM public.bookings WHERE status = 'cancelled'),
    'bookings_paid', (SELECT COUNT(*) FROM public.bookings WHERE status IN ('confirmed', 'completed')),
    'orders_total', (SELECT COUNT(*) FROM public.trip_cart_items),
    'reviews_total', (SELECT COUNT(*) FROM public.property_reviews),
    'reviews_hidden', (SELECT COUNT(*) FROM public.property_reviews WHERE is_hidden = true),
    'tickets_total', (SELECT COUNT(*) FROM public.support_tickets),
    'tickets_open', (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open'),
    'tickets_in_progress', (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'in_progress'),
    'tickets_resolved', (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'resolved'),
    'incidents_total', (SELECT COUNT(*) FROM public.incident_reports),
    'incidents_open', (SELECT COUNT(*) FROM public.incident_reports WHERE status = 'open'),
    'blacklist_count', (SELECT COUNT(*) FROM public.blacklist WHERE expires_at IS NULL OR expires_at > now()),
    'revenue_gross', COALESCE((SELECT SUM(total_price) FROM public.bookings WHERE status IN ('confirmed', 'completed')), 0),
    'revenue_by_currency', (
      SELECT COALESCE(json_agg(json_build_object('currency', currency, 'amount', total)), '[]'::json)
      FROM (
        SELECT currency, SUM(total_price) as total
        FROM public.bookings
        WHERE status IN ('confirmed', 'completed')
        GROUP BY currency
      ) sub
    ),
    'refunds_total', COALESCE((SELECT SUM(refund_amount) FROM public.bookings WHERE refund_amount IS NOT NULL), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 10. Admin list users with more details
DROP FUNCTION IF EXISTS public.admin_list_users(TEXT);
CREATE OR REPLACE FUNCTION public.admin_list_users(_search TEXT DEFAULT '')
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  full_name TEXT,
  phone TEXT,
  is_suspended BOOLEAN,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    p.full_name::TEXT,
    p.phone::TEXT,
    COALESCE(p.is_suspended, false) AS is_suspended,
    COALESCE(p.is_verified, false) AS is_verified
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id OR p.user_id = u.id
  WHERE 
    _search = '' 
    OR u.email ILIKE '%' || _search || '%'
    OR p.full_name ILIKE '%' || _search || '%'
    OR p.phone ILIKE '%' || _search || '%'
    OR u.id::TEXT ILIKE '%' || _search || '%'
  ORDER BY u.created_at DESC
  LIMIT 500;
END;
$$;

-- 11. Admin get bookings with details
CREATE OR REPLACE FUNCTION public.admin_list_bookings(_status TEXT DEFAULT '', _limit INT DEFAULT 100)
RETURNS TABLE(
  id UUID,
  property_id UUID,
  property_title TEXT,
  guest_id UUID,
  guest_email TEXT,
  host_id UUID,
  check_in DATE,
  check_out DATE,
  guests INT,
  total_price NUMERIC,
  currency TEXT,
  status TEXT,
  admin_notes TEXT,
  refund_amount NUMERIC,
  refund_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.property_id,
    p.title::TEXT AS property_title,
    b.guest_id,
    u.email::TEXT AS guest_email,
    p.host_id,
    b.check_in,
    b.check_out,
    b.guests,
    b.total_price,
    b.currency::TEXT,
    b.status::TEXT,
    b.admin_notes::TEXT,
    b.refund_amount,
    b.refund_status::TEXT,
    b.created_at
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN auth.users u ON u.id = b.guest_id
  WHERE _status = '' OR b.status = _status
  ORDER BY b.created_at DESC
  LIMIT _limit;
END;
$$;

-- 12. Admin get reviews with details
CREATE OR REPLACE FUNCTION public.admin_list_reviews(_limit INT DEFAULT 100)
RETURNS TABLE(
  id UUID,
  property_id UUID,
  property_title TEXT,
  user_id UUID,
  user_email TEXT,
  rating INT,
  comment TEXT,
  is_hidden BOOLEAN,
  hidden_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.property_id,
    p.title::TEXT AS property_title,
    r.user_id,
    u.email::TEXT AS user_email,
    r.rating,
    r.comment::TEXT,
    COALESCE(r.is_hidden, false) AS is_hidden,
    r.hidden_reason::TEXT,
    r.created_at
  FROM public.property_reviews r
  LEFT JOIN public.properties p ON p.id = r.property_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  ORDER BY r.created_at DESC
  LIMIT _limit;
END;
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_bookings(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reviews(INT) TO authenticated;
