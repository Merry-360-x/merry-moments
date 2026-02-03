-- Create RPC function to add host role to the current user
-- This is called after a successful host application

CREATE OR REPLACE FUNCTION public.become_host()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_approved_app boolean;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user has an approved host application
  SELECT EXISTS (
    SELECT 1 FROM host_applications 
    WHERE user_id = v_user_id 
    AND status = 'approved'
  ) INTO v_has_approved_app;
  
  IF NOT v_has_approved_app THEN
    RAISE EXCEPTION 'No approved host application found';
  END IF;
  
  -- Add host role if not already exists
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'host')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.become_host() TO authenticated;
