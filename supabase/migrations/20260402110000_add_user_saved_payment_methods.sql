-- Store reusable, tokenized payment methods for signed-in users.
-- Never store raw PAN or CVV values.

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at_timestamp()') IS NULL THEN
    CREATE FUNCTION public.set_updated_at_timestamp()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type text NOT NULL CHECK (method_type IN ('card', 'mobile_money')),
  provider text NOT NULL,
  display_name text,
  country_code text,
  phone_number text,
  card_brand text,
  card_last4 text,
  card_expiry text,
  provider_reference text,
  fingerprint text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_payment_methods_last4_check CHECK (
    card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_payment_methods_user_fingerprint_idx
  ON public.user_payment_methods (user_id, fingerprint);

CREATE INDEX IF NOT EXISTS user_payment_methods_user_idx
  ON public.user_payment_methods (user_id, method_type, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS user_payment_methods_default_per_type_idx
  ON public.user_payment_methods (user_id, method_type)
  WHERE is_default = true AND is_active = true;

DROP TRIGGER IF EXISTS trg_user_payment_methods_updated_at ON public.user_payment_methods;
CREATE TRIGGER trg_user_payment_methods_updated_at
  BEFORE UPDATE ON public.user_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payment methods" ON public.user_payment_methods;
CREATE POLICY "Users can read own payment methods"
  ON public.user_payment_methods
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_any_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.user_payment_methods;
CREATE POLICY "Users can insert own payment methods"
  ON public.user_payment_methods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payment methods" ON public.user_payment_methods;
CREATE POLICY "Users can update own payment methods"
  ON public.user_payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.user_payment_methods;
CREATE POLICY "Users can delete own payment methods"
  ON public.user_payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can manage payment methods" ON public.user_payment_methods;
CREATE POLICY "Staff can manage payment methods"
  ON public.user_payment_methods
  FOR ALL
  USING (public.is_any_staff(auth.uid()))
  WITH CHECK (public.is_any_staff(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payment_methods TO authenticated;
GRANT ALL ON public.user_payment_methods TO service_role;
