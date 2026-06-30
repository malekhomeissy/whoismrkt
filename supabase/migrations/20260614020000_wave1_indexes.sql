-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 1: Performance Indexes
--
-- Critical query paths:
--   1. campaign_applications  — business pipeline + creator history
--   2. project_saved_creators — pipeline board queries
--   3. marketplace_events     — analytics aggregations
--   4. notifications          — unread badge count
--   5. user_activity_log      — session dedup
-- ─────────────────────────────────────────────────────────────────────────────

-- ── campaign_applications ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ca_status_idx
  ON public.campaign_applications (status);

CREATE INDEX IF NOT EXISTS ca_campaign_status_idx
  ON public.campaign_applications (campaign_id, status);

CREATE INDEX IF NOT EXISTS ca_user_created_idx
  ON public.campaign_applications (user_id, created_at DESC);

-- ── project_saved_creators ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS psc_status_idx
  ON public.project_saved_creators (status);

CREATE INDEX IF NOT EXISTS psc_project_status_idx
  ON public.project_saved_creators (project_id, status);

-- ── marketplace_events (additional — base indexes in foundation migration) ───

CREATE INDEX IF NOT EXISTS me_type_actor_idx
  ON public.marketplace_events (event_type, actor_user_id, created_at DESC);

-- ── notifications ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS notif_user_unread_idx
  ON public.notifications (user_id, read, created_at DESC);

-- ── user_activity_log ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ual_user_event_idx
  ON public.user_activity_log (user_id, event_type, created_at DESC);

-- ── match_score_cache (quick top-scores per campaign) ────────────────────────
-- Covers: ORDER BY score DESC per campaign. Expired rows filtered in query.

CREATE INDEX IF NOT EXISTS msc_campaign_score_idx
  ON public.match_score_cache (campaign_id, score DESC, expires_at DESC);
