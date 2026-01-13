-- Fix role type mismatch - recreate has_role function to work with app_role enum if it exists

-- Use CREATE OR REPLACE instead of DROP to avoid dependency issues
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.role::text = p_role
  );
$$;
