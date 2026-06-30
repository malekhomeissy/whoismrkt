-- ─────────────────────────────────────────────────────────────────────────────
-- MRKT Intelligence Layer
--
-- Transforms MRKT from a static marketplace into a learning system.
--
-- This migration creates:
--   1. creator_trust_scores    — computed reputation score per creator
--   2. business_trust_scores   — computed reputation score per business
--   3. match_outcomes          — records what happened with each AI match rec
--   4. compute_creator_trust_score() — PL/pgSQL function, recomputes on demand
--   5. compute_business_trust_score()
--   6. Triggers that auto-sync scores when data changes
--
-- Trust Score formula:
--   Creator:  completion(35) + rating(25) + approval(20) + repeat_biz(15) + xp(5)
--   Business: payments(30) + rating(25) + completion(25) + repeat_creator(15) + xp(5)
--   New users start at 50 (neutral). History raises or lowers it.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. creator_trust_scores ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_trust_scores (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_profile_id  uuid        REFERENCES public.creator_profiles(id) ON DELETE CASCADE,

  -- Composite score (0–100)
  score               integer     NOT NULL DEFAULT 50
                                    CHECK (score BETWEEN 0 AND 100),
  tier                text        NOT NULL DEFAULT 'new'
                                    CHECK (tier IN ('new','rising','trusted','elite')),

  -- Score components (0–100 each)
  completion_rate     numeric(5,2) NOT NULL DEFAULT 0,
  approval_rate       numeric(5,2) NOT NULL DEFAULT 100,
  avg_rating          numeric(3,2) NOT NULL DEFAULT 0,
  repeat_rate         numeric(5,2) NOT NULL DEFAULT 0,
  total_campaigns     integer      NOT NULL DEFAULT 0,
  total_reviews       integer      NOT NULL DEFAULT 0,

  last_computed_at    timestamptz  NOT NULL DEFAULT now(),
  created_at          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT creator_trust_scores_user_unique UNIQUE (user_id)
);

ALTER TABLE public.creator_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read creator trust scores"
  ON public.creator_trust_scores FOR SELECT
  USING (true);

CREATE POLICY "System inserts trust scores"
  ON public.creator_trust_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System updates trust scores"
  ON public.creator_trust_scores FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS creator_trust_scores_score_idx
  ON public.creator_trust_scores (score DESC);

CREATE INDEX IF NOT EXISTS creator_trust_scores_tier_idx
  ON public.creator_trust_scores (tier);

-- ── 2. business_trust_scores ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_trust_scores (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_profile_id  uuid        REFERENCES public.business_profiles(id) ON DELETE CASCADE,

  score                integer     NOT NULL DEFAULT 50
                                     CHECK (score BETWEEN 0 AND 100),
  tier                 text        NOT NULL DEFAULT 'new'
                                     CHECK (tier IN ('new','rising','trusted','elite')),

  payment_rate         numeric(5,2) NOT NULL DEFAULT 0,
  contract_completion  numeric(5,2) NOT NULL DEFAULT 0,
  avg_rating_given     numeric(3,2) NOT NULL DEFAULT 0,
  repeat_creator_rate  numeric(5,2) NOT NULL DEFAULT 0,
  total_campaigns      integer      NOT NULL DEFAULT 0,
  total_reviews_given  integer      NOT NULL DEFAULT 0,

  last_computed_at     timestamptz  NOT NULL DEFAULT now(),
  created_at           timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT business_trust_scores_user_unique UNIQUE (user_id)
);

ALTER TABLE public.business_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business trust scores"
  ON public.business_trust_scores FOR SELECT
  USING (true);

CREATE POLICY "System inserts business trust scores"
  ON public.business_trust_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System updates business trust scores"
  ON public.business_trust_scores FOR UPDATE
  USING (true);

-- ── 3. match_outcomes ────────────────────────────────────────────────────────
-- Records the fate of each AI match recommendation.
-- Powers future learning: which signals actually predicted success.

