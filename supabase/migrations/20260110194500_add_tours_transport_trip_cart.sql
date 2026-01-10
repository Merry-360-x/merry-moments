-- Add Tours, Transport, Trip Cart, and profile fields used on merry360x.com

-- Add optional date_of_birth to profiles
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS date_of_birth DATE;
  END IF;
END$$;

-- Trip item type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'trip_item_type'
  ) THEN
    CREATE TYPE public.trip_item_type AS ENUM ('tour', 'transport_service', 'transport_vehicle', 'transport_route');
  END IF;
END$$;

-- Tours
CREATE TABLE IF NOT EXISTS public.tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Nature',
  difficulty TEXT NOT NULL DEFAULT 'Moderate',
  duration_days INTEGER NOT NULL DEFAULT 1,
  price_per_person DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RWF',
  location TEXT,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published tours" ON public.tours;
CREATE POLICY "Anyone can view published tours"
  ON public.tours FOR SELECT
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

DROP POLICY IF EXISTS "Staff and admins can manage tours" ON public.tours;
CREATE POLICY "Staff and admins can manage tours"
  ON public.tours FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Transport services (Taxi, Shuttle, etc)
CREATE TABLE IF NOT EXISTS public.transport_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  price_hint TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published transport services" ON public.transport_services;
CREATE POLICY "Anyone can view published transport services"
  ON public.transport_services FOR SELECT
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

DROP POLICY IF EXISTS "Staff and admins can manage transport services" ON public.transport_services;
CREATE POLICY "Staff and admins can manage transport services"
  ON public.transport_services FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Seed common services (idempotent)
INSERT INTO public.transport_services (slug, title, description, icon, price_hint)
VALUES
  ('taxi', 'Taxi Service', 'Quick rides around the city', 'taxi', null),
  ('shuttle', 'Shuttle Service', 'Shared rides to popular destinations', 'shuttle', null),
  ('car_rental', 'Car Rental', 'Rent a vehicle for your journey', 'car', null)
ON CONFLICT (slug) DO NOTHING;

-- Transport vehicles
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT,
  title TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'Sedan',
  seats INTEGER NOT NULL DEFAULT 4,
  price_per_day DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RWF',
  driver_included BOOLEAN DEFAULT true,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published transport vehicles" ON public.transport_vehicles;
CREATE POLICY "Anyone can view published transport vehicles"
  ON public.transport_vehicles FOR SELECT
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

DROP POLICY IF EXISTS "Staff and admins can manage transport vehicles" ON public.transport_vehicles;
CREATE POLICY "Staff and admins can manage transport vehicles"
  ON public.transport_vehicles FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Transport routes
CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  distance_km DECIMAL(10, 2),
  duration_minutes INTEGER,
  base_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RWF',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published transport routes" ON public.transport_routes;
CREATE POLICY "Anyone can view published transport routes"
  ON public.transport_routes FOR SELECT
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
  );

DROP POLICY IF EXISTS "Staff and admins can manage transport routes" ON public.transport_routes;
CREATE POLICY "Staff and admins can manage transport routes"
  ON public.transport_routes FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Trip cart items (polymorphic reference to a tour/service/vehicle/route)
CREATE TABLE IF NOT EXISTS public.trip_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type public.trip_item_type NOT NULL,
  reference_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_cart_items_user_id_idx ON public.trip_cart_items(user_id);
CREATE INDEX IF NOT EXISTS trip_cart_items_type_ref_idx ON public.trip_cart_items(item_type, reference_id);

ALTER TABLE public.trip_cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trip cart" ON public.trip_cart_items;
CREATE POLICY "Users can view own trip cart"
  ON public.trip_cart_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to trip cart" ON public.trip_cart_items;
CREATE POLICY "Users can add to trip cart"
  ON public.trip_cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trip cart" ON public.trip_cart_items;
CREATE POLICY "Users can update own trip cart"
  ON public.trip_cart_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove from trip cart" ON public.trip_cart_items;
CREATE POLICY "Users can remove from trip cart"
  ON public.trip_cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tours_updated_at') THEN
    CREATE TRIGGER update_tours_updated_at
      BEFORE UPDATE ON public.tours
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transport_services_updated_at') THEN
    CREATE TRIGGER update_transport_services_updated_at
      BEFORE UPDATE ON public.transport_services
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transport_vehicles_updated_at') THEN
    CREATE TRIGGER update_transport_vehicles_updated_at
      BEFORE UPDATE ON public.transport_vehicles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transport_routes_updated_at') THEN
    CREATE TRIGGER update_transport_routes_updated_at
      BEFORE UPDATE ON public.transport_routes
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_trip_cart_items_updated_at') THEN
    CREATE TRIGGER update_trip_cart_items_updated_at
      BEFORE UPDATE ON public.trip_cart_items
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;
