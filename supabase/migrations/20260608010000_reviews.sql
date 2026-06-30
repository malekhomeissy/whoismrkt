-- ─────────────────────────────────────────────────────────────────────────────
-- Reviews & Ratings — Phase 2 Trust System
-- Bidirectional: Business → Creator and Creator → Business
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. reviews table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context: which collaboration this review is for
  campaign_id                uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,

  -- Who submitted, who is being rated
  reviewer_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role              text NOT NULL CHECK (reviewer_role IN ('business', 'creator')),

  -- Overall 1–5 star rating (required)
  rating                     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),

  -- Shared category ratings (optional)
  communication_rating       integer CHECK (communication_rating BETWEEN 1 AND 5),
  professionalism_rating     integer CHECK (professionalism_rating BETWEEN 1 AND 5),
  reliability_rating         integer CHECK (reliability_rating BETWEEN 1 AND 5),

  -- Creator-specific category ratings
  content_quality_rating     integer CHECK (content_quality_rating BETWEEN 1 AND 5),
  timeliness_rating          integer CHECK (timeliness_rating BETWEEN 1 AND 5),

  -- Business-specific category ratings
  brief_quality_rating       integer CHECK (brief_quality_rating BETWEEN 1 AND 5),
  responsiveness_rating      integer CHECK (responsiveness_rating BETWEEN 1 AND 5),
  payment_reliability_rating integer CHECK (payment_reliability_rating BETWEEN 1 AND 5),

  -- Optional written review (max 500 chars enforced client-side)
  written_review             text,

  created_at                 timestamptz NOT NULL DEFAULT now(),

  -- One review per campaign per reviewer
  UNIQUE (campaign_id, reviewer_id)
);

-- 2. Cached aggregate columns on profile tables ────────────────────────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS avg_rating   float,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS avg_rating   float,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- 3. Row-level security ────────────────────────────────────────────────────────

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read all reviews (public trust signal)
CREATE POLICY "Authenticated users can view reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only the reviewer may insert their own review
CREATE POLICY "Users can submit their own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- 4. Aggregate update trigger ──────────────────────────────────────────────────
-- Fires after INSERT or UPDATE; updates avg_rating + review_count on both
-- creator_profiles and business_profiles (only one will match per user).

CREATE OR REPLACE FUNCTION public.update_review_aggregates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_avg   float;
  v_count integer;
BEGIN
  SELECT AVG(rating)::float, COUNT(*)::integer
    INTO v_avg, v_count
    FROM public.reviews
   WHERE reviewed_user_id = NEW.reviewed_user_id;

  UPDATE public.creator_profiles
     SET avg_rating = v_avg, review_count = v_count
   WHERE user_id = NEW.reviewed_user_id;

  UPDATE public.business_profiles
     SET avg_rating = v_avg, review_count = v_count
   WHERE user_id = NEW.reviewed_user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_review_aggregates();
