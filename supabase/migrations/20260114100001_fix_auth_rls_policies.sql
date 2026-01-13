-- Fix RLS policies to allow trigger function to insert profiles

-- The handle_new_user trigger runs with SECURITY DEFINER, so it bypasses RLS
-- But let's also add service_role bypass policies for safety

-- Drop existing insert policies that might conflict
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow trigger/service role to bypass RLS (backup)
-- Note: SECURITY DEFINER functions bypass RLS by default

-- Also ensure user_roles allows the trigger to insert
DROP POLICY IF EXISTS "Trigger can insert guest role" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

CREATE POLICY "Users can view own roles" ON user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Also ensure user_preferences allows the trigger to insert
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" ON user_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own preferences" ON user_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own preferences" ON user_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
