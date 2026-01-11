-- Auto-approve host applications by default and sync host role.
-- Rule: When host_applications.status = 'approved' → user has host role.
-- Otherwise (e.g. 'suspended' / 'rejected') → host role removed.

DO $$
BEGIN
  IF to_regclass('public.host_applications') IS NOT NULL THEN
    ALTER TABLE public.host_applications
      ALTER COLUMN status SET DEFAULT 'approved';
  END IF;
END$$;

-- Ensure role table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sync_host_role_from_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only manage host role; other roles are untouched.
  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'host')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role = 'host';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.host_applications') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'sync_host_role_from_application'
    ) THEN
      CREATE TRIGGER sync_host_role_from_application
      AFTER INSERT OR UPDATE OF status ON public.host_applications
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_host_role_from_application();
    END IF;
  END IF;
END$$;

-- Backfill: ensure existing approved applications have host role
DO $$
BEGIN
  IF to_regclass('public.host_applications') IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT ha.user_id, 'host'
    FROM public.host_applications ha
    WHERE ha.status = 'approved'
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove host role for non-approved applications (suspended/rejected/etc)
    DELETE FROM public.user_roles ur
    WHERE ur.role = 'host'
      AND EXISTS (
        SELECT 1
        FROM public.host_applications ha
        WHERE ha.user_id = ur.user_id
          AND ha.status <> 'approved'
      );
  END IF;
END$$;

