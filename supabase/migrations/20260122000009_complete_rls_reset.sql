-- Completely reset bookings RLS and ensure anon users can insert
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on bookings
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON bookings';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON TABLE bookings TO anon;
GRANT ALL ON TABLE bookings TO authenticated;

-- Create comprehensive policies
-- 1. Allow ANY user (anon or authenticated) to insert bookings
CREATE POLICY "allow_all_inserts"
ON bookings FOR INSERT
WITH CHECK (true);

-- 2. Allow authenticated users to view their own bookings
CREATE POLICY "allow_users_view_own"
ON bookings FOR SELECT
TO authenticated
USING (guest_id = auth.uid());

-- 3. Allow admins to view all bookings
CREATE POLICY "allow_admins_view_all"
ON bookings FOR SELECT
TO authenticated
USING (public.is_admin() = true);

-- 4. Allow admins to update bookings
CREATE POLICY "allow_admins_update"
ON bookings FOR UPDATE
TO authenticated
USING (public.is_admin() = true)
WITH CHECK (public.is_admin() = true);

-- 5. Allow admins to delete bookings
CREATE POLICY "allow_admins_delete"
ON bookings FOR DELETE
TO authenticated
USING (public.is_admin() = true);
