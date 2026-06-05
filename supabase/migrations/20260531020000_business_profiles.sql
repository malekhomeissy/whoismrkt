-- ============================================================
-- MRKT Business Profiles — initial schema
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Company identity
  company_name                text,
  industry                    text,
  website                     text,
  location                    text,
  description                 text,
  company_size                text,

  -- Targeting
  target_audience             text,
  geographic_market           text,

  -- Preferences
  preferred_platforms         text[]      NOT NULL DEFAULT '{}',
  preferred_creator_categories text[]     NOT NULL DEFAULT '{}',
  campaign_goals              text[]      NOT NULL DEFAULT '{}',

  -- Budget
  monthly_creator_budget      text,

  -- Completion flag (set true when user finishes setup)
  is_complete                 boolean     NOT NULL DEFAULT false,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS business_profiles_user_id_idx
  ON public.business_profiles (user_id);

CREATE INDEX IF NOT EXISTS business_profiles_industry_idx
  ON public.business_profiles (industry);

CREATE INDEX IF NOT EXISTS business_profiles_platforms_idx
  ON public.business_profiles USING gin (preferred_platforms);

CREATE INDEX IF NOT EXISTS business_profiles_categories_idx
  ON public.business_profiles USING gin (preferred_creator_categories);

CREATE INDEX IF NOT EXISTS business_profiles_goals_idx
  ON public.business_profiles USING gin (campaign_goals);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own business profile"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own business profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own business profile"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE TRIGGER business_profiles_touch
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
