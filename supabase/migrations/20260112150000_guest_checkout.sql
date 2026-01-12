-- Migration: Allow guest checkout without account
-- Add guest information fields to bookings table

-- Add guest info columns
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS is_guest_booking BOOLEAN DEFAULT false;

-- Make guest_id nullable for guest bookings
ALTER TABLE public.bookings ALTER COLUMN guest_id DROP NOT NULL;

-- Update RLS to allow guest bookings (insert without auth for guest bookings)
DROP POLICY IF EXISTS "Guests can create bookings" ON public.bookings;
CREATE POLICY "Guests can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    -- Either authenticated user booking for themselves
    (auth.uid() IS NOT NULL AND guest_id = auth.uid())
    OR
    -- Or guest booking with guest info
    (is_guest_booking = true AND guest_name IS NOT NULL AND guest_email IS NOT NULL)
  );

-- Allow anyone to insert guest bookings
DROP POLICY IF EXISTS "Anyone can create guest bookings" ON public.bookings;
CREATE POLICY "Anyone can create guest bookings"
  ON public.bookings FOR INSERT
  TO anon
  WITH CHECK (
    is_guest_booking = true 
    AND guest_name IS NOT NULL 
    AND guest_email IS NOT NULL
  );

-- Users can view their own bookings (by guest_id)
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = guest_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'host')
  );

-- Create index for guest email lookups
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON public.bookings(guest_email) WHERE guest_email IS NOT NULL;
