-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic daily quota tracking for ai-router.
--
-- Bug: ai-router's old checkDailyLimit() counted rows in ai_requests and
-- compared to a limit, but the increment happened later via a fire-and-forget
-- insert inside callAI()'s log(). Firing N concurrent requests let all N read
-- the same pre-increment count, exceeding the daily cap by roughly the burst
-- size, with no per-minute backstop to limit the damage.
--
-- Fix: a single-statement UPSERT (INSERT ... ON CONFLICT ... DO UPDATE
-- ... RETURNING) is atomic under Postgres's row-level locking — no explicit
-- FOR UPDATE needed, the same guarantee consume_ai_credits() relies on.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_router_daily_usage (
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      text    NOT NULL,
  usage_date    date    NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, provider, usage_date)
);

-- No client policies — this table is written exclusively through the
-- SECURITY DEFINER RPC below, mirroring creator_oauth_tokens/system_config.
ALTER TABLE public.ai_router_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_router_quota(
  p_user_id     uuid,
  p_provider    text,
  p_daily_limit integer
)
RETURNS TABLE(allowed boolean, used integer, quota_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.role() <> 'service_role' AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to check quota for another user';
  END IF;

  INSERT INTO public.ai_router_daily_usage (user_id, provider, usage_date, request_count)
  VALUES (p_user_id, p_provider, CURRENT_DATE, 1)
  ON CONFLICT (user_id, provider, usage_date)
  DO UPDATE SET request_count = public.ai_router_daily_usage.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT (v_count <= p_daily_limit), v_count, p_daily_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_router_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_and_increment_ai_router_quota(uuid, text, integer) TO service_role;
