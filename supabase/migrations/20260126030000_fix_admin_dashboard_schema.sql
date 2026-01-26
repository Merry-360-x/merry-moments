-- Add missing columns to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add missing columns to transport_vehicles table
ALTER TABLE transport_vehicles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;

-- Add missing column to tour_packages table  
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS price_per_person integer;

-- Add email column to profiles table if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text;

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  tour_id uuid REFERENCES tour_packages(id) ON DELETE CASCADE,
  transport_id uuid REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Anyone can read visible reviews"
  ON reviews
  FOR SELECT
  USING (is_hidden = false OR auth.uid() = user_id);

CREATE POLICY "Users can create reviews for their bookings"
  ON reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_property_id ON reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tour_id ON reviews(tour_id);
CREATE INDEX IF NOT EXISTS idx_reviews_transport_id ON reviews(transport_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
