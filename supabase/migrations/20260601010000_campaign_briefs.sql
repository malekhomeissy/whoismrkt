-- ============================================================
-- MRKT Campaign Briefs — one brief per project
-- Run AFTER projects (20260530090000)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_campaign_briefs (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             uuid        NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Campaign identity
  campaign_name          text,
  campaign_goal          text,

  -- Targeting
  target_audience        text,
  audience_location      text,
  budget_range           text,
  campaign_deadline      date,

  -- Creative specs
  platforms              text[]      NOT NULL DEFAULT '{}',
  content_types          text[]      NOT NULL DEFAULT '{}',

  -- Creator preferences
  creator_categories     text[]      NOT NULL DEFAULT '{}',
  preferred_creator_size text,

  -- Notes
  brand_notes            text,
  additional_notes       text,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS campaign_briefs_project_idx
  ON public.project_campaign_briefs (project_id);

CREATE INDEX IF NOT EXISTS campaign_briefs_user_idx
  ON public.project_campaign_briefs (user_id);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.project_campaign_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own campaign briefs" ON public.project_campaign_briefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE TRIGGER campaign_briefs_touch
  BEFORE UPDATE ON public.project_campaign_briefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
