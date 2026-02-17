-- Add conference-room metadata fields for accommodation listings.
-- These fields support showing conference availability rules as an amenity.

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS conference_room_capacity integer;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS conference_room_min_rooms_required integer;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS conference_room_equipment text[];

COMMENT ON COLUMN public.properties.conference_room_capacity IS
'How many people the conference room can host.';

COMMENT ON COLUMN public.properties.conference_room_min_rooms_required IS
'Minimum number of hotel rooms that must be booked to access conference room.';

COMMENT ON COLUMN public.properties.conference_room_equipment IS
'Conference room equipment list (e.g., tv, monitor, projector, whiteboard).';
