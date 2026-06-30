-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 1: Foundation Tables
--
-- New tables:
--   1. marketplace_events        — unified platform event log
--   2. match_score_cache         — server-side match scores with explanations
--   3. notification_preferences  — per-user channel + category prefs
--   4. creator_visibility_scores — server-side visibility score storage
--   5. creator_daily_metrics     — daily snapshot for trend charts
--   6. business_daily_metrics    — daily snapshot for business analytics
--   7. profiles phone fields     — WhatsApp support
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. marketplace_events ────────────────────────────────────────────────────
-- The single source of truth for all marketplace activity.
-- Every view, save, application, message, contract, deliverable, and session
-- is recorded here so the platform can learn and personalise over time.

CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text        NOT NULL,
  actor_user_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id     uuid        REFERENCES public.campaigns(id) ON DELETE SET NULL,
  application_id  uuid        REFERENCES public.campaign_applications(id) ON DELETE SET NULL,
  contract_id     uuid        REFERENCES public.contracts(id) ON DELETE SET NULL,
  deliverable_id  uuid        REFERENCES public.campaign_deliverable_submissions(id) ON DELETE SET NULL,
  metadata_json   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS me_actor_idx    ON public.marketplace_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS me_type_idx     ON public.marketplace_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS me_campaign_idx ON public.marketplace_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS me_creator_idx  ON public.marketplace_events (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS me_business_idx ON public.marketplace_events (business_id, created_at DESC);

ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators read own marketplace events"
  ON public.marketplace_events FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = actor_user_id);

CREATE POLICY "Businesses read campaign marketplace events"
  ON public.marketplace_events FOR SELECT
  USING (
    auth.uid() = business_id OR
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = marketplace_events.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own marketplace events"
  ON public.marketplace_events FOR INSERT
  WITH CHECK (auth.uid() = actor_user_id);

-- ── 2. match_score_cache ─────────────────────────────────────────────────────
-- Server-computed match scores with full breakdown and explanation.
-- Cached for 24 hours to avoid recomputing on every page load.

CREATE TABLE IF NOT EXISTS public.match_score_cache (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id         uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  business_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  score               integer     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  success_probability integer     NOT NULL DEFAULT 0 CHECK (success_probability BETWEEN 0 AND 100),
  explanation_json    jsonb       NOT NULL DEFAULT '{}',
  computed_at         timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT match_score_cache_unique UNIQUE (creator_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS msc_creator_idx   ON public.match_score_cache (creator_id);
CREATE INDEX IF NOT EXISTS msc_campaign_idx  ON public.match_score_cache (campaign_id, score DESC);
CREATE INDEX IF NOT EXISTS msc_expires_idx   ON public.match_score_cache (expires_at);

ALTER TABLE public.match_score_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads cached match scores"
  ON public.match_score_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role manages match score cache"
  ON public.match_score_cache FOR ALL
  WITH CHECK (true);

-- ── 3. notification_preferences ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- channels
  in_app_enabled    boolean     NOT NULL DEFAULT true,
  email_enabled     boolean     NOT NULL DEFAULT true,
  whatsapp_enabled  boolean     NOT NULL DEFAULT false,
  -- categories
  campaign_updates  boolean     NOT NULL DEFAULT true,
  messages          boolean     NOT NULL DEFAULT true,
  contracts         boolean     NOT NULL DEFAULT true,
  deliverables      boolean     NOT NULL DEFAULT true,
  weekly_reports    boolean     NOT NULL DEFAULT true,
  marketing_updates boolean     NOT NULL DEFAULT false,
  -- timestamps
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_unique UNIQUE (user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create default preferences when a new user is created
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_notif_prefs_on_signup ON auth.users;
CREATE TRIGGER create_notif_prefs_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();

-- ── 4. creator_visibility_scores ────────────────────────────────────────────
-- Replaces the client-side visibility score formula.
-- Computed server-side, stored here, updated on relevant profile/activity changes.

CREATE TABLE IF NOT EXISTS public.creator_visibility_scores (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score                 integer     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  previous_score        integer     NOT NULL DEFAULT 0,
  weekly_change         integer     NOT NULL DEFAULT 0,
  -- components (0–100 each)
  profile_completeness  integer     NOT NULL DEFAULT 0,
  activity_score        integer     NOT NULL DEFAULT 0,
  response_score        integer     NOT NULL DEFAULT 0,
  instagram_verified    boolean     NOT NULL DEFAULT false,
  recent_views          integer     NOT NULL DEFAULT 0,
  recent_saves          integer     NOT NULL DEFAULT 0,
  recent_appearances    integer     NOT NULL DEFAULT 0,
  last_calculated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_visibility_user_unique UNIQUE (user_id)
);

ALTER TABLE public.creator_visibility_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own visibility score"
  ON public.creator_visibility_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone reads visibility scores"
  ON public.creator_visibility_scores FOR SELECT
  USING (true);

CREATE POLICY "Service manages visibility scores"
  ON public.creator_visibility_scores FOR ALL
  WITH CHECK (true);

-- ── 5. creator_daily_metrics ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_daily_metrics (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date         date    NOT NULL,
  profile_views       integer NOT NULL DEFAULT 0,
  match_appearances   integer NOT NULL DEFAULT 0,
  applications_sent   integer NOT NULL DEFAULT 0,
  saves_received      integer NOT NULL DEFAULT 0,
  messages_received   integer NOT NULL DEFAULT 0,
  visibility_score    integer NOT NULL DEFAULT 0,
  CONSTRAINT creator_daily_metrics_user_date UNIQUE (user_id, metric_date)
);

CREATE INDEX IF NOT EXISTS cdm_user_date_idx ON public.creator_daily_metrics (user_id, metric_date DESC);

ALTER TABLE public.creator_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own creator metrics"
  ON public.creator_daily_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service manages creator daily metrics"
  ON public.creator_daily_metrics FOR ALL
  WITH CHECK (true);

-- ── 6. business_daily_metrics ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_daily_metrics (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date           date    NOT NULL,
  applications_received integer NOT NULL DEFAULT 0,
  campaigns_active      integer NOT NULL DEFAULT 0,
  creators_shortlisted  integer NOT NULL DEFAULT 0,
  messages_sent         integer NOT NULL DEFAULT 0,
  pipeline_updates      integer NOT NULL DEFAULT 0,
  CONSTRAINT business_daily_metrics_user_date UNIQUE (user_id, metric_date)
);

CREATE INDEX IF NOT EXISTS bdm_user_date_idx ON public.business_daily_metrics (user_id, metric_date DESC);

ALTER TABLE public.business_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own business metrics"
  ON public.business_daily_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service manages business daily metrics"
  ON public.business_daily_metrics FOR ALL
  WITH CHECK (true);

-- ── 7. Phone number fields ────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number    text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text;
