-- Beta Pioneer badge (creators) + Beta Partner badge (businesses)
-- Marks early adopters who joined during the beta phase.
-- Creator: gold bolt badge displayed on their profile.
-- Business: "Beta Partner" label shown on their campaigns and in-app.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_beta_pioneer boolean NOT NULL DEFAULT false;

-- Creator profiles: denormalized for fast display on creator cards
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS is_beta_pioneer boolean NOT NULL DEFAULT false;

-- Business profiles: early-partner flag, set manually by founders
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS is_beta_partner boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_beta_pioneer IS
  'True for users who joined during the MRKT beta period. Shows a gold bolt badge on their profile.';

COMMENT ON COLUMN public.creator_profiles.is_beta_pioneer IS
  'Denormalized from profiles.is_beta_pioneer for fast display on creator cards.';

COMMENT ON COLUMN public.business_profiles.is_beta_partner IS
  'Set by founders for early business partners. Shows a "Beta Partner" badge on their campaigns.';

-- Campaigns: beta campaign flag (founder-seeded, founder-set)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS is_beta_campaign boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaigns.is_beta_campaign IS
  'Founder-set flag to mark featured beta campaigns. Shows "Beta Partner" badge in opportunity cards.';
