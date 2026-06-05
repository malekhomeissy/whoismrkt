-- ============================================================
-- Campaign Applications — creators applying to campaign briefs
-- Run AFTER campaigns (20260606030000)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_profile_id  uuid        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cached for easy display without extra joins
  campaign_brand      text        NOT NULL DEFAULT '',
  campaign_title      text        NOT NULL DEFAULT '',

  -- Application status
  status              text        NOT NULL DEFAULT 'pending',
  -- pending | reviewing | shortlisted | rejected | accepted

  cover_note          text,
  proposed_rate       numeric,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT campaign_applications_status_check
    CHECK (status IN ('pending','reviewing','shortlisted','rejected','accepted')),

  CONSTRAINT campaign_applications_unique
    UNIQUE (campaign_id, creator_profile_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS campaign_applications_campaign_idx
  ON public.campaign_applications (campaign_id);

CREATE INDEX IF NOT EXISTS campaign_applications_creator_idx
  ON public.campaign_applications (creator_profile_id);

CREATE INDEX IF NOT EXISTS campaign_applications_user_idx
  ON public.campaign_applications (user_id);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

-- Creators manage their own applications
CREATE POLICY "Creators manage own applications"
  ON public.campaign_applications FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Campaign owners can read all applications to their campaigns
CREATE POLICY "Campaign owners can view applications"
  ON public.campaign_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  );

-- Campaign owners can update application status (shortlist, reject, accept)
CREATE POLICY "Campaign owners can update application status"
  ON public.campaign_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  );

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_campaign_applications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_applications_touch
  BEFORE UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaign_applications_updated_at();
