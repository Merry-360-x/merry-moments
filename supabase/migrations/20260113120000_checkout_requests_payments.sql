-- Extend checkout_requests to support real payment flows (DPO Pay / Rwanda).
-- Idempotent: safe to run on older/newer schemas.

DO $$
BEGIN
  -- Core payment tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='mode'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN mode TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='amount'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN amount NUMERIC NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='currency'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN currency TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='payment_provider'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN payment_provider TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='payment_status'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='provider_token'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN provider_token TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='provider_reference'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN provider_reference TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='payment_url'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN payment_url TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='paid_at'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='checkout_requests' AND column_name='meta'
  ) THEN
    ALTER TABLE public.checkout_requests ADD COLUMN meta JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

