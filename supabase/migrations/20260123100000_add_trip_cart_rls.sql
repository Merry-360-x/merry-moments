-- Add RLS policies for trip_cart_items table
-- This migration ensures users can only access their own cart items

-- Enable RLS on trip_cart_items if not already enabled
ALTER TABLE trip_cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own cart items" ON trip_cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON trip_cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON trip_cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON trip_cart_items;
DROP POLICY IF EXISTS "Admins can view all cart items" ON trip_cart_items;
DROP POLICY IF EXISTS "Admins can manage all cart items" ON trip_cart_items;

-- Users can view their own cart items
CREATE POLICY "Users can view own cart items"
ON trip_cart_items
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own cart items
CREATE POLICY "Users can insert own cart items"
ON trip_cart_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own cart items
CREATE POLICY "Users can update own cart items"
ON trip_cart_items
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own cart items
CREATE POLICY "Users can delete own cart items"
ON trip_cart_items
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all cart items
CREATE POLICY "Admins can view all cart items"
ON trip_cart_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Admins can manage all cart items
CREATE POLICY "Admins can manage all cart items"
ON trip_cart_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  )
);

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_trip_cart_user_id ON trip_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_cart_item_type ON trip_cart_items(item_type);
CREATE INDEX IF NOT EXISTS idx_trip_cart_reference_id ON trip_cart_items(reference_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON trip_cart_items TO authenticated;
GRANT SELECT ON trip_cart_items TO anon;
