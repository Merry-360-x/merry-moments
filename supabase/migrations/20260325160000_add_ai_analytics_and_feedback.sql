CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'mobile', 'server')),
  total_requests integer NOT NULL DEFAULT 0,
  total_openai_requests integer NOT NULL DEFAULT 0,
  total_cache_hits integer NOT NULL DEFAULT 0,
  total_faq_hits integer NOT NULL DEFAULT 0,
  total_rate_limited integer NOT NULL DEFAULT 0,
  total_errors integer NOT NULL DEFAULT 0,
  last_source text NULL CHECK (last_source IN ('faq', 'cache', 'openai', 'rate_limit', 'error')),
  last_model text NULL,
  feedback_type text NULL CHECK (feedback_type IN ('up', 'down')),
  rating_comment text NULL,
  rated_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_interaction_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_conversations_session_channel_uidx
  ON public.ai_conversations(session_id, channel);

CREATE INDEX IF NOT EXISTS ai_conversations_user_created_idx
  ON public.ai_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_conversations_rated_at_idx
  ON public.ai_conversations(rated_at DESC)
  WHERE feedback_type IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NULL REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'mobile', 'server')),
  source text NOT NULL CHECK (source IN ('faq', 'cache', 'openai', 'rate_limit', 'error')),
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'limited', 'failed')),
  model text NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  latency_ms integer NULL,
  user_message text NULL,
  normalized_key text NULL,
  recommendations_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_created_at_idx
  ON public.ai_usage_events(created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_source_created_at_idx
  ON public.ai_usage_events(source, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_session_created_at_idx
  ON public.ai_usage_events(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  identity_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  cache_key text PRIMARY KEY,
  reply text NOT NULL,
  source_model text NULL,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_hit_at timestamptz NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_response_cache_expires_at_idx
  ON public.ai_response_cache(expires_at ASC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_rate_limits_updated_at ON public.ai_rate_limits;
CREATE TRIGGER trg_ai_rate_limits_updated_at
  BEFORE UPDATE ON public.ai_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_response_cache_updated_at ON public.ai_response_cache;
CREATE TRIGGER trg_ai_response_cache_updated_at
  BEFORE UPDATE ON public.ai_response_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.ai_consume_rate_limit(
  p_identity_key text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 300
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window interval := make_interval(secs => GREATEST(p_window_seconds, 60));
  v_row public.ai_rate_limits%ROWTYPE;
  v_next_count integer;
BEGIN
  IF coalesce(trim(p_identity_key), '') = '' THEN
    RETURN QUERY SELECT true, GREATEST(p_max_requests - 1, 0), 0;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.ai_rate_limits
  WHERE identity_key = p_identity_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_rate_limits (identity_key, window_started_at, request_count, blocked_until)
    VALUES (p_identity_key, v_now, 1, NULL);

    RETURN QUERY SELECT true, GREATEST(p_max_requests - 1, 0), 0;
    RETURN;
  END IF;

  IF v_row.window_started_at <= v_now - v_window THEN
    UPDATE public.ai_rate_limits
    SET window_started_at = v_now,
        request_count = 1,
        blocked_until = NULL,
        updated_at = v_now
    WHERE identity_key = p_identity_key;

    RETURN QUERY SELECT true, GREATEST(p_max_requests - 1, 0), 0;
    RETURN;
  END IF;

  IF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    RETURN QUERY
    SELECT false, 0, GREATEST(CEIL(EXTRACT(EPOCH FROM (v_row.blocked_until - v_now)))::integer, 1);
    RETURN;
  END IF;

  v_next_count := v_row.request_count + 1;

  IF v_next_count > p_max_requests THEN
    UPDATE public.ai_rate_limits
    SET blocked_until = v_row.window_started_at + v_window,
        request_count = v_row.request_count,
        updated_at = v_now
    WHERE identity_key = p_identity_key;

    RETURN QUERY
    SELECT false, 0, GREATEST(CEIL(EXTRACT(EPOCH FROM ((v_row.window_started_at + v_window) - v_now)))::integer, 1);
    RETURN;
  END IF;

  UPDATE public.ai_rate_limits
  SET request_count = v_next_count,
      blocked_until = NULL,
      updated_at = v_now
  WHERE identity_key = p_identity_key;

  RETURN QUERY SELECT true, GREATEST(p_max_requests - v_next_count, 0), 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_cache_get(p_cache_key text)
RETURNS TABLE (
  reply text,
  source_model text,
  hit_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(trim(p_cache_key), '') = '' THEN
    RETURN;
  END IF;

  DELETE FROM public.ai_response_cache
  WHERE cache_key = p_cache_key
    AND expires_at <= now();

  RETURN QUERY
  UPDATE public.ai_response_cache
  SET hit_count = ai_response_cache.hit_count + 1,
      last_hit_at = now(),
      updated_at = now()
  WHERE cache_key = p_cache_key
    AND expires_at > now()
  RETURNING ai_response_cache.reply, ai_response_cache.source_model, ai_response_cache.hit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_cache_set(
  p_cache_key text,
  p_reply text,
  p_source_model text DEFAULT NULL,
  p_ttl_seconds integer DEFAULT 600
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(trim(p_cache_key), '') = '' OR coalesce(trim(p_reply), '') = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.ai_response_cache (cache_key, reply, source_model, expires_at, last_hit_at)
  VALUES (
    p_cache_key,
    p_reply,
    p_source_model,
    now() + make_interval(secs => GREATEST(p_ttl_seconds, 60)),
    now()
  )
  ON CONFLICT (cache_key) DO UPDATE
  SET reply = EXCLUDED.reply,
      source_model = EXCLUDED.source_model,
      expires_at = EXCLUDED.expires_at,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ai_analytics_summary(p_days integer DEFAULT 30)
RETURNS TABLE (
  total_requests integer,
  openai_requests integer,
  cache_hits integer,
  faq_hits integer,
  rate_limited_requests integer,
  error_requests integer,
  conversations_total integer,
  feedback_count integer,
  positive_feedback integer,
  negative_feedback integer,
  win_rate numeric,
  estimated_cost_usd numeric,
  estimated_saved_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_at timestamptz := now() - make_interval(days => GREATEST(p_days, 1));
BEGIN
  PERFORM public._require_admin();

  RETURN QUERY
  WITH usage_recent AS (
    SELECT *
    FROM public.ai_usage_events
    WHERE created_at >= v_start_at
  ),
  conv_recent AS (
    SELECT *
    FROM public.ai_conversations
    WHERE created_at >= v_start_at
       OR updated_at >= v_start_at
       OR rated_at >= v_start_at
  ),
  usage_agg AS (
    SELECT
      COUNT(*)::integer AS total_requests,
      COUNT(*) FILTER (WHERE source = 'openai')::integer AS openai_requests,
      COUNT(*) FILTER (WHERE source = 'cache')::integer AS cache_hits,
      COUNT(*) FILTER (WHERE source = 'faq')::integer AS faq_hits,
      COUNT(*) FILTER (WHERE source = 'rate_limit')::integer AS rate_limited_requests,
      COUNT(*) FILTER (WHERE source = 'error')::integer AS error_requests,
      COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,6) AS estimated_cost_usd,
      COALESCE(AVG(NULLIF(estimated_cost_usd, 0)) FILTER (WHERE source = 'openai'), 0)::numeric(12,6) AS avg_openai_cost
    FROM usage_recent
  ),
  feedback_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE feedback_type IS NOT NULL)::integer AS feedback_count,
      COUNT(*) FILTER (WHERE feedback_type = 'up')::integer AS positive_feedback,
      COUNT(*) FILTER (WHERE feedback_type = 'down')::integer AS negative_feedback
    FROM conv_recent
  ),
  convo_agg AS (
    SELECT COUNT(*)::integer AS conversations_total
    FROM conv_recent
  )
  SELECT
    usage_agg.total_requests,
    usage_agg.openai_requests,
    usage_agg.cache_hits,
    usage_agg.faq_hits,
    usage_agg.rate_limited_requests,
    usage_agg.error_requests,
    convo_agg.conversations_total,
    feedback_agg.feedback_count,
    feedback_agg.positive_feedback,
    feedback_agg.negative_feedback,
    CASE
      WHEN feedback_agg.feedback_count > 0
        THEN ROUND((feedback_agg.positive_feedback::numeric * 100.0) / feedback_agg.feedback_count, 1)
      ELSE 0
    END AS win_rate,
    usage_agg.estimated_cost_usd,
    ROUND(((usage_agg.cache_hits + usage_agg.faq_hits)::numeric * usage_agg.avg_openai_cost), 6) AS estimated_saved_usd
  FROM usage_agg
  CROSS JOIN feedback_agg
  CROSS JOIN convo_agg;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ai_analytics_series(p_days integer DEFAULT 30)
RETURNS TABLE (
  bucket_date date,
  total_requests integer,
  openai_requests integer,
  cache_hits integer,
  faq_hits integer,
  rate_limited_requests integer,
  error_requests integer,
  positive_feedback integer,
  negative_feedback integer,
  estimated_cost_usd numeric,
  estimated_saved_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := GREATEST(p_days, 1);
  v_start_at timestamptz := date_trunc('day', now() - make_interval(days => v_days - 1));
BEGIN
  PERFORM public._require_admin();

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(v_start_at::date, now()::date, interval '1 day')::date AS bucket_date
  ),
  usage_daily AS (
    SELECT
      created_at::date AS bucket_date,
      COUNT(*)::integer AS total_requests,
      COUNT(*) FILTER (WHERE source = 'openai')::integer AS openai_requests,
      COUNT(*) FILTER (WHERE source = 'cache')::integer AS cache_hits,
      COUNT(*) FILTER (WHERE source = 'faq')::integer AS faq_hits,
      COUNT(*) FILTER (WHERE source = 'rate_limit')::integer AS rate_limited_requests,
      COUNT(*) FILTER (WHERE source = 'error')::integer AS error_requests,
      COALESCE(SUM(estimated_cost_usd), 0)::numeric(12,6) AS estimated_cost_usd,
      COALESCE(AVG(NULLIF(estimated_cost_usd, 0)) FILTER (WHERE source = 'openai'), 0)::numeric(12,6) AS avg_openai_cost
    FROM public.ai_usage_events
    WHERE created_at >= v_start_at
    GROUP BY created_at::date
  ),
  feedback_daily AS (
    SELECT
      rated_at::date AS bucket_date,
      COUNT(*) FILTER (WHERE feedback_type = 'up')::integer AS positive_feedback,
      COUNT(*) FILTER (WHERE feedback_type = 'down')::integer AS negative_feedback
    FROM public.ai_conversations
    WHERE rated_at >= v_start_at
      AND feedback_type IS NOT NULL
    GROUP BY rated_at::date
  )
  SELECT
    days.bucket_date,
    COALESCE(usage_daily.total_requests, 0) AS total_requests,
    COALESCE(usage_daily.openai_requests, 0) AS openai_requests,
    COALESCE(usage_daily.cache_hits, 0) AS cache_hits,
    COALESCE(usage_daily.faq_hits, 0) AS faq_hits,
    COALESCE(usage_daily.rate_limited_requests, 0) AS rate_limited_requests,
    COALESCE(usage_daily.error_requests, 0) AS error_requests,
    COALESCE(feedback_daily.positive_feedback, 0) AS positive_feedback,
    COALESCE(feedback_daily.negative_feedback, 0) AS negative_feedback,
    COALESCE(usage_daily.estimated_cost_usd, 0)::numeric(12,6) AS estimated_cost_usd,
    ROUND(((COALESCE(usage_daily.cache_hits, 0) + COALESCE(usage_daily.faq_hits, 0))::numeric * COALESCE(usage_daily.avg_openai_cost, 0)), 6) AS estimated_saved_usd
  FROM days
  LEFT JOIN usage_daily ON usage_daily.bucket_date = days.bucket_date
  LEFT JOIN feedback_daily ON feedback_daily.bucket_date = days.bucket_date
  ORDER BY days.bucket_date ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_consume_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_cache_get(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ai_cache_set(text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_analytics_summary(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_analytics_series(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ai_consume_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_cache_get(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_cache_set(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_summary(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_series(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_series(integer) TO service_role;

NOTIFY pgrst, 'reload schema';