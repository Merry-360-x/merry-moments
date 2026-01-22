-- Enable hosts to create and manage their own tours
-- Migration: 20260122000010_enable_tour_creation.sql

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Creators can view own tours" ON tours;
DROP POLICY IF EXISTS "Admins can manage all tours" ON tours;
DROP POLICY IF EXISTS "Admins can view all tours" ON tours;
DROP POLICY IF EXISTS "Admins can insert any tour" ON tours;
DROP POLICY IF EXISTS "Admins can update any tour" ON tours;
DROP POLICY IF EXISTS "Admins can delete any tour" ON tours;

-- Public can view published tours
CREATE POLICY "Anyone can view published tours"
ON tours FOR SELECT
TO authenticated, anon
USING (is_published = true);

-- Creators (hosts) can view their own tours
CREATE POLICY "Creators can view own tours"
ON tours FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Hosts can create tours
CREATE POLICY "Hosts can create tours"
ON tours FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('host', 'admin')
      LIMIT 1
    )
  )
);

-- Creators can update their own tours
CREATE POLICY "Creators can update own tours"
ON tours FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own tours
CREATE POLICY "Creators can delete own tours"
ON tours FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Admins can view all tours
CREATE POLICY "Admins can view all tours"
ON tours FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can insert any tour
CREATE POLICY "Admins can insert any tour"
ON tours FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can update any tour
CREATE POLICY "Admins can update any tour"
ON tours FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can delete any tour
CREATE POLICY "Admins can delete any tour"
ON tours FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);
