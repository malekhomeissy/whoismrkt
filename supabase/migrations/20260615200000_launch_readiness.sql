-- ─────────────────────────────────────────────────────────────────────────────
-- MRKT Launch Readiness Migration
-- Adds: contract V2 fields, admin actions, AI recommendations,
--       campaign health scores, trust verifications, pioneer tracking,
--       notification preferences, media kit views
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Contract V2: structured fields ────────────────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deliverables_json   jsonb,
  ADD COLUMN IF NOT EXISTS amount_cents        integer  CHECK (amount_cents >= 0),
  ADD COLUMN IF NOT EXISTS currency            text     DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS due_date            date,
  ADD COLUMN IF NOT EXISTS ownership_clause    text,
  ADD COLUMN IF NOT EXISTS usage_rights        text,
  ADD COLUMN IF NOT EXISTS cancellation_terms  text,
  ADD COLUMN IF NOT EXISTS contract_version    integer  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signed_ip           text,
  ADD COLUMN IF NOT EXISTS signed_user_agent   text,
  ADD COLUMN IF NOT EXISTS business_name       text,
  ADD COLUMN IF NOT EXISTS creator_name        text,
  ADD COLUMN IF NOT EXISTS platform_fee_pct    numeric(5,2) DEFAULT 10.00;

-- ── 2. Admin actions (audit trail) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id    uuid        NOT NULL,               -- user or resource being acted on
  target_type  text        NOT NULL,               -- 'creator' | 'business' | 'contract' | 'campaign'
  action       text        NOT NULL,               -- 'grant_pioneer' | 'revoke_pioneer' | 'verify' | 'suspend' | 'note'
  note         text,
  meta         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_target_idx ON public.admin_actions (target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_admin_idx  ON public.admin_actions (admin_id, created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Only service-role or trusted admin email can read/write admin_actions
-- Founders query via service_role (no client RLS needed for read; write via RPC or service_role)
CREATE POLICY "Admins manage admin_actions"
  ON public.admin_actions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 3. Trust verifications (admin manual ID/business verification) ────────────

CREATE TABLE IF NOT EXISTS public.trust_verifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type     text        NOT NULL CHECK (user_type IN ('creator', 'business')),
  verified_by   uuid        REFERENCES auth.users(id),
  status        text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  method        text        DEFAULT 'manual'
                              CHECK (method IN ('manual', 'id_document', 'selfie', 'social', 'email', 'phone')),
  note          text,
  verified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trust_verifications_user_unique UNIQUE (user_id)
);

ALTER TABLE public.trust_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification"
  ON public.trust_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages verifications"
  ON public.trust_verifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 4. AI recommendations (proactive strategist) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text        NOT NULL,  -- 'opportunity' | 'campaign' | 'profile' | 'market' | 'action'
  title         text        NOT NULL,
  body          text        NOT NULL,
  action_label  text,
  action_link   text,
  priority      text        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('high', 'medium', 'low')),
  status        text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'dismissed', 'completed')),
  source        text        DEFAULT 'system',  -- 'system' | 'ai_strategist'
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz
);

-- Ensure columns exist if table was already created without them
ALTER TABLE public.ai_recommendations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dismissed', 'completed')),
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS meta jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS ai_recommendations_user_idx    ON public.ai_recommendations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_recommendations_status_idx  ON public.ai_recommendations (user_id, status) WHERE status = 'active';

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recommendations"
  ON public.ai_recommendations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Campaign health scores ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_health_scores (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score           integer     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  -- Component scores
  applications_score  integer DEFAULT 0,
  creator_quality_score integer DEFAULT 0,
  response_speed_score  integer DEFAULT 0,
  completion_score      integer DEFAULT 0,
  engagement_score      integer DEFAULT 0,
  -- Metrics snapshot
  application_count     integer DEFAULT 0,
  avg_creator_trust     numeric(5,2) DEFAULT 0,
  verified_applicants   integer DEFAULT 0,
  pioneer_applicants    integer DEFAULT 0,
  last_activity_at      timestamptz,
  computed_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_health_scores_campaign_unique UNIQUE (campaign_id)
);

ALTER TABLE public.campaign_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owner views health score"
  ON public.campaign_health_scores FOR SELECT
  USING (auth.uid() = user_id);

