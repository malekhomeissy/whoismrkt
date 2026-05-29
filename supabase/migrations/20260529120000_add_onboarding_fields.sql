-- Add onboarding_path and business_stage columns to profiles.
-- onboarding_path stores the user's chosen intent: creator | business_creator | business_marketing
-- business_stage stores the sub-answer for the business_marketing path only.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_path text,
  ADD COLUMN IF NOT EXISTS business_stage text;