CREATE TABLE IF NOT EXISTS public.match_outcomes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_profile_id    uuid        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  business_user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Match quality at recommendation time
  match_score           integer,
  score_breakdown       jsonb,
  creator_trust_at_time integer,

  -- Funnel outcomes (updated as campaign progresses)
  was_shortlisted        boolean     NOT NULL DEFAULT false,
  was_accepted           boolean     NOT NULL DEFAULT false,
  contract_sent          boolean     NOT NULL DEFAULT false,
  contract_accepted      boolean     NOT NULL DEFAULT false,
  deliverables_approved  boolean     NOT NULL DEFAULT false,
  payment_completed      boolean     NOT NULL DEFAULT false,
  was_rehired            boolean     NOT NULL DEFAULT false,

  -- Timestamps for each funnel stage
  shortlisted_at         timestamptz,
  accepted_at            timestamptz,
  contract_accepted_at   timestamptz,
  completed_at           timestamptz,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT match_outcomes_unique UNIQUE (campaign_id, creator_profile_id)
);

ALTER TABLE public.match_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business can manage their match outcomes"
  ON public.match_outcomes FOR ALL
  USING (auth.uid() = business_user_id);

CREATE POLICY "Creators can read their match outcomes"
  ON public.match_outcomes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = match_outcomes.creator_profile_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS match_outcomes_campaign_idx
  ON public.match_outcomes (campaign_id);

CREATE INDEX IF NOT EXISTS match_outcomes_creator_idx
  ON public.match_outcomes (creator_profile_id);

CREATE INDEX IF NOT EXISTS match_outcomes_score_idx
  ON public.match_outcomes (match_score DESC);

-- ── 4. compute_creator_trust_score() ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_creator_trust_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id           uuid;
  v_accepted_contracts   integer;
  v_completed_campaigns  integer;
  v_approved_delivs      integer;
  v_revision_delivs      integer;
  v_avg_rating           numeric;
  v_review_count         integer;
  v_unique_businesses    integer;
  v_repeat_businesses    integer;
  v_completion_rate      numeric;
  v_approval_rate        numeric;
  v_repeat_rate          numeric;
  v_avg_rating_norm      numeric;
  v_xp_bonus             numeric;
  v_raw_score            numeric;
  v_score                integer;
  v_tier                 text;