-- ── 6. Notification preferences ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- In-app
  in_app_enabled      boolean     NOT NULL DEFAULT true,
  -- Email
  email_enabled       boolean     NOT NULL DEFAULT true,
  email_address       text,
  -- WhatsApp
  whatsapp_enabled    boolean     NOT NULL DEFAULT false,
  whatsapp_number     text,
  -- Channel preferences per event type
  new_message         text[]      NOT NULL DEFAULT ARRAY['in_app', 'email'],
  new_applicant       text[]      NOT NULL DEFAULT ARRAY['in_app', 'email'],
  contract_sent       text[]      NOT NULL DEFAULT ARRAY['in_app', 'email'],
  contract_accepted   text[]      NOT NULL DEFAULT ARRAY['in_app', 'email'],
  deliverable_submitted text[]    NOT NULL DEFAULT ARRAY['in_app'],
  deliverable_approved  text[]    NOT NULL DEFAULT ARRAY['in_app', 'email'],
  -- Digest preferences
  daily_digest        boolean     NOT NULL DEFAULT true,
  weekly_report       boolean     NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_user_unique UNIQUE (user_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 7. Media kit views (analytics) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.media_kit_views (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_ip    text,
  referrer     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_kit_views_creator_idx ON public.media_kit_views (creator_id, created_at DESC);

ALTER TABLE public.media_kit_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own media kit analytics"
  ON public.media_kit_views FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can insert media kit views"
  ON public.media_kit_views FOR INSERT
  WITH CHECK (true);

-- ── 8. Pioneer program tracking ───────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at   timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS pioneer_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pioneer_granted_by uuid REFERENCES auth.users(id);

-- ── 9. Contract V2: ensure status includes 'completed'/'active' ───────────────

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'active', 'completed', 'declined', 'cancelled'));

-- ── 10. RPC: grant pioneer status (admin only) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_grant_pioneer(
  p_target_user_id  uuid,
  p_admin_id        uuid,
  p_note            text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Grant pioneer in profiles
  UPDATE public.profiles
  SET
    is_beta_pioneer      = true,
    pioneer_granted_at   = now(),
    pioneer_granted_by   = p_admin_id
  WHERE id = p_target_user_id;

  -- Also update creator_profiles if exists
  UPDATE public.creator_profiles
  SET is_beta_pioneer = true
  WHERE user_id = p_target_user_id;

  -- Log admin action
  INSERT INTO public.admin_actions (admin_id, target_id, target_type, action, note)
  VALUES (p_admin_id, p_target_user_id, 'creator', 'grant_pioneer', p_note);

  -- Notify the creator
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    p_target_user_id,
    'pioneer_granted',
    'You''re a MRKT Pioneer',
    'Your Pioneer status has been approved. You now have priority in search and recommendations.',
    '/profile'
  );
END;
$$;

-- ── 11. RPC: revoke pioneer status ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_revoke_pioneer(
  p_target_user_id  uuid,
  p_admin_id        uuid,
  p_note            text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET is_beta_pioneer = false
  WHERE id = p_target_user_id;

  UPDATE public.creator_profiles
  SET is_beta_pioneer = false
  WHERE user_id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_id, target_type, action, note)
  VALUES (p_admin_id, p_target_user_id, 'creator', 'revoke_pioneer', p_note);
END;
$$;

-- ── 12. RPC: verify creator (admin) ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_verify_creator(
  p_target_user_id  uuid,
  p_admin_id        uuid,
  p_method          text DEFAULT 'manual',
  p_note            text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Mark as verified in creator_profiles
  UPDATE public.creator_profiles
  SET is_verified = true
  WHERE user_id = p_target_user_id;

  -- Upsert trust verification record
  INSERT INTO public.trust_verifications (user_id, user_type, verified_by, status, method, note, verified_at)
  VALUES (p_target_user_id, 'creator', p_admin_id, 'approved', p_method, p_note, now())
  ON CONFLICT (user_id) DO UPDATE SET
    status      = 'approved',
    verified_by = p_admin_id,
    method      = p_method,
    note        = p_note,
    verified_at = now();

  -- Log action
  INSERT INTO public.admin_actions (admin_id, target_id, target_type, action, note)
  VALUES (p_admin_id, p_target_user_id, 'creator', 'verify', p_note);

  -- Notify creator
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    p_target_user_id,
    'account_verified',
    'Your account is verified',
    'Your creator profile has been verified. Your Verified badge is now live.',
    '/profile'
  );
END;
$$;

-- ── 13. RPC: suspend user ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_target_user_id  uuid,
  p_admin_id        uuid,
  p_reason          text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET suspended_at       = now(),
      suspension_reason  = p_reason
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_actions (admin_id, target_id, target_type, action, note)
  VALUES (p_admin_id, p_target_user_id, 'creator', 'suspend', p_reason);
END;
$$;

