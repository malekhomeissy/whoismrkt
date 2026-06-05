-- ============================================================
-- MRKT Campaign System — V1 Migration
-- Run in Supabase SQL Editor AFTER 001_creator_profiles.sql
-- ============================================================
--
-- ARCHITECTURE
-- ─────────────────────────────────────────────────────────────
-- New tables:
--   1. campaigns             — Business campaign listings
--   2. campaign_deliverables — What the campaign requires
--   3. campaign_assets       — Brand photos, briefs, guidelines
--
-- Altered:
--   4. campaign_applications — Add campaign_id FK (was text-only)
--
-- Relationships:
--   auth.users → campaigns (one business user, many campaigns)
--   campaigns  → campaign_deliverables (one campaign, many deliverables)
--   campaigns  → campaign_assets       (one campaign, many assets)
--   campaign_applications links campaigns ↔ creator_profiles
--     applications.campaign_id       → campaigns.id
--     applications.creator_profile_id → creator_profiles.id
--
-- MRKT Connect discovery:
--   Businesses browse: creator_profiles WHERE is_published AND status = 'active'
--   Creators browse:   campaigns WHERE is_published AND status = 'active'
--   Applications are the matching layer between the two sides.
-- ============================================================


-- ── Enums ──────────────────────────────────────────────────────────────────

create type compensation_type as enum (
  'paid',
  'gifted',
  'affiliate',
  'revenue_share',
  'unpaid'
);

create type campaign_status as enum (
  'draft',
  'active',
  'paused',
  'closed',
  'completed'
);

create type campaign_asset_type as enum (
  'product_photo',
  'brand_asset',
  'campaign_brief',
  'reference',
  'brand_guidelines'
);


-- ── campaigns ─────────────────────────────────────────────────────────────

create table campaigns (
  id                           uuid          primary key default gen_random_uuid(),
  user_id                      uuid          not null references auth.users(id) on delete cascade,

  -- Business identity (embedded in V1 — no separate business_profiles table yet)
  business_name                text          not null,
  business_industry            text,
  business_website             text,
  business_instagram           text,
  business_tiktok              text,
  business_location            text,

  -- Campaign content
  title                        text          not null,
  description                  text          not null,
  product_service              text,
  campaign_goal                text,

  -- Compensation — the most visible field for creators (must be unambiguous)
  compensation_type            compensation_type not null,
  compensation_amount_fixed    numeric(10, 2),
  compensation_budget_min      numeric(10, 2),
  compensation_budget_max      numeric(10, 2),
  compensation_per_deliverable numeric(10, 2),

  -- Creator requirements
  required_niches              text[]        not null default '{}',
  min_followers                integer,
  required_country             text,
  required_language            text,
  required_platforms           text[]        not null default '{}',
  deadline                     date,

  -- Status
  status                       campaign_status not null default 'draft',
  is_published                 boolean         not null default false,

  created_at                   timestamptz   not null default now(),
  updated_at                   timestamptz   not null default now()
);

comment on column campaigns.compensation_type is 'PAID / GIFTED / AFFILIATE / REVENUE_SHARE / UNPAID — shown prominently to creators before opening the campaign.';


-- ── campaign_deliverables ─────────────────────────────────────────────────

create table campaign_deliverables (
  id               uuid        primary key default gen_random_uuid(),
  campaign_id      uuid        not null references campaigns(id) on delete cascade,
  platform         text        not null,
  content_type     text        not null,
  quantity         integer     not null default 1,
  notes            text,
  display_order    integer     not null default 0
);

comment on table campaign_deliverables is 'What the campaign requires creators to produce. E.g. 2 × Instagram Reels, 3 × TikTok Videos.';


-- ── campaign_assets ──────────────────────────────────────────────────────

create table campaign_assets (
  id            uuid                primary key default gen_random_uuid(),
  campaign_id   uuid                not null references campaigns(id) on delete cascade,
  asset_type    campaign_asset_type not null,
  url           text                not null,
  name          text,
  display_order integer             not null default 0,
  created_at    timestamptz         not null default now()
);

comment on table campaign_assets is 'Brand assets creators need to complete the campaign (product photos, brief PDFs, brand guidelines).';


-- ── Alter campaign_applications ──────────────────────────────────────────
-- Add real campaign_id FK (V1 used text fields only)

alter table campaign_applications
  add column if not exists campaign_id uuid references campaigns(id) on delete set null;

comment on column campaign_applications.campaign_id is 'NULL for legacy V1 applications. Set for all new applications.';


-- ── Indexes ───────────────────────────────────────────────────────────────

-- Campaign discovery queries
create index campaigns_discovery_idx
  on campaigns (status, is_published, compensation_type);

create index campaigns_user_id_idx
  on campaigns (user_id);

create index campaigns_niches_idx
  on campaigns using gin (required_niches);

create index campaigns_platforms_idx
  on campaigns using gin (required_platforms);

create index campaigns_deadline_idx
  on campaigns (deadline);

-- Deliverables + assets lookup
create index campaign_deliverables_campaign_idx
  on campaign_deliverables (campaign_id, display_order);

create index campaign_assets_campaign_idx
  on campaign_assets (campaign_id, display_order);

-- Applications (business side — "show me all applications for my campaigns")
create index campaign_applications_campaign_id_idx
  on campaign_applications (campaign_id, status);


-- ── Row-Level Security ────────────────────────────────────────────────────

alter table campaigns           enable row level security;
alter table campaign_deliverables enable row level security;
alter table campaign_assets       enable row level security;

-- campaigns: public read for active/published
create policy "Public can view active published campaigns"
  on campaigns for select
  using (is_published = true and status = 'active');

create policy "Owners can view all their campaigns"
  on campaigns for select
  using (auth.uid() = user_id);

create policy "Owners can create campaigns"
  on campaigns for insert
  with check (auth.uid() = user_id);

create policy "Owners can update their campaigns"
  on campaigns for update
  using (auth.uid() = user_id);

-- deliverables: mirrors campaign visibility
create policy "Public can view deliverables of published campaigns"
  on campaign_deliverables for select
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.is_published = true
        and c.status = 'active'
    )
  );

create policy "Campaign owners can manage deliverables"
  on campaign_deliverables for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.user_id = auth.uid()
    )
  );

-- assets: mirrors campaign visibility
create policy "Public can view assets of published campaigns"
  on campaign_assets for select
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.is_published = true
        and c.status = 'active'
    )
  );

create policy "Campaign owners can manage assets"
  on campaign_assets for all
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.user_id = auth.uid()
    )
  );

-- campaign_applications: business owners can view applications to their campaigns
create policy "Campaign owners can view applications"
  on campaign_applications for select
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.user_id = auth.uid()
    )
  );

create policy "Campaign owners can update application status"
  on campaign_applications for update
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.user_id = auth.uid()
    )
  );


-- ── updated_at triggers ──────────────────────────────────────────────────

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function handle_updated_at();
-- (handle_updated_at() was created in 001_creator_profiles.sql)
