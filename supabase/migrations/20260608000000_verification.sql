-- ─────────────────────────────────────────────────────────────────────────────
-- Verification — automatic trust badges for creators and businesses
-- Based on profile completeness, no manual admin action required.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Teardown (idempotent) ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS auto_verify_creator  ON public.creator_profiles;
DROP TRIGGER IF EXISTS auto_verify_business ON public.business_profiles;
DROP FUNCTION IF EXISTS public.compute_creator_verification() CASCADE;
DROP FUNCTION IF EXISTS public.compute_business_verification() CASCADE;

-- ─── Add columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- ─── Creator verification trigger ────────────────────────────────────────────
-- Requirements (all 6 must be met):
--   1. display_name filled
--   2. profile_image_url set          — avatar uploaded
--   3. bio filled
--   4. platforms non-empty            — at least one platform added
--   5. audience info set              — follower_count OR audience_location OR audience_age_range
--   6. portfolio/media kit            — media_kit_url OR any featured_link set

CREATE FUNCTION public.compute_creator_verification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_verified := (
    NEW.display_name     IS NOT NULL AND trim(NEW.display_name) <> ''  AND
    NEW.profile_image_url IS NOT NULL                                   AND
    NEW.bio              IS NOT NULL AND trim(NEW.bio) <> ''           AND
    array_length(NEW.platforms, 1) IS NOT NULL AND
      array_length(NEW.platforms, 1) > 0                               AND
    (
      NEW.follower_count     IS NOT NULL OR
      NEW.audience_location  IS NOT NULL OR
      NEW.audience_age_range IS NOT NULL
    )                                                                   AND
    (
      NEW.media_kit_url   IS NOT NULL OR
      NEW.featured_link_1 IS NOT NULL OR
      NEW.featured_link_2 IS NOT NULL OR
      NEW.featured_link_3 IS NOT NULL
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_verify_creator
  BEFORE INSERT OR UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_creator_verification();

-- ─── Business verification trigger ───────────────────────────────────────────
-- Requirements (all 6 must be met):
--   1. company_name filled
--   2. logo_url set                   — logo uploaded
--   3. description filled
--   4. website filled
--   5. industry selected
--   6. location filled

CREATE FUNCTION public.compute_business_verification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_verified := (
    NEW.company_name  IS NOT NULL AND trim(NEW.company_name)  <> ''  AND
    NEW.logo_url      IS NOT NULL                                     AND
    NEW.description   IS NOT NULL AND trim(NEW.description)   <> ''  AND
    NEW.website       IS NOT NULL AND trim(NEW.website)       <> ''  AND
    NEW.industry      IS NOT NULL AND trim(NEW.industry)      <> ''  AND
    NEW.location      IS NOT NULL AND trim(NEW.location)      <> ''
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_verify_business
  BEFORE INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_business_verification();

-- ─── Backfill existing rows ───────────────────────────────────────────────────
-- Touch every existing row so the BEFORE triggers recompute is_verified.

UPDATE public.creator_profiles  SET display_name  = display_name;
UPDATE public.business_profiles SET company_name  = company_name;
