-- ─────────────────────────────────────────────────────────────────────────────
-- MRKT Retention Engine
--
-- Tables:
--   mission_completions  — tracks which daily missions a user completed
--   weekly_report_cache  — caches generated weekly reports (avoid re-computing)
--   user_activity_log    — lightweight session/engagement tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. mission_completions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mission_completions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id   text        NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mission_completions_user_idx
  ON public.mission_completions (user_id, completed_at DESC);

ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own missions"
  ON public.mission_completions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. weekly_report_cache ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weekly_report_cache (
  id          uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  date   NOT NULL,
  stats       jsonb  NOT NULL DEFAULT '{}',
  ai_insights text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_report_cache_user_week_unique UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_report_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own reports"
  ON public.weekly_report_cache
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. user_activity_log ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,  -- 'session_start', 'mission_view', 'report_view', etc.
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_log_user_idx
  ON public.user_activity_log (user_id, created_at DESC);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own activity"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own activity"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 4. opportunity_saves for creators ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.opportunity_saves (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_saves_unique UNIQUE (user_id, campaign_id)
);

ALTER TABLE public.opportunity_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saves"
  ON public.opportunity_saves
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Notification when creator applies to campaign ─────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  campaign_row  RECORD;
  creator_name  text;
BEGIN
  -- Find the campaign and its owner
  SELECT c.title, c.user_id INTO campaign_row
  FROM   public.campaigns c
  WHERE  c.id = NEW.campaign_id;

  IF campaign_row.user_id IS NULL THEN RETURN NEW; END IF;

  -- Creator name
  SELECT COALESCE(cp.display_name, p.name, 'A creator')
  INTO   creator_name
  FROM   public.profiles p
  LEFT JOIN public.creator_profiles cp ON cp.user_id = p.id
  WHERE  p.id = NEW.user_id
  LIMIT  1;

  -- Notify the business
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    campaign_row.user_id,
    'new_applicant',
    creator_name || ' applied to your campaign',
    campaign_row.title,
    '/pipeline'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_new_application ON public.campaign_applications;
CREATE TRIGGER notify_on_new_application
  AFTER INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_application();

-- ── 6. Notify creator when application status changes ────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_application_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  campaign_title  text;
  notif_type      text;
  notif_title     text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT title INTO campaign_title
  FROM   public.campaigns
  WHERE  id = NEW.campaign_id;

  notif_type  := NEW.status;
  notif_title := CASE NEW.status
    WHEN 'reviewing'   THEN 'Your application is under review'
    WHEN 'shortlisted' THEN 'You were shortlisted! 🎉'
    WHEN 'accepted'    THEN 'Congratulations — you were selected!'
    WHEN 'rejected'    THEN 'Application update for ' || COALESCE(campaign_title, 'campaign')
    ELSE                    'Application status updated'
  END;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id,
    notif_type,
    notif_title,
    campaign_title,
    '/applications'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_app_status ON public.campaign_applications;
CREATE TRIGGER notify_on_app_status
  AFTER UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_application_status_change();
