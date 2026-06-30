-- ─────────────────────────────────────────────────────────────────────────────
-- MRKT Payments Architecture — Phase 6 (Schema Prep Only)
--
-- ⚠️  DO NOT RUN YET — requires Stripe Connect account, active Stripe keys,
-- and the stripe-connect and stripe-checkout Edge Functions to be deployed.
--
-- This migration defines the complete DB schema for:
--   (a) Stripe Connect onboarding for business accounts
--   (b) Payment initiation and tracking for campaign collaborations
--   (c) Creator payout management
--
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ── Stripe Connect Integration Path ──────────────────────────────────────────
--
-- 1. BUSINESS ONBOARDING (Standard Connect)
--    Business → Stripe Connect onboarding via Express/Standard account
--    Flow: business clicks "Connect Stripe" → MRKT calls Stripe
--          /v1/accounts (type: express) → returns account_id
--          → Store in stripe_connect_accounts
--          → Redirect to AccountLink URL for onboarding
--          → Webhook: account.updated (charges_enabled = true) → mark verified
--
-- 2. PAYMENT INITIATION
--    After contract accepted:
--    Business → initiates payment for campaign
--    MRKT creates PaymentIntent on behalf of business using connected account
--    API: POST /v1/payment_intents (on_behalf_of: acct_xxx,
--         application_fee_amount: platform_fee_cents)
--    Fee: MRKT takes configurable platform fee (e.g. 10% of campaign budget)
--
-- 3. CREATOR PAYOUT
--    MRKT holds funds until deliverables approved
--    When all deliverables approved → trigger payout
--    API: POST /v1/payouts (Stripe manual payout to creator's bank)
--    Creator must have their OWN connected account (or use Direct Charges)
--    Alternative: use Stripe Payouts API directly to creator bank account
--
-- 4. PLATFORM FEE COLLECTION
--    MRKT platform fee collected via application_fee_amount on each PaymentIntent
--    Fee range: 8-15% of campaign budget
--    Configurable per campaign type (paid vs gifted vs affiliate)
--
-- ── Key Design Decisions ──────────────────────────────────────────────────────
--
--  a) Escrow pattern: Hold funds in Stripe until deliverables approved
--     → campaign_payments.status = 'held' until all deliverables 'approved'
--     → On full approval: status transitions to 'released' → trigger payout
--
--  b) Partial releases: Allow per-deliverable payment if campaign has
--     multiple creators (future: split by deliverable weight)
--
--  c) Dispute resolution: payments can enter 'disputed' status
--     → requires manual review by MRKT team
--
--  d) Creator tax: International payments require W-8BEN / W-9 collection
--     → Stripe handles this via Connect account setup
--
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Stripe Connected Accounts (businesses) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id    text        NOT NULL UNIQUE,  -- acct_xxxx
  account_type         text        NOT NULL DEFAULT 'express'
                                     CHECK (account_type IN ('express','standard','custom')),
  charges_enabled      boolean     NOT NULL DEFAULT false,
  payouts_enabled      boolean     NOT NULL DEFAULT false,
  details_submitted    boolean     NOT NULL DEFAULT false,
  country              text,
  default_currency     text,
  onboarding_url       text,       -- AccountLink URL (expires ~5 min after creation)
  onboarding_expires   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- User can only see their own Connect account
CREATE POLICY "Owner views stripe connect account"
  ON public.stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Only edge functions (service role) can INSERT/UPDATE
-- No client-side INSERT/UPDATE policy = no direct client writes

-- ─── 2. Creator Stripe Accounts (for receiving payouts) ─────────────────────

