-- Allow admin/staff to view bookings + trip cart items ("orders") for dashboards/operations.

DO $$
BEGIN
  -- Bookings
  IF to_regclass('public.bookings') IS NOT NULL THEN
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "Staff/admin can view all bookings" ON public.bookings';
    EXECUTE 'CREATE POLICY "Staff/admin can view all bookings" ON public.bookings FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    )';

    EXECUTE 'DROP POLICY IF EXISTS "Staff/admin can update any booking" ON public.bookings';
    EXECUTE 'CREATE POLICY "Staff/admin can update any booking" ON public.bookings FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    )';
  END IF;

  -- Trip cart items (used as "orders")
  IF to_regclass('public.trip_cart_items') IS NOT NULL THEN
    ALTER TABLE public.trip_cart_items ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "Staff/admin can view all trip cart items" ON public.trip_cart_items';
    EXECUTE 'CREATE POLICY "Staff/admin can view all trip cart items" ON public.trip_cart_items FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'',''staff''))
    )';
  END IF;
END$$;

