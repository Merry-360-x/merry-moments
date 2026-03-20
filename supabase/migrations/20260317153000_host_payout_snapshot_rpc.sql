-- DB source-of-truth snapshot for host payout calculations.
-- This prevents UI-side timing/flicker inconsistencies when computing balances.

CREATE OR REPLACE FUNCTION public.get_host_payout_snapshot(p_host_id uuid)
RETURNS TABLE (
  net_earnings_rwf numeric,
  credits_rwf numeric,
  pending_payouts_rwf numeric,
  completed_payouts_rwf numeric,
  available_for_payout_rwf numeric,
  calculated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('admin', 'financial_staff')
  )
  INTO v_is_staff;

  IF v_uid <> p_host_id AND NOT v_is_staff THEN
    RAISE EXCEPTION 'Not allowed to read payout snapshot for this host';
  END IF;

  RETURN QUERY
  WITH eligible_bookings AS (
    SELECT
      b.booking_type,
      CASE UPPER(COALESCE(b.currency, 'RWF'))
        WHEN 'RWF' THEN COALESCE(b.total_price, 0)::numeric
        WHEN 'USD' THEN COALESCE(b.total_price, 0)::numeric * 1455.5
        WHEN 'EUR' THEN COALESCE(b.total_price, 0)::numeric * 1716.76225
        WHEN 'GBP' THEN COALESCE(b.total_price, 0)::numeric * 1972.4936
        WHEN 'KES' THEN COALESCE(b.total_price, 0)::numeric * 11.283036
        WHEN 'UGX' THEN COALESCE(b.total_price, 0)::numeric * 0.408996
        WHEN 'TZS' THEN COALESCE(b.total_price, 0)::numeric * 0.563279
        WHEN 'AED' THEN COALESCE(b.total_price, 0)::numeric * 396.323917
        ELSE COALESCE(b.total_price, 0)::numeric * 1455.5
      END AS guest_paid_rwf
    FROM public.bookings b
    WHERE b.host_id = p_host_id
      AND (
        LOWER(COALESCE(b.status::text, '')) IN ('confirmed', 'completed')
        OR LOWER(COALESCE(b.payment_status::text, '')) IN ('paid', 'completed', 'success', 'successful', 'captured')
      )
      AND LOWER(COALESCE(b.payment_status::text, '')) NOT IN ('failed', 'pending', 'unpaid', 'not_paid', 'expired', 'refunded')
      AND LOWER(COALESCE(b.payment_status::text, '')) NOT LIKE '%refund%'
  ),
  net_earnings AS (
    SELECT
      COALESCE(
        SUM(
          CASE LOWER(COALESCE(booking_type, ''))
            WHEN 'property' THEN ((guest_paid_rwf / 1.10) * 0.97)
            WHEN 'tour' THEN (guest_paid_rwf * 0.90)
            ELSE guest_paid_rwf
          END
        ),
        0
      )::numeric AS amount
    FROM eligible_bookings
  ),
  credits AS (
    SELECT
      COALESCE(
        SUM(
          CASE UPPER(COALESCE(a.currency, 'RWF'))
            WHEN 'RWF' THEN COALESCE(a.amount, 0)::numeric
            WHEN 'USD' THEN COALESCE(a.amount, 0)::numeric * 1455.5
            WHEN 'EUR' THEN COALESCE(a.amount, 0)::numeric * 1716.76225
            WHEN 'GBP' THEN COALESCE(a.amount, 0)::numeric * 1972.4936
            WHEN 'KES' THEN COALESCE(a.amount, 0)::numeric * 11.283036
            WHEN 'UGX' THEN COALESCE(a.amount, 0)::numeric * 0.408996
            WHEN 'TZS' THEN COALESCE(a.amount, 0)::numeric * 0.563279
            WHEN 'AED' THEN COALESCE(a.amount, 0)::numeric * 396.323917
            ELSE COALESCE(a.amount, 0)::numeric * 1455.5
          END
        ),
        0
      )::numeric AS amount
    FROM public.host_earnings_adjustments a
    WHERE a.host_id = p_host_id
  ),
  pending_payouts AS (
    SELECT
      COALESCE(
        SUM(
          CASE UPPER(COALESCE(p.currency, 'RWF'))
            WHEN 'RWF' THEN COALESCE(p.amount, 0)::numeric
            WHEN 'USD' THEN COALESCE(p.amount, 0)::numeric * 1455.5
            WHEN 'EUR' THEN COALESCE(p.amount, 0)::numeric * 1716.76225
            WHEN 'GBP' THEN COALESCE(p.amount, 0)::numeric * 1972.4936
            WHEN 'KES' THEN COALESCE(p.amount, 0)::numeric * 11.283036
            WHEN 'UGX' THEN COALESCE(p.amount, 0)::numeric * 0.408996
            WHEN 'TZS' THEN COALESCE(p.amount, 0)::numeric * 0.563279
            WHEN 'AED' THEN COALESCE(p.amount, 0)::numeric * 396.323917
            ELSE COALESCE(p.amount, 0)::numeric * 1455.5
          END
        ),
        0
      )::numeric AS amount
    FROM public.host_payouts p
    WHERE p.host_id = p_host_id
      AND p.status IN ('pending', 'processing')
  ),
  completed_payouts AS (
    SELECT
      COALESCE(
        SUM(
          CASE UPPER(COALESCE(p.currency, 'RWF'))
            WHEN 'RWF' THEN COALESCE(p.amount, 0)::numeric
            WHEN 'USD' THEN COALESCE(p.amount, 0)::numeric * 1455.5
            WHEN 'EUR' THEN COALESCE(p.amount, 0)::numeric * 1716.76225
            WHEN 'GBP' THEN COALESCE(p.amount, 0)::numeric * 1972.4936
            WHEN 'KES' THEN COALESCE(p.amount, 0)::numeric * 11.283036
            WHEN 'UGX' THEN COALESCE(p.amount, 0)::numeric * 0.408996
            WHEN 'TZS' THEN COALESCE(p.amount, 0)::numeric * 0.563279
            WHEN 'AED' THEN COALESCE(p.amount, 0)::numeric * 396.323917
            ELSE COALESCE(p.amount, 0)::numeric * 1455.5
          END
        ),
        0
      )::numeric AS amount
    FROM public.host_payouts p
    WHERE p.host_id = p_host_id
      AND p.status = 'completed'
  )
  SELECT
    ROUND(n.amount, 2) AS net_earnings_rwf,
    ROUND(c.amount, 2) AS credits_rwf,
    ROUND(pp.amount, 2) AS pending_payouts_rwf,
    ROUND(cp.amount, 2) AS completed_payouts_rwf,
    ROUND(GREATEST(0, n.amount + c.amount - pp.amount - cp.amount), 2) AS available_for_payout_rwf,
    now() AS calculated_at
  FROM net_earnings n
  CROSS JOIN credits c
  CROSS JOIN pending_payouts pp
  CROSS JOIN completed_payouts cp;
END;
$$;

REVOKE ALL ON FUNCTION public.get_host_payout_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_host_payout_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_host_payout_snapshot(uuid) TO service_role;
