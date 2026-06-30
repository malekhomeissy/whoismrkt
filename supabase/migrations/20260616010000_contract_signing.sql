-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint: Contract Signing, Deliverables, Payments, Search, Business Profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Contract signing V2 ────────────────────────────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signed_at            timestamptz,
  ADD COLUMN IF NOT EXISTS signer_user_id       uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS signer_email         text,
  ADD COLUMN IF NOT EXISTS signer_ip            text,
  ADD COLUMN IF NOT EXISTS signer_user_agent    text,
  ADD COLUMN IF NOT EXISTS contract_snapshot    jsonb,
  ADD COLUMN IF NOT EXISTS decline_note         text;

-- ── 2. sign_contract() RPC ────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.sign_contract(uuid, text, text);

CREATE OR REPLACE FUNCTION public.sign_contract(
  p_contract_id  uuid,
  p_ip_address   text DEFAULT NULL,
  p_user_agent   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract record;
  v_email    text;
  v_snapshot jsonb;
BEGIN
  SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Contract not found');
  END IF;

  IF v_contract.creator_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  IF v_contract.status != 'sent' THEN
    RETURN jsonb_build_object('error', 'Contract not signable', 'status', v_contract.status);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  v_snapshot := to_jsonb(v_contract) || jsonb_build_object('snapshot_at', now());

  UPDATE public.contracts SET
    status             = 'accepted',
    accepted_at        = now(),
    signed_at          = now(),
    signer_user_id     = auth.uid(),
    signer_email       = v_email,
    signer_ip          = p_ip_address,
    signer_user_agent  = p_user_agent,
    contract_snapshot  = v_snapshot
  WHERE id = p_contract_id;

  RETURN jsonb_build_object('success', true, 'signed_at', now(), 'contract_id', p_contract_id);
END;
$$;

-- ── 3. Deliverables: file upload columns ──────────────────────────────────────

ALTER TABLE public.campaign_deliverable_submissions
  ADD COLUMN IF NOT EXISTS file_url       text,
  ADD COLUMN IF NOT EXISTS file_name      text,
  ADD COLUMN IF NOT EXISTS file_size      bigint,
  ADD COLUMN IF NOT EXISTS file_type      text,
  ADD COLUMN IF NOT EXISTS thumbnail_url  text,
  ADD COLUMN IF NOT EXISTS deadline       timestamptz,
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0;

-- Revision thread table
CREATE TABLE IF NOT EXISTS public.deliverable_revisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES public.campaign_deliverable_submissions(id) ON DELETE CASCADE,
  requester_id    uuid NOT NULL REFERENCES auth.users(id),
  feedback        text NOT NULL,
  attachments     jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliverable_revisions_submission_idx
  ON public.deliverable_revisions (submission_id, created_at DESC);

ALTER TABLE public.deliverable_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view revisions"
  ON public.deliverable_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_deliverable_submissions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = submission_id
        AND (s.creator_id = auth.uid() OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Business inserts revisions"
  ON public.deliverable_revisions FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- ── 4. Campaign payments (simplified Stripe Checkout path) ────────────────────
-- Uses CREATE TABLE IF NOT EXISTS — safe if already created by payments_architecture migration

CREATE TABLE IF NOT EXISTS public.campaign_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  campaign_id           uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  creator_id            uuid NOT NULL REFERENCES auth.users(id),
  business_id           uuid NOT NULL REFERENCES auth.users(id),
  gross_amount_cents    integer NOT NULL CHECK (gross_amount_cents > 0),
  platform_fee_cents    integer NOT NULL DEFAULT 0,
  creator_net_cents     integer GENERATED ALWAYS AS (gross_amount_cents - platform_fee_cents) STORED,
  currency              text NOT NULL DEFAULT 'usd',
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending', 'awaiting_payment', 'paid',
                            'deliverable_submitted', 'approved',
                            'payout_pending', 'payout_completed',
                            'disputed', 'refunded', 'failed'
                          )),
  stripe_session_id     text UNIQUE,
  stripe_payment_intent text UNIQUE,
  stripe_charge_id      text UNIQUE,
  payment_url           text,
  receipt_url           text,
  notes                 text,
  admin_payout_note     text,
  initiated_at          timestamptz,
  paid_at               timestamptz,
  approved_at           timestamptz,
  payout_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Add columns if table pre-existed from payments_architecture migration
ALTER TABLE public.campaign_payments
  ADD COLUMN IF NOT EXISTS stripe_session_id     text,
  ADD COLUMN IF NOT EXISTS payment_url           text,
  ADD COLUMN IF NOT EXISTS receipt_url           text,
  ADD COLUMN IF NOT EXISTS admin_payout_note     text,
  ADD COLUMN IF NOT EXISTS approved_at           timestamptz,
  ADD COLUMN IF NOT EXISTS payout_at             timestamptz;