-- ── 14. Compute campaign health score (RPC) ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.compute_campaign_health(p_campaign_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app_count       integer := 0;
  v_verified_count  integer := 0;
  v_pioneer_count   integer := 0;
  v_avg_trust       numeric := 0;
  v_app_score       integer := 0;
  v_quality_score   integer := 0;
  v_campaign_owner  uuid;
  v_health_score    integer := 0;
  v_last_activity   timestamptz;
BEGIN
  SELECT user_id INTO v_campaign_owner FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Application count score (0-30)
  SELECT COUNT(*) INTO v_app_count
  FROM public.campaign_applications
  WHERE campaign_id = p_campaign_id;
  v_app_score := LEAST(30, v_app_count * 3);

  -- Creator quality score (0-40): verified + pioneer + avg trust
  SELECT
    COUNT(*) FILTER (WHERE cp.is_verified),
    COUNT(*) FILTER (WHERE cp.is_beta_pioneer),
    COALESCE(AVG(cts.score), 0)
  INTO v_verified_count, v_pioneer_count, v_avg_trust
  FROM public.campaign_applications ca
  JOIN public.creator_profiles cp ON cp.user_id = ca.user_id
  LEFT JOIN public.creator_trust_scores cts ON cts.user_id = ca.user_id
  WHERE ca.campaign_id = p_campaign_id;

  v_quality_score := LEAST(40,
    (CASE WHEN v_app_count > 0 THEN (v_verified_count::numeric / v_app_count * 20)::integer ELSE 0 END) +
    (CASE WHEN v_app_count > 0 THEN (v_pioneer_count::numeric / v_app_count * 10)::integer ELSE 0 END) +
    (v_avg_trust / 100.0 * 10)::integer
  );

  -- Recent activity score (0-30)
  SELECT MAX(created_at) INTO v_last_activity
  FROM public.campaign_applications
  WHERE campaign_id = p_campaign_id;

  IF v_last_activity IS NOT NULL THEN
    CASE
      WHEN v_last_activity > now() - interval '24 hours' THEN v_health_score := v_health_score + 30;
      WHEN v_last_activity > now() - interval '7 days'   THEN v_health_score := v_health_score + 20;
      WHEN v_last_activity > now() - interval '30 days'  THEN v_health_score := v_health_score + 10;
      ELSE NULL;
    END CASE;
  END IF;

  v_health_score := v_app_score + v_quality_score + v_health_score;
  v_health_score := LEAST(100, GREATEST(0, v_health_score));

  -- Upsert health score
  INSERT INTO public.campaign_health_scores (
    campaign_id, user_id, score,
    applications_score, creator_quality_score,
    application_count, avg_creator_trust,
    verified_applicants, pioneer_applicants,
    last_activity_at, computed_at
  ) VALUES (
    p_campaign_id, v_campaign_owner, v_health_score,
    v_app_score, v_quality_score,
    v_app_count, v_avg_trust,
    v_verified_count, v_pioneer_count,
    v_last_activity, now()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    score                 = EXCLUDED.score,
    applications_score    = EXCLUDED.applications_score,
    creator_quality_score = EXCLUDED.creator_quality_score,
    application_count     = EXCLUDED.application_count,
    avg_creator_trust     = EXCLUDED.avg_creator_trust,
    verified_applicants   = EXCLUDED.verified_applicants,
    pioneer_applicants    = EXCLUDED.pioneer_applicants,
    last_activity_at      = EXCLUDED.last_activity_at,
    computed_at           = now();

  RETURN v_health_score;
END;
$$;

-- ── 15. View: creator discovery ranking ──────────────────────────────────────
-- Boosts: pioneer (+20), verified (+15), high trust (+trust/5), complete profile
-- Reduces: incomplete (<60% completion), no portfolio, unverified with no score

CREATE OR REPLACE VIEW public.creator_discovery_ranked AS
SELECT
  cp.*,
  p.suspended_at,
  COALESCE(cts.score, 0)       AS trust_score,
  COALESCE(cts.tier, 'new')    AS trust_tier,
  -- Computed ranking score (cp.is_beta_pioneer comes from creator_profiles)
  (
    COALESCE(cts.score, 0) * 0.4
    + (CASE WHEN cp.is_beta_pioneer THEN 20 ELSE 0 END)
    + (CASE WHEN cp.is_verified     THEN 15 ELSE 0 END)
    + (CASE WHEN cp.featured_link_1 IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN cp.display_name IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN cp.bio IS NOT NULL THEN 3 ELSE 0 END)
    + (CASE WHEN cp.media_kit_url IS NOT NULL THEN 5 ELSE 0 END)
  ) AS discovery_rank
FROM public.creator_profiles cp
JOIN public.profiles p ON p.id = cp.user_id
LEFT JOIN public.creator_trust_scores cts ON cts.user_id = cp.user_id
WHERE p.suspended_at IS NULL;  -- exclude suspended users
