-- ============================================================
-- Creator Analytics — event tracking + creator-read RLS for saves
-- ============================================================

-- ── Event tracking table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.creator_analytics_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id  uuid        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  event_type          text        NOT NULL
                      CHECK (event_type IN ('profile_viewed', 'appeared_in_matching', 'saved_to_project', 'profile_updated')),
  meta                jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS creator_analytics_events_profile_idx
  ON public.creator_analytics_events (creator_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS creator_analytics_events_type_idx
  ON public.creator_analytics_events (creator_profile_id, event_type);

-- ── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.creator_analytics_events ENABLE ROW LEVEL SECURITY;

-- Creators can read their own events
CREATE POLICY "Creators read own events"
  ON public.creator_analytics_events FOR SELECT
  USING (
    creator_profile_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Any authenticated user can insert events (for view/matching tracking)
CREATE POLICY "Authenticated users insert events"
  ON public.creator_analytics_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── Allow creators to read saves of their own profile ───────────────────────
-- (needed for Saved By Businesses count + Projects Interested In count)

CREATE POLICY "Creators read saves of own profile"
  ON public.project_saved_creators FOR SELECT
  USING (
    creator_profile_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );
