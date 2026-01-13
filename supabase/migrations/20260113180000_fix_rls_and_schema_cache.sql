-- Ensure RLS is enabled on key tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for properties to ensure they work
DROP POLICY IF EXISTS "Public can view published properties" ON properties;
CREATE POLICY "Public can view published properties" ON properties
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Hosts can manage own properties" ON properties;
CREATE POLICY "Hosts can manage own properties" ON properties
  FOR ALL USING (auth.uid() = host_id);

-- Drop and recreate RLS policies for user_roles  
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure profiles are accessible
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
