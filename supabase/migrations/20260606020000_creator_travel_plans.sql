-- Creator travel plans — lets creators announce future trips so businesses can
-- discover and book them before they arrive.

create table if not exists public.creator_travel_plans (
  id                    uuid primary key default gen_random_uuid(),
  creator_profile_id    uuid references public.creator_profiles(id) on delete cascade not null,
  user_id               uuid references auth.users(id) on delete cascade not null,
  destination_city      text not null,
  destination_country   text not null,
  destination_lat       double precision,
  destination_lng       double precision,
  start_date            date not null,
  end_date              date not null,
  notes                 text,
  -- public: anyone | members: authenticated MRKT users | private: only the creator
  visibility            text not null default 'members' check (visibility in ('public', 'members', 'private')),
  created_at            timestamptz default now()
);

alter table public.creator_travel_plans enable row level security;

-- Creator can manage their own travel plans
create policy "Creators manage own travel plans"
  on public.creator_travel_plans for all
  using (auth.uid() = user_id);

-- Authenticated users can view public/members plans
create policy "Members see non-private travel plans"
  on public.creator_travel_plans for select
  using (
    visibility in ('public', 'members')
    and auth.uid() is not null
  );

-- Public access for fully public plans
create policy "Anyone sees public travel plans"
  on public.creator_travel_plans for select
  using (visibility = 'public');

create index creator_travel_plans_profile_idx
  on public.creator_travel_plans (creator_profile_id, start_date);

create index creator_travel_plans_date_idx
  on public.creator_travel_plans (start_date, end_date)
  where visibility in ('public', 'members');
