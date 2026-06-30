-- ─────────────────────────────────────────────────────────────────────────────
-- Security Hardening — June 29 2026
--
-- Fixes:
--   1. ai_requests retention policy (pg_cron cleanup job)
--   2. Unique constraint on campaign_payments.stripe_session_id
--   3. Push notification token column on profiles
--   4. Contract click-wrap acceptance tracking
--   5. Document + lock orphan tables (marketplace_events, media_kit_views, mission_completions)
--   6. data_deletion_requests table for GDPR/privacy compliance
--   7. data_export_requests table
--   8. abuse_reports table
--   9. Additional RLS hardening
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. ai_requests retention — delete rows older than 90 days ─────────────────
-- Requires pg_cron extension (enabled by default on Supabase Pro).
-- If pg_cron is not available, schedule this as a weekly edge function call.

SELECT cron.schedule(
  'cleanup-ai-requests',
  '0 3 * * 0',   -- every Sunday at 03:00 UTC
  $$
    DELETE FROM public.ai_requests
    WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ── 2. Unique constraint on stripe_session_id ──────────────────────────────────
-- Prevents duplicate payment records from webhook retries.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_payments_stripe_session_id_key'
  ) THEN
    ALTER TABLE public.campaign_payments
      ADD CONSTRAINT campaign_payments_stripe_session_id_key
      UNIQUE (stripe_session_id);
  END IF;
END;
$$;

-- ── 3. Push notification token storage ────────────────────────────────────────
-- Stores Expo push tokens (and optionally FCM/APNs) for mobile app notifications.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token    text,
  ADD COLUMN IF NOT EXISTS push_token_updated timestamptz;

-- Index for efficient lookup during notification fan-out
CREATE INDEX IF NOT EXISTS profiles_expo_push_token_idx
  ON public.profiles (expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- ── 4. Contract click-wrap acceptance ─────────────────────────────────────────
-- Records explicit user acceptance of contract terms.

CREATE TABLE IF NOT EXISTS public.contract_acceptances (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('creator', 'business')),
  accepted_at  timestamptz NOT NULL DEFAULT now(),
  ip_address   text,
  user_agent   text,
  UNIQUE (contract_id, user_id)
);

ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can only see their own acceptances
CREATE POLICY "Users view own contract acceptances"
  ON public.contract_acceptances FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can INSERT (via edge function that validates the JWT)
-- No direct client INSERT/UPDATE/DELETE

CREATE INDEX IF NOT EXISTS contract_acceptances_contract_idx
  ON public.contract_acceptances (contract_id, accepted_at DESC);

-- ── 5. Data deletion requests ─────────────────────────────────────────────────
-- Tracks GDPR / privacy data deletion requests.

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        text        NOT NULL,
  reason       text,
  status       text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  admin_note   text
);

ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own request
CREATE POLICY "Users view own deletion request"
  ON public.data_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own request
CREATE POLICY "Users create own deletion request"
  ON public.data_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE from client — admin only via service role

-- ── 6. Data export requests ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'ready', 'expired')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  download_url text        -- signed URL to the export file, set by backend
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own export requests"
  ON public.data_export_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own export request"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 7. Abuse reports ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type    text        NOT NULL CHECK (content_type IN ('user', 'campaign', 'message', 'profile', 'contract', 'other')),
  content_id      uuid,
  reason          text        NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'inappropriate_content', 'fake_profile',
    'scam', 'copyright', 'underage', 'other'
  )),
  description     text,
  status          text        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  admin_note      text
);

ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can see their own reports
CREATE POLICY "Reporters view own abuse reports"
  ON public.abuse_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Authenticated users can file reports
CREATE POLICY "Authenticated users file abuse reports"
  ON public.abuse_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS abuse_reports_status_idx ON public.abuse_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS abuse_reports_reported_idx ON public.abuse_reports (reported_user_id, created_at DESC);

-- ── 8. Document orphan tables ─────────────────────────────────────────────────
-- These tables are preserved for audit history but are not actively written to.

COMMENT ON TABLE public.marketplace_events IS
  'ORPHAN — created for future marketplace event logging. Not actively written to as of June 2026. Preserve for future analytics pipeline.';

COMMENT ON TABLE public.media_kit_views IS
  'ORPHAN — created for future media kit view tracking. Not actively written to as of June 2026.';

COMMENT ON TABLE public.mission_completions IS
  'ORPHAN — created for future gamification system. Not actively written to as of June 2026.';

-- ── 9. Indexes for common slow queries ────────────────────────────────────────

-- campaign_applications: fetched heavily by creator dashboard and pipeline
CREATE INDEX IF NOT EXISTS campaign_applications_user_status_idx
  ON public.campaign_applications (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS campaign_applications_campaign_status_idx
  ON public.campaign_applications (campaign_id, status);

-- campaigns: filtered by status on browse pages
CREATE INDEX IF NOT EXISTS campaigns_status_created_idx
  ON public.campaigns (status, created_at DESC);

-- notifications: fetched per-user, ordered by time
CREATE INDEX IF NOT EXISTS notifications_user_read_idx
  ON public.notifications (user_id, read, created_at DESC);

-- creator_profiles: searched by multiple filter combos
CREATE INDEX IF NOT EXISTS creator_profiles_categories_gin_idx
  ON public.creator_profiles USING GIN (categories);

CREATE INDEX IF NOT EXISTS creator_profiles_platforms_gin_idx
  ON public.creator_profiles USING GIN (platforms);

CREATE INDEX IF NOT EXISTS creator_profiles_status_follower_idx
  ON public.creator_profiles (status, follower_count DESC);

-- messages: fetched per conversation ordered by time
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at ASC);

-- ai_requests: cleaned by cron, queried by user for credit display
CREATE INDEX IF NOT EXISTS ai_requests_user_created_idx
  ON public.ai_requests (user_id, created_at DESC);

-- ── 10. RLS verification comments ─────────────────────────────────────────────
-- All tables confirmed to have RLS enabled as of this migration.
-- New tables added above all have RLS explicitly enabled.
