-- ─────────────────────────────────────────────────────────────────────────────
-- Generated Assets — AI-generated visuals and videos (Higgsfield integration)
--
-- Stores all AI generation jobs for the MRKT platform.
-- provider = 'higgsfield' for Higgsfield generations.
-- Status lifecycle: generating → completed | failed
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generated_assets (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_planner_item_id   uuid        REFERENCES public.content_planner_items(id) ON DELETE SET NULL,
  prompt                    text        NOT NULL,
  provider                  text        NOT NULL DEFAULT 'higgsfield'
                                          CHECK (provider IN ('higgsfield')),
  asset_type                text        NOT NULL
                                          CHECK (asset_type IN ('image', 'video')),
  aspect_ratio              text,
  status                    text        NOT NULL DEFAULT 'generating'
                                          CHECK (status IN ('generating', 'completed', 'failed')),
  output_url                text,
  higgsfield_request_id     text,
  error_message             text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generated_assets_user_idx
  ON public.generated_assets (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generated_assets_item_idx
  ON public.generated_assets (content_planner_item_id)
  WHERE content_planner_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS generated_assets_request_idx
  ON public.generated_assets (higgsfield_request_id)
  WHERE higgsfield_request_id IS NOT NULL;

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own generated assets"
  ON public.generated_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own generated assets"
  ON public.generated_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own generated assets"
  ON public.generated_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own generated assets"
  ON public.generated_assets FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 3. updated_at trigger ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_generated_assets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER generated_assets_updated_at
  BEFORE UPDATE ON public.generated_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_generated_assets_updated_at();

-- ─── 4. Usage tracking helper view ───────────────────────────────────────────
-- Used by edge functions to check monthly usage per user.

CREATE OR REPLACE VIEW public.generated_assets_monthly_usage AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                         AS total,
  COUNT(*) FILTER (WHERE asset_type = 'image') AS images,
  COUNT(*) FILTER (WHERE asset_type = 'video') AS videos
FROM public.generated_assets
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- RLS on view: users can only see their own usage
CREATE OR REPLACE VIEW public.my_monthly_usage AS
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                         AS total,
  COUNT(*) FILTER (WHERE asset_type = 'image') AS images,
  COUNT(*) FILTER (WHERE asset_type = 'video') AS videos
FROM public.generated_assets
WHERE user_id = auth.uid()
GROUP BY DATE_TRUNC('month', created_at);
