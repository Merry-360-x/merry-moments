-- Ensure the profile completion award also works when a user signs up and fills everything in immediately.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS profiles_award_completion_points ON public.profiles;
    CREATE TRIGGER profiles_award_completion_points
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.award_profile_completion_points();
  END IF;
END$$;

