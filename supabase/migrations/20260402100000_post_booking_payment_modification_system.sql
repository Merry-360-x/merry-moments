-- Post-booking payments, modifications, disputes, wallet ledger, and notifications
-- This migration is additive and avoids breaking existing booking/checkout flows.

-- 1) Charges
CREATE TABLE IF NOT EXISTS public.charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('damage', 'late_fee', 'extra_service', 'upgrade', 'modification_difference')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  proof_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'disputed', 'cancelled')),
  payment_method TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  auto_charge_allowed BOOLEAN NOT NULL DEFAULT false,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charges_booking_id ON public.charges(booking_id);
CREATE INDEX IF NOT EXISTS idx_charges_user_id ON public.charges(user_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON public.charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_created_at ON public.charges(created_at DESC);

-- 2) Booking modifications
CREATE TABLE IF NOT EXISTS public.booking_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modification_type TEXT NOT NULL CHECK (modification_type IN ('date_change', 'property_change', 'alternative_offer')),
  old_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  new_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  old_check_in DATE NOT NULL,
  old_check_out DATE NOT NULL,
  new_check_in DATE,
  new_check_out DATE,
  old_price NUMERIC(12, 2) NOT NULL CHECK (old_price >= 0),
  new_price NUMERIC(12, 2) NOT NULL CHECK (new_price >= 0),
  difference NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT,
  proposal_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'refunded')),
  charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL,
  response_note TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_modifications_booking_id ON public.booking_modifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_modifications_user_id ON public.booking_modifications(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_modifications_status ON public.booking_modifications(status);
CREATE INDEX IF NOT EXISTS idx_booking_modifications_type ON public.booking_modifications(modification_type);
CREATE INDEX IF NOT EXISTS idx_booking_modifications_created_at ON public.booking_modifications(created_at DESC);

-- 3) Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.charges(id) ON DELETE SET NULL,
  booking_modification_id UUID REFERENCES public.booking_modifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'approved', 'rejected', 'settled', 'closed')),
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT disputes_target_check CHECK (
    charge_id IS NOT NULL OR booking_modification_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON public.disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON public.disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at DESC);

-- 4) Wallet accounts and transactions
CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  auto_charge_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('credit', 'debit', 'refund', 'charge_payment', 'modification_payment', 'adjustment')),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  balance_before NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference_type, reference_id);

-- 5) In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'general',
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Generic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_charges_set_updated_at ON public.charges;
CREATE TRIGGER trg_charges_set_updated_at
  BEFORE UPDATE ON public.charges
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_booking_modifications_set_updated_at ON public.booking_modifications;
CREATE TRIGGER trg_booking_modifications_set_updated_at
  BEFORE UPDATE ON public.booking_modifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_disputes_set_updated_at ON public.disputes;
CREATE TRIGGER trg_disputes_set_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_wallet_accounts_set_updated_at ON public.wallet_accounts;
CREATE TRIGGER trg_wallet_accounts_set_updated_at
  BEFORE UPDATE ON public.wallet_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Ensure wallet account exists for a user
CREATE OR REPLACE FUNCTION public.ensure_wallet_account(p_user_id UUID, p_currency TEXT DEFAULT 'USD')
RETURNS public.wallet_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.wallet_accounts;
BEGIN
  INSERT INTO public.wallet_accounts(user_id, currency)
  VALUES (p_user_id, COALESCE(NULLIF(TRIM(p_currency), ''), 'USD'))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_account
  FROM public.wallet_accounts
  WHERE user_id = p_user_id;

  RETURN v_account;
END;
$$;

