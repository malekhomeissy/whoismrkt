-- ─────────────────────────────────────────────────────────────────────────────
-- match_scores — cached creator ↔ campaign compatibility scores
-- Populated client-side; invalidated when campaign or creator profile changes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.match_scores (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       uuid        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  campaign_id      uuid        NOT NULL REFERENCES public.campaigns(id)        ON DELETE CASCADE,
  total_score      smallint    NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  platform_score   smallint    NOT NULL CHECK (platform_score   BETWEEN 0 AND 100),
  niche_score      smallint    NOT NULL CHECK (niche_score      BETWEEN 0 AND 100),
  audience_score   smallint    NOT NULL CHECK (audience_score   BETWEEN 0 AND 100),
  location_score   smallint    NOT NULL CHECK (location_score   BETWEEN 0 AND 100),
  requirements_score smallint  NOT NULL CHECK (requirements_score BETWEEN 0 AND 100),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT match_scores_creator_campaign_unique UNIQUE (creator_id, campaign_id)
);

-- Index for fast lookup of top creators for a campaign
CREATE INDEX IF NOT EXISTS match_scores_campaign_total_idx
  ON public.match_scores (campaign_id, total_score DESC);

-- Index for creator's opportunity scores
CREATE INDEX IF NOT EXISTS match_scores_creator_total_idx
  ON public.match_scores (creator_id, total_score DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;

-- Businesses can read scores for their own campaigns
CREATE POLICY "Business reads own campaign scores"
  ON public.match_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = match_scores.campaign_id
        AND c.user_id = auth.uid()
    )
  );

-- Creators can read their own scores
CREATE POLICY "Creator reads own scores"
  ON public.match_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_profiles cp
      WHERE cp.id = match_scores.creator_id
        AND cp.user_id = auth.uid()
    )
  );

-- Anyone authenticated can upsert scores (client computes and caches)
CREATE POLICY "Authenticated upsert scores"
  ON public.match_scores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update scores"
  ON public.match_scores FOR UPDATE
  USING (auth.uid() IS NOT NULL);
