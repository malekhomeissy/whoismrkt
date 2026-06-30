-- Add credits_used column and expand provider enum to include 'openai'

-- 1. Add credits_used column (1 = image, 3 = video by convention)
ALTER TABLE public.generated_assets
  ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 1;

-- 2. Expand the provider check to include openai
ALTER TABLE public.generated_assets
  DROP CONSTRAINT IF EXISTS generated_assets_provider_check;

ALTER TABLE public.generated_assets
  ADD CONSTRAINT generated_assets_provider_check
    CHECK (provider IN ('higgsfield', 'openai'));

-- 3. Drop and recreate the usage views with credit totals
DROP VIEW IF EXISTS public.generated_assets_monthly_usage;
DROP VIEW IF EXISTS public.my_monthly_usage;

CREATE VIEW public.generated_assets_monthly_usage AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at)                       AS month,
  COUNT(*)                                               AS total,
  SUM(credits_used)                                      AS credits_used,
  COUNT(*) FILTER (WHERE asset_type = 'image')           AS images,
  COUNT(*) FILTER (WHERE asset_type = 'video')           AS videos
FROM public.generated_assets
GROUP BY user_id, DATE_TRUNC('month', created_at);

CREATE VIEW public.my_monthly_usage AS
SELECT
  DATE_TRUNC('month', created_at)                       AS month,
  COUNT(*)                                               AS total,
  SUM(credits_used)                                      AS credits_used,
  COUNT(*) FILTER (WHERE asset_type = 'image')           AS images,
  COUNT(*) FILTER (WHERE asset_type = 'video')           AS videos
FROM public.generated_assets
WHERE user_id = auth.uid()
GROUP BY DATE_TRUNC('month', created_at);
