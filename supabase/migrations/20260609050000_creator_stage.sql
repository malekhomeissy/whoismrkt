-- ─────────────────────────────────────────────────────────────────────────────
-- Creator Stage
-- Captures where a creator is in their journey.
-- Used for profile display, AI context, and onboarding UX.
--
-- Values:
--   beginner    — just starting out, no portfolio expected
--   growing     — building audience and content history (default)
--   established — proven track record, rich portfolio
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS creator_stage text NOT NULL DEFAULT 'growing'
    CHECK (creator_stage IN ('beginner', 'growing', 'established'));
