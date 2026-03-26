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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT now() - make_interval(days => GREATEST(p_days, 1)) AS start_at
  ),
  usage_recent AS (
    SELECT e.*
    FROM public.ai_usage_events e
    CROSS JOIN params p
    WHERE e.created_at >= p.start_at
  ),
  conv_recent AS (
    SELECT c.*
    FROM public.ai_conversations c
    CROSS JOIN params p
    WHERE c.created_at >= p.start_at
       OR c.updated_at >= p.start_at
       OR c.rated_at >= p.start_at
  ),
  usage_agg AS (
    SELECT
      COUNT(*)::integer AS total_requests,
      COUNT(*) FILTER (WHERE e.source = 'openai')::integer AS openai_requests,
      COUNT(*) FILTER (WHERE e.source = 'cache')::integer AS cache_hits,
      COUNT(*) FILTER (WHERE e.source = 'faq')::integer AS faq_hits,
      COUNT(*) FILTER (WHERE e.source = 'rate_limit')::integer AS rate_limited_requests,
      COUNT(*) FILTER (WHERE e.source = 'error')::integer AS error_requests,
      COALESCE(SUM(e.estimated_cost_usd), 0)::numeric(12,6) AS estimated_cost_usd,
      COALESCE(AVG(NULLIF(e.estimated_cost_usd, 0)) FILTER (WHERE e.source = 'openai'), 0)::numeric(12,6) AS avg_openai_cost
    FROM usage_recent e
  ),
  feedback_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE c.feedback_type IS NOT NULL)::integer AS feedback_count,
      COUNT(*) FILTER (WHERE c.feedback_type = 'up')::integer AS positive_feedback,
      COUNT(*) FILTER (WHERE c.feedback_type = 'down')::integer AS negative_feedback
    FROM conv_recent c
  ),
  convo_agg AS (
    SELECT COUNT(*)::integer AS conversations_total
    FROM conv_recent
  )
  SELECT
    u.total_requests,
    u.openai_requests,
    u.cache_hits,
    u.faq_hits,
    u.rate_limited_requests,
    u.error_requests,
    c.conversations_total,
    f.feedback_count,
    f.positive_feedback,
    f.negative_feedback,
    CASE
      WHEN f.feedback_count > 0
        THEN ROUND((f.positive_feedback::numeric * 100.0) / f.feedback_count, 1)
      ELSE 0
    END AS win_rate,
    u.estimated_cost_usd,
    ROUND(((u.cache_hits + u.faq_hits)::numeric * u.avg_openai_cost), 6) AS estimated_saved_usd
  FROM usage_agg u
  CROSS JOIN feedback_agg f
  CROSS JOIN convo_agg c;
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      GREATEST(p_days, 1) AS safe_days,
      date_trunc('day', now() - make_interval(days => GREATEST(p_days, 1) - 1))::date AS start_date,
      now()::date AS end_date
  ),
  days AS (
    SELECT generate_series(p.start_date, p.end_date, interval '1 day')::date AS bucket_date
    FROM params p
  ),
  usage_daily AS (
    SELECT
      e.created_at::date AS bucket_date,
      COUNT(*)::integer AS total_requests,
      COUNT(*) FILTER (WHERE e.source = 'openai')::integer AS openai_requests,
      COUNT(*) FILTER (WHERE e.source = 'cache')::integer AS cache_hits,
      COUNT(*) FILTER (WHERE e.source = 'faq')::integer AS faq_hits,
      COUNT(*) FILTER (WHERE e.source = 'rate_limit')::integer AS rate_limited_requests,
      COUNT(*) FILTER (WHERE e.source = 'error')::integer AS error_requests,
      COALESCE(SUM(e.estimated_cost_usd), 0)::numeric(12,6) AS estimated_cost_usd,
      COALESCE(AVG(NULLIF(e.estimated_cost_usd, 0)) FILTER (WHERE e.source = 'openai'), 0)::numeric(12,6) AS avg_openai_cost
    FROM public.ai_usage_events e
    CROSS JOIN params p
    WHERE e.created_at >= p.start_date
    GROUP BY e.created_at::date
  ),
  feedback_daily AS (
    SELECT
      c.rated_at::date AS bucket_date,
      COUNT(*) FILTER (WHERE c.feedback_type = 'up')::integer AS positive_feedback,
      COUNT(*) FILTER (WHERE c.feedback_type = 'down')::integer AS negative_feedback
    FROM public.ai_conversations c
    CROSS JOIN params p
    WHERE c.rated_at >= p.start_date
      AND c.feedback_type IS NOT NULL
    GROUP BY c.rated_at::date
  )
  SELECT
    d.bucket_date,
    COALESCE(u.total_requests, 0) AS total_requests,
    COALESCE(u.openai_requests, 0) AS openai_requests,
    COALESCE(u.cache_hits, 0) AS cache_hits,
    COALESCE(u.faq_hits, 0) AS faq_hits,
    COALESCE(u.rate_limited_requests, 0) AS rate_limited_requests,
    COALESCE(u.error_requests, 0) AS error_requests,
    COALESCE(f.positive_feedback, 0) AS positive_feedback,
    COALESCE(f.negative_feedback, 0) AS negative_feedback,
    COALESCE(u.estimated_cost_usd, 0)::numeric(12,6) AS estimated_cost_usd,
    ROUND(((COALESCE(u.cache_hits, 0) + COALESCE(u.faq_hits, 0))::numeric * COALESCE(u.avg_openai_cost, 0)), 6) AS estimated_saved_usd
  FROM days d
  LEFT JOIN usage_daily u ON u.bucket_date = d.bucket_date
  LEFT JOIN feedback_daily f ON f.bucket_date = d.bucket_date
  ORDER BY d.bucket_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_summary(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_series(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_analytics_series(integer) TO service_role;

NOTIFY pgrst, 'reload schema';
