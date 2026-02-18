-- Add conference amenity pricing/duration fields to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS conference_room_price numeric,
ADD COLUMN IF NOT EXISTS conference_room_duration_hours integer;

COMMENT ON COLUMN public.properties.conference_room_price IS
'Optional conference room amenity price for one session.';

COMMENT ON COLUMN public.properties.conference_room_duration_hours IS
'Conference room amenity session duration in hours.';

-- Backfill legacy conference listings where possible
UPDATE public.properties
SET conference_room_price = COALESCE(conference_room_price, price_per_group)
WHERE conference_room_price IS NULL
  AND (
    property_type = 'Conference Room'
    OR (amenities IS NOT NULL AND amenities @> ARRAY['conference_room']::text[])
  )
  AND price_per_group IS NOT NULL;

UPDATE public.properties
SET conference_room_duration_hours = COALESCE(conference_room_duration_hours, 1)
WHERE conference_room_duration_hours IS NULL
  AND (
    property_type = 'Conference Room'
    OR (amenities IS NOT NULL AND amenities @> ARRAY['conference_room']::text[])
  );
