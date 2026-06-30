-- Fix: instagram_connected and related columns were not applied from 20260609060000
-- Also replace the broken trigger that references these columns

-- ── Add missing columns ──────────────────────────────────────────────────────
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS instagram_connected            boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_user_id             text,
  ADD COLUMN IF NOT EXISTS instagram_followers_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram_profile_picture_url text;

-- ── Create oauth tokens table if missing ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creator_oauth_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider     text        NOT NULL,
  access_token text        NOT NULL,
  ig_user_id   text,
  expires_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.creator_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- ── Fix the broken trigger ───────────────────────────────────────────────────
-- Drop and recreate so it now safely uses the column that actually exists
DROP TRIGGER IF EXISTS notify_on_instagram_verified ON public.creator_profiles;
DROP FUNCTION IF EXISTS public.notify_on_creator_verified();

CREATE OR REPLACE FUNCTION public.notify_on_creator_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Fire when instagram_connected transitions false/null → true
  IF (OLD.instagram_connected IS DISTINCT FROM TRUE) AND NEW.instagram_connected = TRUE THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'verified',
      'Your Instagram account is verified',
      'Your follower count is now confirmed. Your MRKT verification status has been updated.',
      '/verification'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_instagram_verified
  AFTER UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_creator_verified();
