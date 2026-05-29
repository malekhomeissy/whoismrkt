
-- ENUMS
create type public.account_type as enum ('creator','business','agency','brand');
create type public.platform as enum ('instagram','tiktok');
create type public.connection_status as enum ('connected','disconnected','pending','error');
create type public.calendar_status as enum ('idea','drafted','scheduled','posted');
create type public.recommendation_priority as enum ('low','medium','high','critical');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  account_type public.account_type,
  niche text,
  goal text,
  platforms text[] default '{}',
  post_frequency text,
  biggest_problem text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- CONNECTED ACCOUNTS
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform public.platform not null,
  username text,
  platform_account_id text,
  access_token_placeholder text,
  refresh_token_placeholder text,
  connection_status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);
alter table public.connected_accounts enable row level security;
create policy "Own connected accounts" on public.connected_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger connected_accounts_touch before update on public.connected_accounts
  for each row execute function public.touch_updated_at();

-- ANALYTICS SNAPSHOTS
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform public.platform not null,
  followers int default 0,
  follower_growth int default 0,
  reach int default 0,
  impressions int default 0,
  views int default 0,
  engagement_rate numeric(5,2) default 0,
  profile_visits int default 0,
  created_at timestamptz not null default now()
);
alter table public.analytics_snapshots enable row level security;
create policy "Own analytics" on public.analytics_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.analytics_snapshots (user_id, platform, created_at desc);

-- POSTS
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform public.platform not null,
  caption text,
  hook text,
  cta text,
  thumbnail_url text,
  posted_at timestamptz,
  views int default 0,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  saves int default 0,
  reach int default 0,
  engagement_rate numeric(5,2) default 0,
  ai_analysis text,
  suggested_improvement text,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "Own posts" on public.posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CONTENT CALENDAR
create table public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform public.platform not null,
  title text not null,
  hook text,
  caption text,
  cta text,
  scheduled_date timestamptz,
  status public.calendar_status not null default 'idea',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_calendar enable row level security;
create policy "Own calendar" on public.content_calendar for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger content_calendar_touch before update on public.content_calendar
  for each row execute function public.touch_updated_at();

-- AI RECOMMENDATIONS
create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  explanation text,
  action text,
  priority public.recommendation_priority not null default 'medium',
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ai_recommendations enable row level security;
create policy "Own recommendations" on public.ai_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TRENDS (global, read-only)
create table public.trends (
  id uuid primary key default gen_random_uuid(),
  platform public.platform not null,
  title text not null,
  format text,
  sound_name text,
  difficulty text,
  why_it_works text,
  how_to_use text,
  created_at timestamptz not null default now()
);
alter table public.trends enable row level security;
create policy "Authenticated read trends" on public.trends for select using (auth.role() = 'authenticated');
