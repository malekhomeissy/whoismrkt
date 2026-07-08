-- ─────────────────────────────────────────────────────────────────────────────
-- Recreate public.abuse_reports.
--
-- Migration 20260629000000_security_hardening.sql created this table and is
-- recorded as applied (`supabase migration list` shows it applied on both
-- local and remote), but the table does not exist in the live database today
-- (confirmed via `supabase gen types` against the linked project — it is
-- absent from both Tables and Views). It was evidently dropped outside the
-- migration system at some point after being created. Every feature that
-- depends on it (supabase/functions/abuse-report, supabase/functions/data-export,
-- the admin Abuse Reports tab) has been silently broken since.
--
-- Definition mirrors the original migration exactly; CREATE TABLE IF NOT
-- EXISTS makes this safe to run whether or not the table still exists.
-- ─────────────────────────────────────────────────────────────────────────────

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

DROP POLICY IF EXISTS "Reporters view own abuse reports" ON public.abuse_reports;
CREATE POLICY "Reporters view own abuse reports"
  ON public.abuse_reports FOR SELECT
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Authenticated users file abuse reports" ON public.abuse_reports;
CREATE POLICY "Authenticated users file abuse reports"
  ON public.abuse_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Admins need to read/resolve every report, not just their own — the original
-- migration only granted reporters SELECT on their own rows, which would have
-- left the admin Abuse Reports tab unable to see anything even once the table
-- existed. is_admin() is already defined by 20260616000000_admin_security.sql.
DROP POLICY IF EXISTS "Admins manage all abuse reports" ON public.abuse_reports;
CREATE POLICY "Admins manage all abuse reports"
  ON public.abuse_reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS abuse_reports_status_idx ON public.abuse_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS abuse_reports_reported_idx ON public.abuse_reports (reported_user_id, created_at DESC);
