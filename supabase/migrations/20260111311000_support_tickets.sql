-- Support tickets (Customer Support) - real data, no placeholders.

-- Ensure role helpers exist (some remote DBs may not have these yet).
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NULL THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, role)
    );
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regprocedure('public.has_role(uuid,text)') IS NULL THEN
    CREATE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = p_user_id AND ur.role = p_role
      );
    $fn$;
  END IF;
END$$;

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NULL THEN
    CREATE TABLE public.support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      category TEXT NOT NULL DEFAULT 'general',
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END$$;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- User can create their own tickets.
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
CREATE POLICY "Users can create support tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- User can read their own tickets.
DROP POLICY IF EXISTS "Users can read own support tickets" ON public.support_tickets;
CREATE POLICY "Users can read own support tickets"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Admin/staff can read all tickets.
DROP POLICY IF EXISTS "Admin/staff can read support tickets" ON public.support_tickets;
CREATE POLICY "Admin/staff can read support tickets"
  ON public.support_tickets
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Admin/staff can update ticket status.
DROP POLICY IF EXISTS "Admin/staff can update support tickets" ON public.support_tickets;
CREATE POLICY "Admin/staff can update support tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

