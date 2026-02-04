-- Fix foreign key relationships for Supabase PostgREST joins
-- The issue is that host_payouts.host_id and host_applications.user_id reference auth.users
-- but the admin dashboard queries try to join with profiles table
-- We need to add explicit foreign key relationships to profiles

-- First, add an 'id' alias column to profiles that mirrors user_id for compatibility
-- This allows joins like: profiles:host_id(id, full_name, email)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID;

-- Update id to match user_id for all existing rows
UPDATE profiles SET id = user_id WHERE id IS NULL;

-- Make id always mirror user_id via trigger
CREATE OR REPLACE FUNCTION sync_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_profile_id_trigger ON profiles;
CREATE TRIGGER sync_profile_id_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_id();

-- Add email column to profiles if not exists (needed for admin queries)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync emails from auth.users to profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email != u.email);

-- Create function to keep email in sync
CREATE OR REPLACE FUNCTION sync_profile_email_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET email = NEW.email 
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON auth.users;
CREATE TRIGGER sync_profile_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email_from_auth();

-- Now add the foreign key from host_payouts to profiles
-- First check if constraint exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'host_payouts_host_id_profiles_fkey'
  ) THEN
    -- Add FK only if profiles has matching user_ids
    ALTER TABLE host_payouts
    ADD CONSTRAINT host_payouts_host_id_profiles_fkey
    FOREIGN KEY (host_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add host_payouts FK: %', SQLERRM;
END $$;

-- Add foreign key from host_applications to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'host_applications_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE host_applications
    ADD CONSTRAINT host_applications_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add host_applications FK: %', SQLERRM;
END $$;

-- Ensure support_tickets table has proper structure
-- Add any missing columns
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Make sure id is primary key (if not already)
DO $$
BEGIN
  -- Check if primary key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'support_tickets' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE support_tickets ADD PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Primary key may already exist: %', SQLERRM;
END $$;

-- Grant proper RLS for admin/staff to view support tickets
DROP POLICY IF EXISTS "Admin can view all support tickets" ON support_tickets;
CREATE POLICY "Admin can view all support tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Admin can update support tickets" ON support_tickets;
CREATE POLICY "Admin can update support tickets" ON support_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'staff')
    )
  );

-- Done
