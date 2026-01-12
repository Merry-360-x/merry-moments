-- Add host role for kamanzisteve@gmail.com

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'kamanzisteve@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Insert host role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'host')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Added host role to kamanzisteve@gmail.com (user_id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User kamanzisteve@gmail.com not found';
  END IF;
END $$;
