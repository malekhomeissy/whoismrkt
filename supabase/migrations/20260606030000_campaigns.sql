-- ============================================================
-- MRKT Campaigns — public campaign briefs posted by businesses
-- Run AFTER business_profiles (20260531020000)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business identity
  business_name               text        NOT NULL,
  business_industry           text,
  business_website            text,
  business_instagram          text,
  business_tiktok             text,
  business_location           text,

  -- Campaign details
  title                       text        NOT NULL,
  description                 text        NOT NULL,
  product_service             text,
  campaign_goal               text,

  -- Compensation
  compensation_type           text        NOT NULL,  -- paid | gifted | affiliate | revenue_share | unpaid
  compensation_amount_fixed   numeric,
  compensation_budget_min     numeric,
  compensation_budget_max     numeric,
  compensation_per_deliverable numeric,

  -- Creator requirements
  required_niches             text[]      NOT NULL DEFAULT '{}',
  min_followers               integer,
  required_country            text,
  required_language           text,
  required_platforms          text[]      NOT NULL DEFAULT '{}',
  deadline                    date,

  -- Status
  status                      text        NOT NULL DEFAULT 'draft',  -- draft | active | paused | closed | completed
  is_published                boolean     NOT NULL DEFAULT false,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ── Campaign deliverables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_deliverables (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid    NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform      text    NOT NULL,
  content_type  text    NOT NULL,
  quantity      integer NOT NULL DEFAULT 1,
  notes         text,
  display_order integer NOT NULL DEFAULT 0
);

-- ── Campaign assets ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  asset_type    text        NOT NULL,  -- product_photo | brand_asset | campaign_brief | reference | brand_guidelines
  url           text        NOT NULL,
  name          text,
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS campaigns_user_idx
  ON public.campaigns (user_id);

CREATE INDEX IF NOT EXISTS campaigns_status_idx
  ON public.campaigns (status);

CREATE INDEX IF NOT EXISTS campaigns_published_idx
  ON public.campaigns (is_published);

CREATE INDEX IF NOT EXISTS campaign_deliverables_campaign_idx
  ON public.campaign_deliverables (campaign_id);

CREATE INDEX IF NOT EXISTS campaign_assets_campaign_idx
  ON public.campaign_assets (campaign_id);

-- ── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own campaigns
CREATE POLICY "Owners manage own campaigns"
  ON public.campaigns FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- All authenticated users can read published/active campaigns
CREATE POLICY "Authenticated users can view published campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (is_published = true AND status = 'active');

ALTER TABLE public.campaign_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign deliverables follow campaign owner"
  ON public.campaign_deliverables FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid()));

CREATE POLICY "Authenticated users can view deliverables for published campaigns"
  ON public.campaign_deliverables FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND is_published = true AND status = 'active'));

ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign assets follow campaign owner"
  ON public.campaign_assets FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND user_id = auth.uid()));

CREATE POLICY "Authenticated users can view assets for published campaigns"
  ON public.campaign_assets FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND is_published = true AND status = 'active'));

-- ── updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaigns_touch
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaigns_updated_at();
