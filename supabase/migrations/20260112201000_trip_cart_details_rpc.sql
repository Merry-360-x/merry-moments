-- RPC: fetch hydrated trip cart details in one query (fast cart page)
-- Returns title/price/currency/image/meta for each cart item.

CREATE OR REPLACE FUNCTION public.trip_cart_details(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  item_type text,
  reference_id uuid,
  quantity int,
  created_at timestamptz,
  title text,
  price numeric,
  currency text,
  image text,
  meta text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Auth guard: user can fetch their own cart; admin/staff can fetch any cart
  WITH allowed AS (
    SELECT 1 AS ok
    WHERE auth.uid() = p_user_id
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
  )
  -- Tours
  SELECT
    i.id,
    i.item_type::text,
    i.reference_id,
    COALESCE(i.quantity, 1)::int,
    i.created_at,
    t.title::text,
    COALESCE(t.price_per_person, 0)::numeric,
    COALESCE(t.currency, 'RWF')::text,
    COALESCE((t.images)[1], NULL)::text,
    (COALESCE(t.duration_days, 1)::text || ' day(s)')::text
  FROM public.trip_cart_items i
  JOIN allowed a ON TRUE
  JOIN public.tours t ON t.id = i.reference_id
  WHERE i.user_id = p_user_id AND i.item_type::text = 'tour'

  UNION ALL
  -- Properties
  SELECT
    i.id,
    i.item_type::text,
    i.reference_id,
    COALESCE(i.quantity, 1)::int,
    i.created_at,
    p.title::text,
    COALESCE(p.price_per_night, 0)::numeric,
    COALESCE(p.currency, 'RWF')::text,
    COALESCE((p.images)[1], NULL)::text,
    COALESCE(p.location, '')::text
  FROM public.trip_cart_items i
  JOIN allowed a ON TRUE
  JOIN public.properties p ON p.id = i.reference_id
  WHERE i.user_id = p_user_id AND i.item_type::text = 'property'

  UNION ALL
  -- Transport vehicles (use image_url only to avoid schema type mismatches on media)
  SELECT
    i.id,
    i.item_type::text,
    i.reference_id,
    COALESCE(i.quantity, 1)::int,
    i.created_at,
    v.title::text,
    COALESCE(v.price_per_day, 0)::numeric,
    COALESCE(v.currency, 'RWF')::text,
    COALESCE(v.image_url, NULL)::text,
    (COALESCE(v.vehicle_type, 'Vehicle') || ' • ' || COALESCE(v.seats, 0)::text || ' seats')::text
  FROM public.trip_cart_items i
  JOIN allowed a ON TRUE
  JOIN public.transport_vehicles v ON v.id = i.reference_id
  WHERE i.user_id = p_user_id AND i.item_type::text = 'transport_vehicle'

  UNION ALL
  -- Transport routes
  SELECT
    i.id,
    i.item_type::text,
    i.reference_id,
    COALESCE(i.quantity, 1)::int,
    i.created_at,
    (r.from_location || ' → ' || r.to_location)::text,
    COALESCE(r.base_price, 0)::numeric,
    COALESCE(r.currency, 'RWF')::text,
    NULL::text,
    NULL::text
  FROM public.trip_cart_items i
  JOIN allowed a ON TRUE
  JOIN public.transport_routes r ON r.id = i.reference_id
  WHERE i.user_id = p_user_id AND i.item_type::text = 'transport_route'

  UNION ALL
  -- Transport services
  SELECT
    i.id,
    i.item_type::text,
    i.reference_id,
    COALESCE(i.quantity, 1)::int,
    i.created_at,
    s.title::text,
    0::numeric,
    'RWF'::text,
    NULL::text,
    COALESCE(s.description, '')::text
  FROM public.trip_cart_items i
  JOIN allowed a ON TRUE
  JOIN public.transport_services s ON s.id = i.reference_id
  WHERE i.user_id = p_user_id AND i.item_type::text = 'transport_service'

  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.trip_cart_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trip_cart_details(uuid) TO authenticated;

