-- Auto-delete stories older than 24 hours

-- Create function to delete old stories
CREATE OR REPLACE FUNCTION delete_old_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM stories
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Create a function that runs on story queries to filter out old stories
-- Update the RLS policy to only show stories less than 24 hours old
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;

CREATE POLICY "Anyone can view stories"
ON stories FOR SELECT
TO authenticated, anon
USING (created_at > NOW() - INTERVAL '24 hours');

-- Create a scheduled job to clean up old stories periodically (every hour)
-- Note: This requires pg_cron extension which may not be available on all Supabase plans
-- If pg_cron is available, uncomment the following:

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- SELECT cron.schedule(
--   'delete-old-stories',
--   '0 * * * *', -- Every hour
--   $$SELECT delete_old_stories()$$
-- );

-- Alternative: Create a trigger to prevent insertion of backdated stories
CREATE OR REPLACE FUNCTION prevent_backdated_stories()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure created_at is not in the past more than 5 minutes (to allow for clock skew)
  IF NEW.created_at < NOW() - INTERVAL '5 minutes' THEN
    NEW.created_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_story_timestamp
  BEFORE INSERT ON stories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_backdated_stories();

-- Add a comment explaining the 24-hour auto-deletion
COMMENT ON TABLE stories IS 'Stories are automatically hidden after 24 hours via RLS policy and should be cleaned up periodically';