BEGIN
  SELECT id INTO v_creator_id
  FROM public.creator_profiles
  WHERE user_id = p_user_id;

  IF v_creator_id IS NULL THEN RETURN; END IF;

  -- Accepted contracts (creator was hired)
  SELECT COUNT(*) INTO v_accepted_contracts
  FROM public.contracts
  WHERE creator_id = p_user_id AND status = 'accepted';

  -- Campaigns with at least one approved deliverable (definition of "completed")
  SELECT COUNT(DISTINCT campaign_id) INTO v_completed_campaigns
  FROM public.campaign_deliverable_submissions
  WHERE creator_id = p_user_id AND status = 'approved';

  -- Approved and revision_requested deliverables
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE status = 'approved'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'revision_requested'), 0)
  INTO v_approved_delivs, v_revision_delivs
  FROM public.campaign_deliverable_submissions
  WHERE creator_id = p_user_id
    AND status IN ('approved', 'revision_requested');

  -- Average rating and review count
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.reviews
  WHERE reviewed_user_id = p_user_id AND reviewer_role = 'business';

  -- Repeat business: how many unique businesses hired this creator and how many came back
  WITH hire_counts AS (
    SELECT business_id, COUNT(*) AS times_hired
    FROM public.contracts
    WHERE creator_id = p_user_id AND status = 'accepted'
    GROUP BY business_id
  )
  SELECT
    COUNT(*)                                   AS unique_biz,
    COUNT(*) FILTER (WHERE times_hired > 1)    AS repeat_biz
  INTO v_unique_businesses, v_repeat_businesses
  FROM hire_counts;

  -- ── Compute rates ──────────────────────────────────────────────────────────

  -- Completion rate: campaigns completed / contracts accepted
  v_completion_rate := CASE
    WHEN v_accepted_contracts > 0
    THEN LEAST(v_completed_campaigns::numeric / v_accepted_contracts, 1.0) * 100
    ELSE 0
  END;

  -- Approval rate: approved / (approved + revision_requested); default 100 if no history
  v_approval_rate := CASE
    WHEN (v_approved_delivs + v_revision_delivs) > 0
    THEN (v_approved_delivs::numeric / (v_approved_delivs + v_revision_delivs)) * 100
    ELSE 100
  END;

  -- Repeat business rate
  v_repeat_rate := CASE
    WHEN v_unique_businesses > 0
    THEN (v_repeat_businesses::numeric / v_unique_businesses) * 100
    ELSE 0
  END;

  -- Normalized avg rating (0–100)
  v_avg_rating_norm := CASE
    WHEN v_review_count > 0 THEN (v_avg_rating / 5.0) * 100
    ELSE 50  -- neutral default: no reviews yet
  END;

  -- Experience bonus: up to 5 pts for having completed campaigns
  v_xp_bonus := LEAST(v_completed_campaigns::numeric * 1.0, 5.0);

  -- ── Composite score ────────────────────────────────────────────────────────
  IF v_accepted_contracts = 0 THEN
    v_score := 50;  -- new creator: neutral baseline, no penalty
  ELSE
    v_raw_score :=
      (v_completion_rate * 0.35) +
      (v_avg_rating_norm * 0.25) +
      (v_approval_rate   * 0.20) +
      (v_repeat_rate     * 0.15) +
      v_xp_bonus;

    v_score := GREATEST(0, LEAST(100, ROUND(v_raw_score)::integer));
  END IF;

  -- ── Tier ──────────────────────────────────────────────────────────────────
  v_tier := CASE
    WHEN v_accepted_contracts = 0                    THEN 'new'
    WHEN v_score >= 85 AND v_completed_campaigns >= 3 THEN 'elite'
    WHEN v_score >= 68 AND v_completed_campaigns >= 1 THEN 'trusted'
    WHEN v_score >= 50                               THEN 'rising'
    ELSE 'new'
  END;

  -- ── Upsert ────────────────────────────────────────────────────────────────
  INSERT INTO public.creator_trust_scores (
    user_id, creator_profile_id, score, tier,
    completion_rate, approval_rate, avg_rating, repeat_rate,
    total_campaigns, total_reviews, last_computed_at
  )
  VALUES (
    p_user_id, v_creator_id, v_score, v_tier,
    ROUND(v_completion_rate::numeric, 2),
    ROUND(v_approval_rate::numeric, 2),
    ROUND(v_avg_rating::numeric, 2),
    ROUND(v_repeat_rate::numeric, 2),
    v_completed_campaigns, v_review_count, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score             = EXCLUDED.score,
    tier              = EXCLUDED.tier,
    completion_rate   = EXCLUDED.completion_rate,
    approval_rate     = EXCLUDED.approval_rate,
    avg_rating        = EXCLUDED.avg_rating,
    repeat_rate       = EXCLUDED.repeat_rate,
    total_campaigns   = EXCLUDED.total_campaigns,
    total_reviews     = EXCLUDED.total_reviews,
    last_computed_at  = now();
END;
$$;

-- ── 5. compute_business_trust_score() ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_business_trust_score(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id          uuid;
  v_accepted_contracts   integer;
  v_completed_payments   integer;
  v_completed_campaigns  integer;
  v_avg_rating_given     numeric;
  v_review_count_given   integer;
  v_unique_creators      integer;
  v_repeat_creators      integer;
  v_payment_rate         numeric;
  v_completion_rate      numeric;
  v_repeat_rate          numeric;
  v_avg_rating_norm      numeric;
  v_xp_bonus             numeric;
  v_raw_score            numeric;
  v_score                integer;
  v_tier                 text;
BEGIN
  SELECT id INTO v_business_id
  FROM public.business_profiles
  WHERE user_id = p_user_id;

  -- Even without a business_profile, we track the score by user_id
  -- v_business_id may be NULL for businesses set up via profiles table only

  -- Accepted contracts (business hired a creator)
  SELECT COUNT(*) INTO v_accepted_contracts
  FROM public.contracts
  WHERE business_id = p_user_id AND status = 'accepted';

  -- Payment rate: derived from approved deliverables as a proxy (campaign_payments table not yet created)
  -- When campaign_payments table is available, replace this with a direct payment query
  SELECT COUNT(DISTINCT campaign_id) INTO v_completed_payments
  FROM public.campaign_deliverable_submissions
  WHERE business_id = p_user_id AND status = 'approved';

  -- Campaigns with at least one approved deliverable
  SELECT COUNT(DISTINCT campaign_id) INTO v_completed_campaigns
  FROM public.campaign_deliverable_submissions
  WHERE business_id = p_user_id AND status = 'approved';

  -- Average rating the business gave to creators (shows engagement quality)
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg_rating_given, v_review_count_given
  FROM public.reviews
  WHERE reviewer_id = p_user_id AND reviewer_role = 'business';

  -- Repeat creator rate: how many unique creators were hired and came back
  WITH hire_counts AS (
    SELECT creator_id, COUNT(*) AS times_hired
    FROM public.contracts
    WHERE business_id = p_user_id AND status = 'accepted'
    GROUP BY creator_id
  )
  SELECT
    COUNT(*)                                AS unique_creators,
    COUNT(*) FILTER (WHERE times_hired > 1) AS repeat_creators
  INTO v_unique_creators, v_repeat_creators
  FROM hire_counts;

  -- ── Compute rates ──────────────────────────────────────────────────────────

  v_payment_rate := CASE
    WHEN v_accepted_contracts > 0
    THEN LEAST(v_completed_payments::numeric / v_accepted_contracts, 1.0) * 100
    ELSE 0
  END;

  v_completion_rate := CASE
    WHEN v_accepted_contracts > 0
    THEN LEAST(v_completed_campaigns::numeric / v_accepted_contracts, 1.0) * 100
    ELSE 0
  END;

  v_repeat_rate := CASE
    WHEN v_unique_creators > 0
    THEN (v_repeat_creators::numeric / v_unique_creators) * 100
    ELSE 0
  END;

  v_avg_rating_norm := CASE
    WHEN v_review_count_given > 0 THEN (v_avg_rating_given / 5.0) * 100
    ELSE 50  -- neutral: hasn't reviewed yet
  END;

  v_xp_bonus := LEAST(v_completed_campaigns::numeric * 1.0, 5.0);

  -- ── Composite score ────────────────────────────────────────────────────────
  IF v_accepted_contracts = 0 THEN
    v_score := 50;
  ELSE
    v_raw_score :=
      (v_payment_rate    * 0.30) +
      (v_avg_rating_norm * 0.25) +
      (v_completion_rate * 0.25) +
      (v_repeat_rate     * 0.15) +
      v_xp_bonus;

    v_score := GREATEST(0, LEAST(100, ROUND(v_raw_score)::integer));
  END IF;

  v_tier := CASE
    WHEN v_accepted_contracts = 0                    THEN 'new'
    WHEN v_score >= 85 AND v_completed_campaigns >= 3 THEN 'elite'
    WHEN v_score >= 68 AND v_completed_campaigns >= 1 THEN 'trusted'
    WHEN v_score >= 50                               THEN 'rising'
    ELSE 'new'
  END;

  INSERT INTO public.business_trust_scores (
    user_id, business_profile_id, score, tier,
    payment_rate, contract_completion, avg_rating_given, repeat_creator_rate,
    total_campaigns, total_reviews_given, last_computed_at
  )
  VALUES (
    p_user_id, v_business_id, v_score, v_tier,
    ROUND(v_payment_rate::numeric, 2),
    ROUND(v_completion_rate::numeric, 2),
    ROUND(v_avg_rating_given::numeric, 2),
    ROUND(v_repeat_rate::numeric, 2),
    v_completed_campaigns, v_review_count_given, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score               = EXCLUDED.score,
    tier                = EXCLUDED.tier,
    payment_rate        = EXCLUDED.payment_rate,
    contract_completion = EXCLUDED.contract_completion,
    avg_rating_given    = EXCLUDED.avg_rating_given,
    repeat_creator_rate = EXCLUDED.repeat_creator_rate,
    total_campaigns     = EXCLUDED.total_campaigns,
    total_reviews_given = EXCLUDED.total_reviews_given,
    last_computed_at    = now();
END;
$$;

-- ── 6. Trigger: recompute on review ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_trust_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- The reviewed user gets their creator score updated
  PERFORM public.compute_creator_trust_score(NEW.reviewed_user_id);
  -- The reviewer (business) gets their business score updated
  IF NEW.reviewer_role = 'business' THEN
    PERFORM public.compute_business_trust_score(NEW.reviewer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_trust_on_review ON public.reviews;
CREATE TRIGGER sync_trust_on_review
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_trust_on_review();

-- ── 7. Trigger: recompute on contract status change ──────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_trust_on_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM public.compute_creator_trust_score(NEW.creator_id);
    PERFORM public.compute_business_trust_score(NEW.business_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_trust_on_contract ON public.contracts;
CREATE TRIGGER sync_trust_on_contract
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_trust_on_contract();

-- ── 8. Trigger: recompute on deliverable status change ───────────────────────

CREATE OR REPLACE FUNCTION public.trigger_trust_on_deliverable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'revision_requested') THEN
    PERFORM public.compute_creator_trust_score(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_trust_on_deliverable ON public.campaign_deliverable_submissions;
CREATE TRIGGER sync_trust_on_deliverable
  AFTER UPDATE ON public.campaign_deliverable_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_trust_on_deliverable();

-- ── 9. Trigger: recompute on payment completion ──────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_trust_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('completed', 'released', 'failed', 'disputed') THEN
    PERFORM public.compute_business_trust_score(NEW.business_id);
    PERFORM public.compute_creator_trust_score(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Payment trigger deferred until campaign_payments table is created
-- DO $$
-- BEGIN
--   DROP TRIGGER IF EXISTS sync_trust_on_payment ON public.campaign_payments;
--   CREATE TRIGGER sync_trust_on_payment
--     AFTER UPDATE ON public.campaign_payments
--     FOR EACH ROW EXECUTE FUNCTION public.trigger_trust_on_payment();
-- END;
-- $$;

-- ── 10. match_outcomes updated_at trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_match_outcome_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_outcomes_updated_at
  BEFORE UPDATE ON public.match_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_match_outcome_updated_at();

-- ── 11. Helper view: creator intelligence summary ────────────────────────────

CREATE OR REPLACE VIEW public.creator_intelligence AS
SELECT
  cp.user_id,
  cp.id                  AS creator_profile_id,
  cp.display_name,
  cp.niche,
  cp.avg_rating          AS profile_avg_rating,
  cp.review_count        AS profile_review_count,
  cts.score              AS trust_score,
  cts.tier               AS trust_tier,
  cts.completion_rate,
  cts.approval_rate,
  cts.avg_rating         AS trust_avg_rating,
  cts.repeat_rate,
  cts.total_campaigns,
  cts.total_reviews,
  cts.last_computed_at   AS trust_last_updated
FROM public.creator_profiles cp
LEFT JOIN public.creator_trust_scores cts ON cts.user_id = cp.user_id;

-- ── 12. Helper view: business intelligence summary ───────────────────────────

CREATE OR REPLACE VIEW public.business_intelligence AS
SELECT
  bp.user_id,
  bp.id                  AS business_profile_id,
  bp.company_name,
  bp.industry,
  bp.avg_rating          AS profile_avg_rating,
  bp.review_count        AS profile_review_count,
  bts.score              AS trust_score,
  bts.tier               AS trust_tier,
  bts.payment_rate,
  bts.contract_completion,
  bts.avg_rating_given,
  bts.repeat_creator_rate,
  bts.total_campaigns,
  bts.total_reviews_given,
  bts.last_computed_at   AS trust_last_updated
FROM public.business_profiles bp
LEFT JOIN public.business_trust_scores bts ON bts.user_id = bp.user_id;
