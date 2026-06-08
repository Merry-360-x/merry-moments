-- Security hardening: ensure Row-Level Security is enabled on every
-- user-created table in the public schema.
--
-- Supabase Security Advisor flagged rls_disabled_in_public.
-- Running ENABLE ROW LEVEL SECURITY on a table that already has it is a
-- safe no-op, so this migration is fully idempotent.
--
-- Tables that already have RLS + policies are unaffected.
-- Any table without existing policies will become inaccessible to all
-- roles after this migration (secure-by-default), so explicit policies
-- must exist before this migration runs — all app tables already have them.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'           -- regular tables only
      AND NOT c.relrowsecurity       -- RLS currently disabled
      AND c.relname NOT LIKE 'pg_%' -- skip any accidental pg_ tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
    RAISE NOTICE 'Enabled RLS on public.%', tbl.table_name;
  END LOOP;
END $$;

-- ── Explicit per-table enables for all known app tables ─────────────────────
-- Belt-and-suspenders: also enable explicitly so the migration is auditable
-- even if the dynamic block above already handled them.

ALTER TABLE IF EXISTS public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.host_applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.properties             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tours                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tour_packages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transport_vehicles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transport_routes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checkout_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_likes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_custom_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trip_cart_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_ticket_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.incident_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blacklist              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manual_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_banners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_referrals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_commissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_payouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_points         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.host_payouts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.host_payout_methods    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.airport_transfer_routes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.airport_transfer_pricing  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.web_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_usage_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_rate_limits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_response_cache      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.charges                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_modifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disputes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_payment_methods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mobile_push_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.host_follows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.direct_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.form_drafts            ENABLE ROW LEVEL SECURITY;
