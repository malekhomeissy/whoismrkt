-- ─────────────────────────────────────────────────────────────────────────────
-- Push notification support.
--
-- The mobile app (MRKTmobile) already registers a real Expo push token and
-- saves it to profiles.expo_push_token (added in 20260629000000), but no
-- edge function anywhere ever sends anything to Expo's push API — the
-- infrastructure collects tokens and delivers nothing. This adds the master
-- opt-out toggle (mirroring email_enabled/whatsapp_enabled) that the new
-- send-push-notification function checks before sending.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;
