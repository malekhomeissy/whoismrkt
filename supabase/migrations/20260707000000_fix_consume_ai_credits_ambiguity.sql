-- ─────────────────────────────────────────────────────────────────────────────
-- Fix consume_ai_credits(): "column reference is_pro is ambiguous"
--
-- RETURNS TABLE(allowed boolean, remaining integer, is_pro boolean) implicitly
-- declares `is_pro` as an output variable in the function's own scope.
-- The original body's `SELECT total_credits, used_credits, reset_at, is_pro
-- FROM public.ai_credits ...` referenced the bare column name `is_pro`, which
-- collided with that output variable. PL/pgSQL's default
-- variable_conflict = error setting raises "column reference is_pro is
-- ambiguous" at runtime instead of silently misbinding — confirmed live via
-- the content-plan-generate edge function, which caught this as an RPC error
-- and correctly failed closed (returning 503 "Unable to verify AI credits"),
-- but that meant content-plan-generate was 100% unusable in production.
--
-- Fix: alias the table and fully qualify every column reference so there's
-- no ambiguity with the output parameter names. No change to the function's
-- public signature (callers already destructure allowed/remaining/is_pro).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consume_ai_credits(
  p_user_id uuid,
  p_cost    integer
)
RETURNS TABLE(allowed boolean, remaining integer, is_pro boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   integer;
  v_used    integer;
  v_reset   timestamptz;
  v_is_pro  boolean;
BEGIN
  -- Ensure a row exists for first-time users
  INSERT INTO public.ai_credits (user_id, total_credits, used_credits, reset_at, is_pro)
  VALUES (p_user_id, 200, 0, now() + interval '1 month', false)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for the duration of this transaction to serialize concurrent calls
  SELECT ac.total_credits, ac.used_credits, ac.reset_at, ac.is_pro
    INTO v_total, v_used, v_reset, v_is_pro
    FROM public.ai_credits ac
    WHERE ac.user_id = p_user_id
    FOR UPDATE;

  -- Monthly reset if due
  IF v_reset IS NOT NULL AND v_reset < now() THEN
    v_used  := 0;
    v_reset := now() + interval '1 month';
    UPDATE public.ai_credits
      SET used_credits = 0, reset_at = v_reset
      WHERE user_id = p_user_id;
  END IF;

  IF v_is_pro THEN
    RETURN QUERY SELECT true, (v_total - v_used), true;
    RETURN;
  END IF;

  IF (v_total - v_used) < p_cost THEN
    RETURN QUERY SELECT false, (v_total - v_used), false;
    RETURN;
  END IF;

  UPDATE public.ai_credits
    SET used_credits = v_used + p_cost
    WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, (v_total - v_used - p_cost), false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_credits(uuid, integer) TO service_role;
