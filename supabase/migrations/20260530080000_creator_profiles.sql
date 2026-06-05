-- ============================================================
-- MRKT Creator Profiles — V2 schema
-- Run BEFORE project_saved_creators (20260530110000)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  display_name            text        NOT NULL,
  username                text,
  bio                     text,
  location                text,
  profile_image_url       text,

  -- Creator classification
  niche                   text,
  categories              text[]      NOT NULL DEFAULT '{}',
  platforms               text[]      NOT NULL DEFAULT '{}',

  -- Social handles
  instagram_handle        text,
  tiktok_handle           text,
  youtube_handle          text,

  -- Audience
  follower_count          integer,
  audience_location       text,
  audience_age_range      text,
  audience_gender_split   text,
  primary_language        text,

  -- Collaboration preferences
  accepts_paid            boolean     NOT NULL DEFAULT true,
  accepts_gifted          boolean     NOT NULL DEFAULT true,
  accepts_affiliate       boolean     NOT NULL DEFAULT false,
  rate_range              text,
  preferred_content_types text[]      NOT NULL DEFAULT '{}',

  -- Portfolio / links
  featured_link_1         text,
  featured_link_2         text,
  featured_link_3         text,
  media_kit_url           text,
  previous_collaborations text,

  -- Visibility & status
  is_public               boolean     NOT NULL DEFAULT true,
  status                  text        NOT NULL DEFAULT 'incomplete'
                          CHECK (status IN ('incomplete', 'pending_review', 'active', 'hidden')),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT creator_profiles_user_id_unique UNIQUE (user_id)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS creator_profiles_user_id_idx
  ON public.creator_profiles (user_id);

CREATE INDEX IF NOT EXISTS creator_profiles_status_public_idx
  ON public.creator_profiles (status, is_public);

CREATE INDEX IF NOT EXISTS creator_profiles_niche_idx
  ON public.creator_profiles (niche);

CREATE INDEX IF NOT EXISTS creator_profiles_created_at_idx
  ON public.creator_profiles (created_at DESC);

CREATE INDEX IF NOT EXISTS creator_profiles_categories_idx
  ON public.creator_profiles USING gin (categories);

CREATE INDEX IF NOT EXISTS creator_profiles_platforms_idx
  ON public.creator_profiles USING gin (platforms);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read active public profiles
CREATE POLICY "Anyone can view active public profiles"
  ON public.creator_profiles FOR SELECT
  USING (status = 'active' AND is_public = true);

-- Owners can view their own profile in any state
CREATE POLICY "Owners can view own profile"
  ON public.creator_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Owners can insert their own profile
CREATE POLICY "Owners can insert own profile"
  ON public.creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their own profile
CREATE POLICY "Owners can update own profile"
  ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE TRIGGER creator_profiles_touch
  BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
