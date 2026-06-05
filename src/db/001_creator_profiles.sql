-- ============================================================
-- MRKT Creator Profile System — V1 Migration
-- Run this entire script in your Supabase SQL Editor.
-- ============================================================
--
-- ARCHITECTURE OVERVIEW
-- ─────────────────────
-- Tables created:
--   1. creator_profiles       — Core creator identity, social links, audience stats
--   2. creator_portfolio_items — Images, videos, and media kit PDFs
--   3. campaign_applications  — Applications from creators to campaigns
--
-- Reused tables:
--   • auth.users              — User identity (Supabase managed)
--   • profiles                — Account type, onboarding path (already exists)
--
-- How Creator Profiles connect to MRKT Connect:
--   creator_profiles.user_id → auth.users.id → profiles.id
--   Businesses discover creators by querying creator_profiles
--   where is_published = true AND profile_status = 'active'.
--
-- Future work (NOT in V1):
--   • Social account verification via platform APIs
--   • Live follower count sync
--   • Instagram / TikTok OAuth connection
--   • Messaging between creators and businesses
--   • Payments and contracts
-- ============================================================


-- ── Enums ──────────────────────────────────────────────────────────────────

create type creator_type as enum (
  'influencer',
  'ugc_creator',
  'model',
  'photographer',
  'videographer',
  'content_creator'
);

create type profile_status as enum (
  'draft',
  'pending_review',
  'active',
  'suspended'
);

create type portfolio_item_type as enum (
  'image',
  'video',
  'media_kit'
);

create type application_status as enum (
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'withdrawn'
);


-- ── creator_profiles ──────────────────────────────────────────────────────

create table creator_profiles (
  id                   uuid        primary key default gen_random_uuid(),

  -- Links to the authenticated user (nullable: support future guest/invited creators)
  user_id              uuid        references auth.users(id) on delete set null,

  -- Basic information
  full_name            text        not null,
  display_name         text        not null,
  email                text        not null,
  phone                text,
  country              text        not null,
  city                 text        not null,
  bio                  text,

  -- Creator classification
  creator_type         creator_type not null,
  categories           text[]       not null default '{}',

  -- Social accounts (V1: manually entered — not verified via API)
  -- Future: replace with OAuth-verified data from platform integrations
  instagram_username   text,
  tiktok_username      text,
  youtube_username     text,
  website_url          text,

  -- Audience stats (V1: self-reported — not verified)
  -- Future: synced automatically via platform APIs
  instagram_followers  integer,
  tiktok_followers     integer,
  youtube_subscribers  integer,

  -- Media
  profile_photo_url    text,
  cover_image_url      text,

  -- Status management
  profile_status       profile_status not null default 'draft',
  is_published         boolean        not null default false,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- A user can only have one creator profile
  constraint creator_profiles_user_id_unique unique (user_id)
);

comment on column creator_profiles.instagram_followers  is 'V1: self-reported. Future: verified via Instagram Graph API.';
comment on column creator_profiles.tiktok_followers     is 'V1: self-reported. Future: verified via TikTok API.';
comment on column creator_profiles.youtube_subscribers  is 'V1: self-reported. Future: verified via YouTube Data API.';


-- ── creator_portfolio_items ───────────────────────────────────────────────

create table creator_portfolio_items (
  id                   uuid              primary key default gen_random_uuid(),
  creator_profile_id   uuid              not null references creator_profiles(id) on delete cascade,
  item_type            portfolio_item_type not null,
  url                  text              not null,
  caption              text,
  display_order        integer           not null default 0,
  created_at           timestamptz       not null default now()
);


-- ── campaign_applications ────────────────────────────────────────────────
-- V1: lightweight — stores brand name + campaign title as text.
-- Future: add campaign_id foreign key when campaigns table is built.

create table campaign_applications (
  id                   uuid              primary key default gen_random_uuid(),
  creator_profile_id   uuid              not null references creator_profiles(id) on delete cascade,
  campaign_brand       text              not null,
  campaign_title       text              not null,
  status               application_status not null default 'pending',
  note                 text,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now()
);


-- ── Indexes ───────────────────────────────────────────────────────────────

-- Creator discovery queries (businesses searching for creators)
create index creator_profiles_discovery_idx
  on creator_profiles (profile_status, is_published, creator_type);

create index creator_profiles_user_id_idx
  on creator_profiles (user_id);

create index creator_profiles_categories_idx
  on creator_profiles using gin (categories);

-- Portfolio lookup
create index creator_portfolio_items_profile_idx
  on creator_portfolio_items (creator_profile_id, display_order);

-- Application management
create index campaign_applications_profile_idx
  on campaign_applications (creator_profile_id);

create index campaign_applications_status_idx
  on campaign_applications (status);


-- ── Row-Level Security ────────────────────────────────────────────────────

alter table creator_profiles        enable row level security;
alter table creator_portfolio_items enable row level security;
alter table campaign_applications   enable row level security;

-- creator_profiles: public read for published/active profiles
create policy "Public can view active published profiles"
  on creator_profiles for select
  using (is_published = true and profile_status = 'active');

-- creator_profiles: owners can see their own profile in any state
create policy "Owners can view their own profile"
  on creator_profiles for select
  using (auth.uid() = user_id);

create policy "Owners can create their profile"
  on creator_profiles for insert
  with check (auth.uid() = user_id);

create policy "Owners can update their profile"
  on creator_profiles for update
  using (auth.uid() = user_id);

-- portfolio: public read mirrors profile visibility
create policy "Public can view portfolio of active published creators"
  on creator_portfolio_items for select
  using (
    exists (
      select 1 from creator_profiles cp
      where cp.id = creator_profile_id
        and cp.is_published = true
        and cp.profile_status = 'active'
    )
  );

create policy "Owners can manage their portfolio"
  on creator_portfolio_items for all
  using (
    exists (
      select 1 from creator_profiles cp
      where cp.id = creator_profile_id
        and cp.user_id = auth.uid()
    )
  );

-- campaign_applications: creators manage their own
create policy "Creators can view their applications"
  on campaign_applications for select
  using (
    exists (
      select 1 from creator_profiles cp
      where cp.id = creator_profile_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Creators can submit applications"
  on campaign_applications for insert
  with check (
    exists (
      select 1 from creator_profiles cp
      where cp.id = creator_profile_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Creators can withdraw applications"
  on campaign_applications for update
  using (
    exists (
      select 1 from creator_profiles cp
      where cp.id = creator_profile_id
        and cp.user_id = auth.uid()
    )
  );


-- ── updated_at trigger ────────────────────────────────────────────────────

create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger creator_profiles_updated_at
  before update on creator_profiles
  for each row execute function handle_updated_at();

create trigger campaign_applications_updated_at
  before update on campaign_applications
  for each row execute function handle_updated_at();
