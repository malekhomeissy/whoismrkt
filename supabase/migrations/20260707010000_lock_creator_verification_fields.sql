-- ─────────────────────────────────────────────────────────────────────────────
-- Lock down creator_profiles verification/Instagram fields.
--
-- creator_profiles' UPDATE policy is row-level only (`auth.uid() = user_id`)
-- with no column scoping. Meanwhile compute_creator_verification()
-- (20260609040000_creator_verification_tiers.sql) trusts NEW.instagram_followers
-- unconditionally: >=70,000 auto-sets is_verified=true / creator_verification_type
-- ='organic_70k' / verification_status='verified'. Today, any creator can:
--
--   PATCH /rest/v1/creator_profiles?user_id=eq.<self>
--   { "instagram_followers": 80000 }
--
-- ...and self-grant a verified badge with zero real Instagram connection. Worse,
-- the trigger's "preserve paid verification" branch checks only
-- NEW.creator_verification_type = 'paid_10k_plus' AND NEW.is_verified = true —
-- a client can set both fields directly in the same PATCH and skip payment
-- entirely.
--
-- instagram-connect and instagram-sync (the only legitimate writers) already
-- use the service-role client for these writes, so this trigger can safely key
-- off auth.role() = 'service_role'. admin_verify_creator() is SECURITY DEFINER
-- but runs under the calling admin's own session (auth.role() is still
-- 'authenticated' inside it) — it's updated in this same migration to set a
-- transaction-local bypass flag before writing is_verified, since it already
-- checks is_admin() itself.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_creator_verification_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Trusted paths bypass entirely: service-role writes (Instagram OAuth sync)
  -- and the transaction-local flag set by admin_verify_creator() below.
  IF auth.role() = 'service_role'
     OR coalesce(current_setting('app.bypass_verification_lock', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.instagram_followers           := NULL;
    NEW.instagram_connected           := false;
    NEW.instagram_user_id             := NULL;
    NEW.instagram_profile_picture_url := NULL;
    NEW.instagram_followers_synced_at := NULL;
    NEW.is_verified                   := false;
    NEW.creator_verification_type     := 'none';
    NEW.verification_status           := 'not_eligible';
  ELSE
    -- Silently revert to the prior value rather than raising — a client
    -- request that legitimately edits unrelated fields (bio, niche, etc.)
    -- and happens to also echo back a stale copy of these fields should
    -- still succeed; only the tampering attempt is neutralized.
    NEW.instagram_followers           := OLD.instagram_followers;
    NEW.instagram_connected           := OLD.instagram_connected;
    NEW.instagram_user_id             := OLD.instagram_user_id;
    NEW.instagram_profile_picture_url := OLD.instagram_profile_picture_url;
    NEW.instagram_followers_synced_at := OLD.instagram_followers_synced_at;
    NEW.is_verified                   := OLD.is_verified;
    NEW.creator_verification_type     := OLD.creator_verification_type;
    NEW.verification_status           := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Named to sort alphabetically before "auto_verify_creator" so it runs first
-- among the BEFORE triggers on this table (Postgres fires same-event BEFORE
-- triggers in name order) — it must revert any tampered instagram_followers
-- value before auto_verify_creator recomputes derived verification state from it.
DROP TRIGGER IF EXISTS aaa_protect_creator_verification_fields ON public.creator_profiles;
CREATE TRIGGER aaa_protect_creator_verification_fields
  BEFORE INSERT OR UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_creator_verification_fields();

-- ─── Update admin_verify_creator to bypass the new lock ──────────────────────
-- Unchanged authorization logic (is_admin() guard, admin_action_log entry) —
-- only addition is the transaction-local bypass flag around the UPDATE.

CREATE OR REPLACE FUNCTION public.admin_verify_creator(
  p_creator_id uuid,
  p_admin_id   uuid,
  p_note       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM set_config('app.bypass_verification_lock', 'true', true);

  UPDATE public.creator_profiles
  SET is_verified = true
  WHERE id = p_creator_id;

  INSERT INTO public.admin_action_log (admin_id, action, target_id, target_type, payload)
  VALUES (auth.uid(), 'verify_creator', p_creator_id, 'creator_profile', jsonb_build_object('note', p_note));
END;
$$;