CREATE INDEX IF NOT EXISTS campaign_payments_creator_idx  ON public.campaign_payments (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_payments_business_idx ON public.campaign_payments (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_payments_status_idx   ON public.campaign_payments (status);

ALTER TABLE public.campaign_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_payments' AND policyname = 'Business sees own payments'
  ) THEN
    CREATE POLICY "Business sees own payments"
      ON public.campaign_payments FOR SELECT USING (auth.uid() = business_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_payments' AND policyname = 'Creator sees incoming payments'
  ) THEN
    CREATE POLICY "Creator sees incoming payments"
      ON public.campaign_payments FOR SELECT USING (auth.uid() = creator_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_payments' AND policyname = 'Business initiates payment'
  ) THEN
    CREATE POLICY "Business initiates payment"
      ON public.campaign_payments FOR INSERT WITH CHECK (auth.uid() = business_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS campaign_payments_updated_at ON public.campaign_payments;
CREATE TRIGGER campaign_payments_updated_at
  BEFORE UPDATE ON public.campaign_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();

-- ── 5. Full-text search on creator_profiles ───────────────────────────────────

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS creator_profiles_search_idx
  ON public.creator_profiles USING GIN (search_vector);

CREATE OR REPLACE FUNCTION public.update_creator_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.niche, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.categories, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.platforms, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.location_country, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_profiles_search_update ON public.creator_profiles;
CREATE TRIGGER creator_profiles_search_update
  BEFORE INSERT OR UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_creator_search_vector();

-- search_vector backfill happens automatically via trigger on next row update

-- ── 6. search_creators() RPC ─────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.search_creators(text, text[], text[], text, boolean, boolean, integer, integer, text, integer, integer);

CREATE OR REPLACE FUNCTION public.search_creators(
  p_query         text    DEFAULT NULL,
  p_platforms     text[]  DEFAULT NULL,
  p_categories    text[]  DEFAULT NULL,
  p_country       text    DEFAULT NULL,
  p_is_verified   boolean DEFAULT NULL,
  p_is_pioneer    boolean DEFAULT NULL,
  p_min_followers integer DEFAULT NULL,
  p_max_followers integer DEFAULT NULL,
  p_compensation  text    DEFAULT NULL,
  p_limit         integer DEFAULT 24,
  p_offset        integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  user_id           uuid,
  display_name      text,
  username          text,
  bio               text,
  profile_image_url text,
  categories        text[],
  platforms         text[],
  niche             text,
  location_country  text,
  location          text,
  follower_count    integer,
  avg_rating        float,
  rate_range        text,
  is_verified       boolean,
  is_beta_pioneer   boolean,
  featured_link_1   text,
  trust_tier        text,
  discovery_rank    numeric,
  search_rank       real,
  total_count       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_query tsquery;
BEGIN
  IF p_query IS NOT NULL AND trim(p_query) != '' THEN
    BEGIN
      v_query := websearch_to_tsquery('english', p_query);
    EXCEPTION WHEN others THEN
      v_query := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      cp.id,
      cp.user_id,
      cp.display_name,
      cp.username,
      cp.bio,
      cp.profile_image_url,
      cp.categories,
      cp.platforms,
      cp.niche,
      cp.location_country,
      cp.location,
      cp.follower_count,
      cp.avg_rating,
      cp.rate_range,
      cp.is_verified,
      cp.is_beta_pioneer,
      cp.featured_link_1,
      COALESCE(ts.tier, 'new') as trust_tier,
      (
        COALESCE(ts.score::numeric, 0) * 0.4
        + (CASE WHEN cp.is_beta_pioneer THEN 20 ELSE 0 END)
        + (CASE WHEN cp.is_verified THEN 15 ELSE 0 END)
        + (CASE WHEN cp.featured_link_1 IS NOT NULL THEN 10 ELSE 0 END)
        + (CASE WHEN cp.display_name IS NOT NULL THEN 2 ELSE 0 END)
        + (CASE WHEN cp.bio IS NOT NULL THEN 3 ELSE 0 END)
      ) as discovery_rank,
      CASE WHEN v_query IS NOT NULL AND cp.search_vector IS NOT NULL
        THEN ts_rank(cp.search_vector, v_query)
        ELSE 0
      END as search_rank,
      COUNT(*) OVER () as total_count
    FROM public.creator_profiles cp
    JOIN public.profiles p ON p.id = cp.user_id
    LEFT JOIN public.creator_trust_scores ts ON ts.user_id = cp.user_id
    WHERE
      cp.is_public = true
      AND cp.status = 'active'
      AND p.suspended_at IS NULL
      AND (v_query IS NULL OR cp.search_vector IS NULL OR cp.search_vector @@ v_query
           OR cp.display_name ILIKE '%' || p_query || '%'
           OR cp.username ILIKE '%' || p_query || '%')
      AND (p_platforms IS NULL OR cp.platforms && p_platforms)
      AND (p_categories IS NULL OR cp.categories && p_categories)
      AND (p_country IS NULL OR cp.location_country ILIKE p_country)
      AND (p_is_verified IS NULL OR cp.is_verified = p_is_verified)
      AND (p_is_pioneer IS NULL OR cp.is_beta_pioneer = p_is_pioneer)
      AND (p_min_followers IS NULL OR cp.follower_count >= p_min_followers)
      AND (p_max_followers IS NULL OR cp.follower_count <= p_max_followers)
      AND (p_compensation IS NULL OR p_compensation = 'any'
           OR (p_compensation = 'paid' AND cp.accepts_paid)
           OR (p_compensation = 'gifted' AND cp.accepts_gifted)
           OR (p_compensation = 'affiliate' AND cp.accepts_affiliate))
  )
  SELECT
    b.id, b.user_id, b.display_name, b.username, b.bio,
    b.profile_image_url, b.categories, b.platforms, b.niche,
    b.location_country, b.location, b.follower_count, b.avg_rating,
    b.rate_range, b.is_verified, b.is_beta_pioneer, b.featured_link_1,
    b.trust_tier, b.discovery_rank, b.search_rank, b.total_count
  FROM base b
  ORDER BY
    CASE WHEN v_query IS NOT NULL THEN b.search_rank ELSE 0 END DESC,
    b.discovery_rank DESC,
    b.follower_count DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ── 7. Business profile: add is_verified column if missing ────────────────────

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo_url    text,
  ADD COLUMN IF NOT EXISTS website     text,
  ADD COLUMN IF NOT EXISTS description text;

-- ── 8. AI recommendations upsert helper ──────────────────────────────────────

DROP FUNCTION IF EXISTS public.upsert_ai_recommendation(uuid, text, text, text, int, text, text, jsonb, timestamptz);

CREATE OR REPLACE FUNCTION public.upsert_ai_recommendation(
  p_user_id      uuid,
  p_type         text,
  p_title        text,
  p_body         text,
  p_priority     int         DEFAULT 5,
  p_action_label text        DEFAULT NULL,
  p_action_link  text        DEFAULT NULL,
  p_metadata     jsonb       DEFAULT NULL,
  p_expires_at   timestamptz DEFAULT (now() + interval '7 days')
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.ai_recommendations (
    user_id, type, title, body,
    action_label, action_link, meta, expires_at, status
  ) VALUES (
    p_user_id, p_type, p_title, p_body,
    p_action_label, p_action_link, p_metadata, p_expires_at, 'active'
  )
  ON CONFLICT (user_id, type)
  DO UPDATE SET
    title        = EXCLUDED.title,
    body         = EXCLUDED.body,
    action_label = EXCLUDED.action_label,
    action_link  = EXCLUDED.action_link,
    meta         = EXCLUDED.meta,
    expires_at   = EXCLUDED.expires_at,
    status       = 'active'
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_recommendations_user_type_unique'
  ) THEN
    ALTER TABLE public.ai_recommendations
      ADD CONSTRAINT ai_recommendations_user_type_unique UNIQUE (user_id, type);
  END IF;
EXCEPTION WHEN others THEN NULL;
END;
$$;

-- ── 9. Business public profile RPC ────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_business_public_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_business_public_profile(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',              bp.id,
    'user_id',         bp.user_id,
    'company_name',    bp.company_name,
    'industry',        bp.industry,
    'company_size',    bp.company_size,
    'website',         bp.website,
    'location',        bp.location,
    'description',     bp.description,
    'logo_url',        bp.logo_url,
    'is_verified',     COALESCE(bp.is_verified, false),
    'campaign_count',  (
      SELECT COUNT(*) FROM public.campaigns
      WHERE business_id = bp.user_id AND status IN ('active', 'completed')
    ),
    'active_campaigns', (
      SELECT COUNT(*) FROM public.campaigns
      WHERE business_id = bp.user_id AND status = 'active'
    ),
    'created_at',      bp.created_at
  )
  INTO v_result
  FROM public.business_profiles bp
  WHERE bp.user_id = p_business_id;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'Business profile not found'));
END;
$$;
