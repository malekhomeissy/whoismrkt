-- ─────────────────────────────────────────────────────────────────────────────
-- Minimal consent record. Previously signup had NO consent capture at all —
-- the "Terms & Privacy" text on the login page was an unlinked, non-interactive
-- <span>, and supabase.auth.signUp() fired unconditionally. This table backs a
-- required, linked consent checkbox added to src/routes/login.tsx.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_consents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text        NOT NULL DEFAULT 'terms_and_privacy',
  accepted_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_consents_user_type_unique UNIQUE (user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS user_consents_user_id_idx ON public.user_consents (user_id);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own consent"
  ON public.user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own consent"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_consents IS
  'Records affirmative consent to Terms of Service / Privacy Policy at signup. Insert-only from the client — never updated or deleted by users.';