CREATE TABLE IF NOT EXISTS public.stripe_creator_accounts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id    text        NOT NULL UNIQUE,  -- acct_xxxx (separate from business)
  payouts_enabled      boolean     NOT NULL DEFAULT false,
  details_submitted    boolean     NOT NULL DEFAULT false,
  country              text,
  default_currency     text,
  bank_account_last4   text,       -- masked for display
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.stripe_creator_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator views own stripe account"
  ON public.stripe_creator_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 3. Campaign Payments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_payments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  campaign_id           uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  creator_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  business_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Amounts in smallest currency unit (cents/pence)
  gross_amount_cents    integer     NOT NULL CHECK (gross_amount_cents > 0),
  platform_fee_cents    integer     NOT NULL DEFAULT 0,
  creator_net_cents     integer     GENERATED ALWAYS AS (gross_amount_cents - platform_fee_cents) STORED,
  currency              text        NOT NULL DEFAULT 'usd',

  -- Stripe references (written by edge functions only)
  stripe_payment_intent_id  text    UNIQUE,           -- pi_xxxx
  stripe_charge_id          text    UNIQUE,           -- ch_xxxx
  stripe_payout_id          text    UNIQUE,           -- po_xxxx (creator payout)
  stripe_transfer_id        text    UNIQUE,           -- tr_xxxx (transfer to creator acct)

  -- Status lifecycle:
  -- pending → processing → held → released → completed
  --                              ↘ disputed → resolved
  --         → failed
  status                text        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN (
                                        'pending',       -- payment initiated, not yet processed
                                        'processing',    -- PaymentIntent created, awaiting confirmation
                                        'held',          -- payment confirmed, funds held pending deliverables
                                        'released',      -- deliverables approved, payout triggered
                                        'completed',     -- payout confirmed by Stripe
                                        'disputed',      -- dispute opened
                                        'resolved',      -- dispute resolved
                                        'failed',        -- payment failed
                                        'refunded'       -- refunded to business
                                      )),
  failure_reason        text,
  initiated_at          timestamptz,
  confirmed_at          timestamptz,
  released_at           timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_payments_creator_idx  ON public.campaign_payments (creator_id,  created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_payments_business_idx ON public.campaign_payments (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_payments_contract_idx ON public.campaign_payments (contract_id);
CREATE INDEX IF NOT EXISTS campaign_payments_status_idx   ON public.campaign_payments (status);

ALTER TABLE public.campaign_payments ENABLE ROW LEVEL SECURITY;

-- Business can view/initiate payments for their own campaigns
CREATE POLICY "Business views own payments"
  ON public.campaign_payments FOR SELECT
  USING (auth.uid() = business_id);

-- Creator can view payments addressed to them
CREATE POLICY "Creator views incoming payments"
  ON public.campaign_payments FOR SELECT
  USING (auth.uid() = creator_id);

-- No client INSERT — payments initiated via Edge Function only

-- ─── 4. Payment Events (audit log) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     uuid        NOT NULL REFERENCES public.campaign_payments(id) ON DELETE CASCADE,
  event_type     text        NOT NULL,  -- stripe_webhook type or internal action
  stripe_event_id text,                 -- evt_xxxx (deduplicate webhooks)
  payload        jsonb,                 -- raw Stripe event or internal context
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_payment_idx ON public.payment_events (payment_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_stripe_event_idx ON public.payment_events (stripe_event_id) WHERE stripe_event_id IS NOT NULL;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) reads/writes payment events
-- No client policies — full RLS block for security

-- ─── 5. Platform Fee Configuration ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_fee_config (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type        text        NOT NULL DEFAULT 'paid'
                                     CHECK (campaign_type IN ('paid','gifted','affiliate')),
  fee_percentage       numeric(5,2) NOT NULL DEFAULT 10.00
                                     CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  min_fee_cents        integer     NOT NULL DEFAULT 0,
  effective_from       timestamptz NOT NULL DEFAULT now(),
  effective_until      timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_fee_config ENABLE ROW LEVEL SECURITY;

-- Platform fee config is readable by authenticated users (for transparency)
CREATE POLICY "Authenticated users view fee config"
  ON public.platform_fee_config FOR SELECT
  TO authenticated
  USING (true);

-- Seed default fee configuration
INSERT INTO public.platform_fee_config (campaign_type, fee_percentage, min_fee_cents)
VALUES
  ('paid',      10.00, 0),
  ('gifted',     5.00, 0),
  ('affiliate',  8.00, 0)
ON CONFLICT DO NOTHING;

-- ─── 6. updated_at triggers ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER stripe_connect_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();

CREATE TRIGGER stripe_creator_accounts_updated_at
  BEFORE UPDATE ON public.stripe_creator_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();

CREATE TRIGGER campaign_payments_updated_at
  BEFORE UPDATE ON public.campaign_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- ── Required Edge Functions (to be built when activating payments) ────────────
--
-- 1. stripe-connect-onboard
--    POST /stripe-connect-onboard
--    → Creates Stripe Connect Express account for business
--    → Returns AccountLink URL for onboarding
--    → Stores stripe_account_id in stripe_connect_accounts
--
-- 2. stripe-connect-webhook
--    POST /stripe-connect-webhook (Stripe webhook endpoint)
--    → Handles: account.updated, account.application.authorized
--    → Updates charges_enabled / payouts_enabled in DB
--
-- 3. stripe-payment-initiate
--    POST /stripe-payment-initiate { contract_id, amount_cents }
--    → Validates contract is accepted, deliverables exist
--    → Creates PaymentIntent with application_fee
--    → Returns client_secret for front-end confirmation
--    → Inserts campaign_payments row with status='processing'
--
-- 4. stripe-payment-webhook
--    POST /stripe-payment-webhook (Stripe webhook endpoint)
--    → Handles: payment_intent.succeeded → status='held'
--    → Handles: payment_intent.payment_failed → status='failed'
--    → Handles: charge.dispute.created → status='disputed'
--    → All events logged to payment_events
--
-- 5. stripe-payout-release
--    POST /stripe-payout-release { payment_id }
--    → Validates all deliverables approved
--    → Creates Transfer to creator's Connect account
--    → Updates status='released' → on transfer.paid → 'completed'
--
-- 6. stripe-creator-onboard
--    POST /stripe-creator-onboard
--    → Creates Stripe Connect Express account for creator
--    → Returns AccountLink URL for payout setup
--
-- ── Required Environment Variables ───────────────────────────────────────────
--
--  Supabase Edge Function secrets (set via: supabase secrets set KEY=val):
--    STRIPE_SECRET_KEY         — sk_live_xxx (or sk_test_xxx for development)
--    STRIPE_WEBHOOK_SECRET     — whsec_xxx (for payment webhook)
--    STRIPE_CONNECT_WEBHOOK_SECRET — whsec_xxx (for connect webhook)
--    STRIPE_ACCOUNT_COUNTRY    — default country for platform (e.g. 'US')
--
--  Frontend env (VITE_ prefix makes them public):
--    VITE_STRIPE_PUBLISHABLE_KEY — pk_live_xxx
--
-- ─────────────────────────────────────────────────────────────────────────────