-- Atomic wallet ledger operation
CREATE OR REPLACE FUNCTION public.wallet_apply_transaction(
  p_user_id UUID,
  p_tx_type TEXT,
  p_direction TEXT,
  p_amount NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.wallet_accounts;
  v_before NUMERIC(12,2);
  v_after NUMERIC(12,2);
  v_tx public.wallet_transactions;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  PERFORM public.ensure_wallet_account(p_user_id);

  SELECT * INTO v_account
  FROM public.wallet_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_before := COALESCE(v_account.balance, 0);

  IF p_direction = 'out' THEN
    IF v_before < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    v_after := v_before - p_amount;
  ELSIF p_direction = 'in' THEN
    v_after := v_before + p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid direction: %', p_direction;
  END IF;

  UPDATE public.wallet_accounts
  SET balance = v_after,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions(
    user_id,
    tx_type,
    direction,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    notes,
    metadata
  )
  VALUES (
    p_user_id,
    p_tx_type,
    p_direction,
    p_amount,
    v_before,
    v_after,
    p_reference_type,
    p_reference_id,
    p_notes,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

-- Prevent direct balance edits by end users.
CREATE OR REPLACE FUNCTION public.prevent_wallet_balance_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.user_id
     AND NOT public.is_admin()
     AND NOT public.is_any_staff(auth.uid())
     AND NEW.balance <> OLD.balance THEN
    RAISE EXCEPTION 'Direct wallet balance updates are not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_accounts_prevent_balance_tampering ON public.wallet_accounts;
CREATE TRIGGER trg_wallet_accounts_prevent_balance_tampering
  BEFORE UPDATE ON public.wallet_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_wallet_balance_tampering();

-- Tamper-safe server-side booking modification pricing
CREATE OR REPLACE FUNCTION public.calculate_booking_modification_difference(
  p_booking_id UUID,
  p_new_check_in DATE,
  p_new_check_out DATE,
  p_new_property_id UUID DEFAULT NULL
)
RETURNS TABLE (
  old_price NUMERIC,
  new_price NUMERIC,
  difference NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_old_nights INT;
  v_new_nights INT;
  v_price_per_night NUMERIC(12,2);
  v_currency TEXT;
  v_old_price NUMERIC(12,2);
  v_new_price NUMERIC(12,2);
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_old_price := COALESCE(v_booking.total_price, 0);
  v_old_nights := GREATEST((v_booking.check_out - v_booking.check_in), 1);
  v_new_nights := GREATEST((COALESCE(p_new_check_out, v_booking.check_out) - COALESCE(p_new_check_in, v_booking.check_in)), 1);

  IF p_new_property_id IS NOT NULL THEN
    SELECT COALESCE(price_per_night, 0), COALESCE(currency, v_booking.currency, 'USD')
      INTO v_price_per_night, v_currency
    FROM public.properties
    WHERE id = p_new_property_id;
  ELSIF v_booking.property_id IS NOT NULL THEN
    SELECT COALESCE(price_per_night, 0), COALESCE(currency, v_booking.currency, 'USD')
      INTO v_price_per_night, v_currency
    FROM public.properties
    WHERE id = v_booking.property_id;
  ELSE
    v_price_per_night := NULL;
    v_currency := COALESCE(v_booking.currency, 'USD');
  END IF;

  IF v_price_per_night IS NOT NULL AND v_price_per_night > 0 THEN
    v_new_price := v_price_per_night * v_new_nights;
  ELSE
    -- Fallback for tours/transport and legacy rows.
    v_new_price := CASE
      WHEN v_old_nights > 0 THEN (v_old_price / v_old_nights) * v_new_nights
      ELSE v_old_price
    END;
  END IF;

  RETURN QUERY
  SELECT
    ROUND(v_old_price, 2),
    ROUND(v_new_price, 2),
    ROUND(v_new_price - v_old_price, 2),
    COALESCE(v_currency, 'USD');
END;
$$;

-- Notification helper
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_notification_type TEXT DEFAULT 'general',
  p_channel TEXT DEFAULT 'in_app',
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications(user_id, title, body, notification_type, channel, data)
  VALUES (
    p_user_id,
    p_title,
    p_body,
    COALESCE(NULLIF(TRIM(p_notification_type), ''), 'general'),
    COALESCE(NULLIF(TRIM(p_channel), ''), 'in_app'),
    COALESCE(p_data, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- RLS
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Charges policies
DROP POLICY IF EXISTS "Users can view own charges" ON public.charges;
CREATE POLICY "Users can view own charges"
  ON public.charges
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = created_by
    OR public.is_admin()
    OR public.is_any_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Admins and staff can manage charges" ON public.charges;
CREATE POLICY "Admins and staff can manage charges"
  ON public.charges
  FOR ALL
  USING (public.is_admin() OR public.is_any_staff(auth.uid()))
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));

-- Booking modifications policies
DROP POLICY IF EXISTS "Users can view own booking modifications" ON public.booking_modifications;
CREATE POLICY "Users can view own booking modifications"
  ON public.booking_modifications
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = requested_by
    OR public.is_admin()
    OR public.is_any_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own booking modifications" ON public.booking_modifications;
CREATE POLICY "Users can create own booking modifications"
  ON public.booking_modifications
  FOR INSERT
  WITH CHECK (auth.uid() = requested_by AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can respond own pending booking modifications" ON public.booking_modifications;
CREATE POLICY "Users can respond own pending booking modifications"
  ON public.booking_modifications
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status IN ('accepted', 'rejected', 'cancelled'));

DROP POLICY IF EXISTS "Admins and staff can manage booking modifications" ON public.booking_modifications;
CREATE POLICY "Admins and staff can manage booking modifications"
  ON public.booking_modifications
  FOR ALL
  USING (public.is_admin() OR public.is_any_staff(auth.uid()))
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));

-- Disputes policies
DROP POLICY IF EXISTS "Users can view own disputes" ON public.disputes;
CREATE POLICY "Users can view own disputes"
  ON public.disputes
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = opened_by
    OR public.is_admin()
    OR public.is_any_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own disputes" ON public.disputes;
CREATE POLICY "Users can create own disputes"
  ON public.disputes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = opened_by);

DROP POLICY IF EXISTS "Admins and staff can manage disputes" ON public.disputes;
CREATE POLICY "Admins and staff can manage disputes"
  ON public.disputes
  FOR ALL
  USING (public.is_admin() OR public.is_any_staff(auth.uid()))
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));

-- Wallet policies
DROP POLICY IF EXISTS "Users can view own wallet account" ON public.wallet_accounts;
CREATE POLICY "Users can view own wallet account"
  ON public.wallet_accounts
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR public.is_any_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can update own wallet preferences" ON public.wallet_accounts;
CREATE POLICY "Users can update own wallet preferences"
  ON public.wallet_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and staff can manage wallet accounts" ON public.wallet_accounts;
CREATE POLICY "Admins and staff can manage wallet accounts"
  ON public.wallet_accounts
  FOR ALL
  USING (public.is_admin() OR public.is_any_staff(auth.uid()))
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR public.is_any_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins and staff can insert wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins and staff can insert wallet transactions"
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin() OR public.is_any_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins and staff can insert notifications" ON public.notifications;
CREATE POLICY "Admins and staff can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins and staff can manage notifications" ON public.notifications;
CREATE POLICY "Admins and staff can manage notifications"
  ON public.notifications
  FOR ALL
  USING (public.is_admin() OR public.is_any_staff(auth.uid()))
  WITH CHECK (public.is_admin() OR public.is_any_staff(auth.uid()));
