-- ─────────────────────────────────────────────────────────────────────────────
-- Creator Verification Tiers
-- Verification = Instagram followers. Profile completion is onboarding.
--
-- Tiers:
--   organic_70k   — 70,000+ Instagram followers → auto-verified
--   paid_10k_plus — purchased (10,000+ required, set by payment flow)
--   none          — not verified
--
-- Status:
--   not_eligible  — under 10,000 Instagram followers
--   eligible      — 10,000–69,999 followers (can purchase)
--   verified      — is_verified = true
--   pending_payment — payment initiated (set by payment flow)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── New columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS instagram_followers integer;

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS creator_verification_type text NOT NULL DEFAULT 'none'
    CHECK (creator_verification_type IN ('none', 'organic_70k', 'paid_10k_plus'));

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'not_eligible'
    CHECK (verification_status IN ('not_eligible', 'eligible', 'verified', 'pending_payment'));

-- ─── Replace creator verification trigger ────────────────────────────────────
-- Logic: Instagram followers only. No profile completeness checks.

DROP TRIGGER  IF EXISTS auto_verify_creator              ON public.creator_profiles;
DROP FUNCTION IF EXISTS public.compute_creator_verification() CASCADE;

CREATE FUNCTION public.compute_creator_verification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  ig_followers integer;
BEGIN
  ig_followers := COALESCE(NEW.instagram_followers, 0);

  -- Preserve paid verification — only the payment flow should grant or revoke it.
  IF NEW.creator_verification_type = 'paid_10k_plus' AND NEW.is_verified = true THEN
    NEW.verification_status := 'verified';
    RETURN NEW;
  END IF;

  -- Automatic: 70,000+ Instagram followers
  IF ig_followers >= 70000 THEN
    NEW.is_verified               := true;
    NEW.creator_verification_type := 'organic_70k';
    NEW.verification_status       := 'verified';

  -- Eligible for paid: 10,000–69,999
  ELSIF ig_followers >= 10000 THEN
    NEW.is_verified               := false;
    NEW.creator_verification_type := 'none';
    NEW.verification_status       := 'eligible';

  -- Not eligible: under 10,000
  ELSE
    NEW.is_verified               := false;
    NEW.creator_verification_type := 'none';
    NEW.verification_status       := 'not_eligible';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_verify_creator
  BEFORE INSERT OR UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_creator_verification();

-- ─── Backfill existing rows ───────────────────────────────────────────────────

UPDATE public.creator_profiles SET display_name = display_name;
