-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic credit enforcement for higgsfield-generate.
--
-- Bug: the old check was sum-then-generate-then-insert against
-- generated_assets — not atomic. Concurrent requests near the 10-credit
-- monthly cap could all read the same pre-consumption sum and pass the
-- check, generating more paid assets than the cap allows.
--
-- Fix: the same atomic-UPSERT-with-row-lock pattern as consume_ai_credits()
-- (content-plan-generate) — a dedicated per-user/per-month counter, checked
-- and incremented in a single RPC before the provider is ever called.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.higgsfield_credit_usage (
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start  date    NOT NULL,
  credits_used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month_start)
);

-- No client policies — written exclusively through the RPC below.
ALTER TABLE public.higgsfield_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_higgsfield_credits(
  p_user_id       uuid,
  p_cost          integer,
  p_monthly_limit integer
)
RETURNS TABLE(allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date := date_trunc('month', now())::date;
  v_used  integer;
BEGIN
  IF auth.role() <> 'service_role' AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to consume credits for another user';
  END IF;

  INSERT INTO public.higgsfield_credit_usage (user_id, month_start, credits_used)
  VALUES (p_user_id, v_month, 0)
  ON CONFLICT (user_id, month_start) DO NOTHING;

  -- Lock the row for the duration of this transaction to serialize
  -- concurrent calls for the same user/month.
  SELECT credits_used INTO v_used
  FROM public.higgsfield_credit_usage
  WHERE user_id = p_user_id AND month_start = v_month
  FOR UPDATE;

  IF v_used + p_cost > p_monthly_limit THEN
    RETURN QUERY SELECT false, v_used, GREATEST(p_monthly_limit - v_used, 0);
    RETURN;
  END IF;

  UPDATE public.higgsfield_credit_usage
  SET credits_used = v_used + p_cost
  WHERE user_id = p_user_id AND month_start = v_month;

  RETURN QUERY SELECT true, (v_used + p_cost), (p_monthly_limit - v_used - p_cost);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_higgsfield_credits(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_higgsfield_credits(uuid, integer, integer) TO service_role;
