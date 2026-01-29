-- Remove the 24-hour expiration filter from stories
-- All stories should be visible to everyone (guests and authenticated users)

DROP POLICY IF EXISTS "Anyone can view stories" ON stories;

CREATE POLICY "Anyone can view stories"
ON stories FOR SELECT
TO authenticated, anon
USING (true);
