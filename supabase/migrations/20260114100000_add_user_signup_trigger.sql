-- Add trigger to automatically create profile and guest role on user signup

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Give user the default 'guest' role
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (NEW.id, 'guest', NOW())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create default preferences
  INSERT INTO public.user_preferences (user_id, theme, locale, currency, created_at, updated_at)
  VALUES (NEW.id, 'light', 'en', 'RWF', NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
