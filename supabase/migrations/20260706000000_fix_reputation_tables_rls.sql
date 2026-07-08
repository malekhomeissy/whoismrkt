-- ─────────────────────────────────────────────────────────────────────────────
-- Critical fix: reputation/matching tables were writable by any authenticated
-- user (policies used USING (true) / WITH CHECK (true) with no role
-- restriction). This let any logged-in creator or business overwrite their
-- own — or a competitor's — trust score, visibility score, or match score
-- directly via the REST API (PostgREST honors permissive policies for the
-- `authenticated` role unless scoped with `TO service_role`).
--
-- Fix pattern mirrors 20260630000000_fix_ai_credits_rls.sql: drop the
-- permissive policy, recreate it scoped to `service_role` only, and revoke
-- direct table grants from `authenticated` as defense-in-depth. Reads are
-- left untouched — only writes were exploitable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. creator_trust_scores ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "System inserts trust scores" ON public.creator_trust_scores;
DROP POLICY IF EXISTS "System updates trust scores" ON public.creator_trust_scores;

CREATE POLICY "Service role inserts trust scores"
  ON public.creator_trust_scores FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates trust scores"
  ON public.creator_trust_scores FOR UPDATE
  TO service_role
  USING (true);

REVOKE INSERT, UPDATE ON public.creator_trust_scores FROM authenticated;

-- ── 2. business_trust_scores ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "System inserts business trust scores" ON public.business_trust_scores;
DROP POLICY IF EXISTS "System updates business trust scores" ON public.business_trust_scores;

CREATE POLICY "Service role inserts business trust scores"
  ON public.business_trust_scores FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates business trust scores"
  ON public.business_trust_scores FOR UPDATE
  TO service_role
  USING (true);

REVOKE INSERT, UPDATE ON public.business_trust_scores FROM authenticated;

-- ── 3. match_score_cache ──────────────────────────────────────────────────────
-- (server-computed cache written by compute-match-score edge function only)

DROP POLICY IF EXISTS "Service role manages match score cache" ON public.match_score_cache;

CREATE POLICY "Service role manages match score cache"
  ON public.match_score_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.match_score_cache FROM authenticated;

-- ── 4. creator_visibility_scores ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Service manages visibility scores" ON public.creator_visibility_scores;

CREATE POLICY "Service role manages visibility scores"
  ON public.creator_visibility_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.creator_visibility_scores FROM authenticated;

-- ── 5. creator_daily_metrics ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service manages creator daily metrics" ON public.creator_daily_metrics;

CREATE POLICY "Service role manages creator daily metrics"
  ON public.creator_daily_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.creator_daily_metrics FROM authenticated;

-- ── 6. business_daily_metrics ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service manages business daily metrics" ON public.business_daily_metrics;

CREATE POLICY "Service role manages business daily metrics"
  ON public.business_daily_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.business_daily_metrics FROM authenticated;

-- ── 7. match_scores ────────────────────────────────────────────────────────────
-- This table is intentionally populated client-side (score computed in the
-- browser via src/lib/matchScore.ts, then cached here). We can't remove client
-- writes without moving computation server-side (tracked as a follow-up), but
-- the previous policy only checked `auth.uid() IS NOT NULL` — ANY logged-in
-- user could upsert a score row for a creator/campaign pair they have nothing
-- to do with. Tighten to require the caller actually owns one side of the pair.

DROP POLICY IF EXISTS "Authenticated upsert scores" ON public.match_scores;
DROP POLICY IF EXISTS "Authenticated update scores" ON public.match_scores;

CREATE POLICY "Owner inserts own match scores"
  ON public.match_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = match_scores.campaign_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = match_scores.creator_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner updates own match scores"
  ON public.match_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = match_scores.campaign_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = match_scores.creator_id AND cp.user_id = auth.uid()
    )
  );

-- ── 8. Atomic, fail-closed server-side AI credit consumption ─────────────────
-- Backs the new server-side credit check added to content-plan-generate.
-- SECURITY DEFINER + row lock (implicit via UPDATE) makes check-and-deduct
-- atomic, closing the race window that existed in the old client-side
-- deductCredits() (which was also unreachable anyway — see fix_ai_credits_rls
-- REVOKE UPDATE ... FROM authenticated).

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
  SELECT total_credits, used_credits, reset_at, is_pro
    INTO v_total, v_used, v_reset, v_is_pro
    FROM public.ai_credits
    WHERE user_id = p_user_id
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
