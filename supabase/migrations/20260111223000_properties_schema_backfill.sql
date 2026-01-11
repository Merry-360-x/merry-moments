-- Backfill properties schema for older databases so guest pages can query consistently.
DO $$
BEGIN
  IF to_regclass('public.properties') IS NOT NULL THEN
    ALTER TABLE public.properties
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Hotel',
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS price_per_night DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
      ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
  END IF;
END$$;

