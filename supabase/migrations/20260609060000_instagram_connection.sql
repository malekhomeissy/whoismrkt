-- ─────────────────────────────────────────────────────────────────────────────
-- Instagram OAuth Connection
--
-- Verification is now powered by real Instagram Graph API data.
-- instagram_followers is only written by edge functions (never by the client).
-- Manual entry is not trusted for verification.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── New columns on creator_profiles ─────────────────────────────────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS instagram_connected            boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_user_id             text,
  ADD COLUMN IF NOT EXISTS instagram_followers_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram_profile_picture_url text;

-- ─── Secure OAuth token store ─────────────────────────────────────────────────
-- Edge functions (service role) read/write this table.
-- RLS blocks all client-side access — tokens are never exposed to the browser.

CREATE TABLE IF NOT EXISTS public.creator_oauth_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider     text        NOT NULL,           -- "instagram"
  access_token text        NOT NULL,
  ig_user_id   text,                           -- IG account ID for sync calls
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.creator_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no client access (service role bypasses RLS)
