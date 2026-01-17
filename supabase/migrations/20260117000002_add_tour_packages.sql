-- Create tour_packages table for tour guide hosts
CREATE TABLE IF NOT EXISTS public.tour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Cultural', 'Adventure', 'Wildlife', 'City Tours', 'Hiking', 'Photography', 'Historical', 'Eco-Tourism')),
  tour_type TEXT NOT NULL CHECK (tour_type IN ('Private', 'Group')),
  description TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Rwanda',
  city TEXT NOT NULL,
  
  -- Itinerary Information
  duration TEXT NOT NULL,
  daily_itinerary TEXT NOT NULL,
  included_services TEXT,
  excluded_services TEXT,
  meeting_point TEXT NOT NULL,
  what_to_bring TEXT,
  cancellation_policy TEXT NOT NULL,
  
  -- Pricing & Availability
  price_per_adult DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  min_guests INTEGER NOT NULL DEFAULT 1,
  max_guests INTEGER NOT NULL DEFAULT 10,
  available_dates JSONB DEFAULT '[]'::jsonb,
  
  -- Media
  cover_image TEXT NOT NULL,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  itinerary_pdf_url TEXT NOT NULL,
  
  -- Status & Approval
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'archived')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_tour_packages_host_id ON public.tour_packages(host_id);
CREATE INDEX idx_tour_packages_status ON public.tour_packages(status);
CREATE INDEX idx_tour_packages_category ON public.tour_packages(category);
CREATE INDEX idx_tour_packages_city ON public.tour_packages(city);

-- Enable RLS
ALTER TABLE public.tour_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Hosts can view their own tour packages
CREATE POLICY "Hosts can view own tour packages"
  ON public.tour_packages
  FOR SELECT
  USING (host_id = auth.uid());

-- Hosts can insert their own tour packages
CREATE POLICY "Hosts can create tour packages"
  ON public.tour_packages
  FOR INSERT
  WITH CHECK (host_id = auth.uid());

-- Hosts can update their own tour packages (only if draft or rejected)
CREATE POLICY "Hosts can update own tour packages"
  ON public.tour_packages
  FOR UPDATE
  USING (host_id = auth.uid() AND status IN ('draft', 'rejected'))
  WITH CHECK (host_id = auth.uid() AND status IN ('draft', 'rejected', 'pending_approval'));

-- Hosts can delete their own draft packages
CREATE POLICY "Hosts can delete own draft packages"
  ON public.tour_packages
  FOR DELETE
  USING (host_id = auth.uid() AND status = 'draft');

-- Public can view approved tour packages
CREATE POLICY "Public can view approved tour packages"
  ON public.tour_packages
  FOR SELECT
  USING (status = 'approved');

-- Admins can view all tour packages
CREATE POLICY "Admins can view all tour packages"
  ON public.tour_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any tour package
CREATE POLICY "Admins can update tour packages"
  ON public.tour_packages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_tour_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tour_packages_updated_at_trigger
  BEFORE UPDATE ON public.tour_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_tour_packages_updated_at();

-- Add columns to host_applications table for tour guide specific fields
ALTER TABLE public.host_applications
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[],
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS areas_of_operation TEXT,
ADD COLUMN IF NOT EXISTS tour_specialties TEXT[],
ADD COLUMN IF NOT EXISTS tour_guide_bio TEXT,
ADD COLUMN IF NOT EXISTS tour_guide_license_url TEXT;
