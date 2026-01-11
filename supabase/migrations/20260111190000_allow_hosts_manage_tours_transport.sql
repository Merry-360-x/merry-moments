-- Allow hosts to create/manage their own tours and transport items (no mock data).
-- Adds created_by columns and host-scoped RLS policies.

DO $$
BEGIN
  IF to_regclass('public.tours') IS NOT NULL THEN
    ALTER TABLE public.tours
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.transport_vehicles') IS NOT NULL THEN
    ALTER TABLE public.transport_vehicles
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.transport_routes') IS NOT NULL THEN
    ALTER TABLE public.transport_routes
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Tours: host policies
DO $$
BEGIN
  IF to_regclass('public.tours') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Hosts can view own tours" ON public.tours';
    EXECUTE 'CREATE POLICY "Hosts can view own tours" ON public.tours FOR SELECT USING (auth.uid() = created_by)';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can insert own tours" ON public.tours';
    EXECUTE 'CREATE POLICY "Hosts can insert own tours" ON public.tours FOR INSERT WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''host''))';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can update own tours" ON public.tours';
    EXECUTE 'CREATE POLICY "Hosts can update own tours" ON public.tours FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can delete own tours" ON public.tours';
    EXECUTE 'CREATE POLICY "Hosts can delete own tours" ON public.tours FOR DELETE USING (auth.uid() = created_by)';
  END IF;
END$$;

-- Transport vehicles: host policies
DO $$
BEGIN
  IF to_regclass('public.transport_vehicles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Hosts can view own transport vehicles" ON public.transport_vehicles';
    EXECUTE 'CREATE POLICY "Hosts can view own transport vehicles" ON public.transport_vehicles FOR SELECT USING (auth.uid() = created_by)';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can insert own transport vehicles" ON public.transport_vehicles';
    EXECUTE 'CREATE POLICY "Hosts can insert own transport vehicles" ON public.transport_vehicles FOR INSERT WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''host''))';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can update own transport vehicles" ON public.transport_vehicles';
    EXECUTE 'CREATE POLICY "Hosts can update own transport vehicles" ON public.transport_vehicles FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can delete own transport vehicles" ON public.transport_vehicles';
    EXECUTE 'CREATE POLICY "Hosts can delete own transport vehicles" ON public.transport_vehicles FOR DELETE USING (auth.uid() = created_by)';
  END IF;
END$$;

-- Transport routes: host policies
DO $$
BEGIN
  IF to_regclass('public.transport_routes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Hosts can view own transport routes" ON public.transport_routes';
    EXECUTE 'CREATE POLICY "Hosts can view own transport routes" ON public.transport_routes FOR SELECT USING (auth.uid() = created_by)';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can insert own transport routes" ON public.transport_routes';
    EXECUTE 'CREATE POLICY "Hosts can insert own transport routes" ON public.transport_routes FOR INSERT WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = ''host''))';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can update own transport routes" ON public.transport_routes';
    EXECUTE 'CREATE POLICY "Hosts can update own transport routes" ON public.transport_routes FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)';

    EXECUTE 'DROP POLICY IF EXISTS "Hosts can delete own transport routes" ON public.transport_routes';
    EXECUTE 'CREATE POLICY "Hosts can delete own transport routes" ON public.transport_routes FOR DELETE USING (auth.uid() = created_by)';
  END IF;
END$$;

