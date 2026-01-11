-- Extend host_applications to collect listing info + verification docs (no mock data).
DO $$
BEGIN
  IF to_regclass('public.host_applications') IS NOT NULL THEN
    ALTER TABLE public.host_applications
      ADD COLUMN IF NOT EXISTS applicant_type TEXT NOT NULL DEFAULT 'individual',
      -- listing draft (required for submission)
      ADD COLUMN IF NOT EXISTS listing_title TEXT,
      ADD COLUMN IF NOT EXISTS listing_location TEXT,
      ADD COLUMN IF NOT EXISTS listing_property_type TEXT,
      ADD COLUMN IF NOT EXISTS listing_price_per_night DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS listing_currency TEXT DEFAULT 'RWF',
      ADD COLUMN IF NOT EXISTS listing_max_guests INTEGER,
      ADD COLUMN IF NOT EXISTS listing_bedrooms INTEGER,
      ADD COLUMN IF NOT EXISTS listing_bathrooms INTEGER,
      ADD COLUMN IF NOT EXISTS listing_amenities TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS listing_images TEXT[] DEFAULT '{}',
      -- business verification (only required if applicant_type='business')
      ADD COLUMN IF NOT EXISTS business_tin TEXT,
      ADD COLUMN IF NOT EXISTS business_certificate_url TEXT,
      ADD COLUMN IF NOT EXISTS national_id_number TEXT,
      ADD COLUMN IF NOT EXISTS national_id_photo_url TEXT;
  END IF;
END$$;

