-- Sync email addresses from auth.users to profiles
UPDATE profiles
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE id = profiles.user_id
)
WHERE email IS NULL OR email = '';

-- Create a trigger to automatically sync email when profiles are created/updated
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON profiles;

-- Create trigger for new profiles
CREATE TRIGGER sync_profile_email_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.email IS NULL OR NEW.email = '')
  EXECUTE FUNCTION sync_profile_email();
