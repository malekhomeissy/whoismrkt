-- ─────────────────────────────────────────────────────────────────────────────
-- campaign_saves — creators bookmarking opportunities for later
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.campaign_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, campaign_id)
);

alter table public.campaign_saves enable row level security;

-- Creators can only see/manage their own saves
create policy "campaign_saves_select" on public.campaign_saves
  for select using (auth.uid() = user_id);

create policy "campaign_saves_insert" on public.campaign_saves
  for insert with check (auth.uid() = user_id);

create policy "campaign_saves_delete" on public.campaign_saves
  for delete using (auth.uid() = user_id);

create index campaign_saves_user_idx     on public.campaign_saves(user_id);
create index campaign_saves_campaign_idx on public.campaign_saves(campaign_id);
