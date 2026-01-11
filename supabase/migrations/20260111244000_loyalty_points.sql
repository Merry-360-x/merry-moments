-- Loyalty points: award 5 points once when profile is completed, and allow redemption for booking discounts.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_awarded BOOLEAN NOT NULL DEFAULT false;
  END IF;
END$$;

-- Award 5 points one-time when a profile becomes "complete".
CREATE OR REPLACE FUNCTION public.award_profile_completion_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_complete boolean;
BEGIN
  v_complete :=
    NEW.full_name IS NOT NULL AND length(trim(NEW.full_name)) > 0
    AND NEW.phone IS NOT NULL AND length(trim(NEW.phone)) >= 7
    AND NEW.date_of_birth IS NOT NULL;

  IF v_complete AND COALESCE(OLD.loyalty_awarded, false) = false AND COALESCE(NEW.loyalty_awarded, false) = false THEN
    NEW.loyalty_points := COALESCE(NEW.loyalty_points, 0) + 5;
    NEW.loyalty_awarded := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_award_completion_points ON public.profiles;
CREATE TRIGGER profiles_award_completion_points
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_profile_completion_points();

-- Booking fields to record discount.
DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    ALTER TABLE public.bookings
      ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;
  END IF;
END$$;

-- Redeem points for the current user (atomic).
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(p_points integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid;
  v_current integer;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN 0;
  END IF;

  SELECT loyalty_points INTO v_current
  FROM public.profiles
  WHERE user_id = v_user
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_current < p_points THEN
    RAISE EXCEPTION 'Not enough loyalty points';
  END IF;

  UPDATE public.profiles
  SET loyalty_points = loyalty_points - p_points
  WHERE user_id = v_user;

  RETURN p_points;
END;
$$;

