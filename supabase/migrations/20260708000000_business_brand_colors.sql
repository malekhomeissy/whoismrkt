-- ============================================================
-- Brand Colors — the Studio "Brand Kit" tab has been reading/writing
-- business_profiles.brand_colors since it shipped, but the column
-- never existed, so every save silently no-op'd (the UI showed
-- "Brand colors saved" regardless of outcome). The tab is shown to
-- both roles, and creator_profiles never had an equivalent column
-- either, so every creator save also silently matched zero rows.
-- ============================================================

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS brand_colors text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS brand_colors text[] NOT NULL DEFAULT '{}'::text[];
