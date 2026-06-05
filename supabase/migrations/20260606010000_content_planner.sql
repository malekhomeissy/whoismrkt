-- Content Planner items — AI-powered content calendar for creators and businesses.
-- Stores individual calendar events: posts, reels, campaigns, etc.

create table if not exists public.content_planner_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  title               text not null,
  platform            text not null,          -- Instagram | TikTok | YouTube | LinkedIn | X | Facebook
  content_type        text not null,          -- Reel | Story | Post | Short | Video | Thread | etc.
  scheduled_date      date not null,
  scheduled_time      time,
  status              text not null default 'planned', -- planned | drafted | posted
  hook                text,
  caption             text,
  creative_direction  text,
  notes               text,
  ai_generated        boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.content_planner_items enable row level security;

create policy "Users manage their own planner items"
  on public.content_planner_items for all
  using (auth.uid() = user_id);

create index content_planner_user_date_idx
  on public.content_planner_items (user_id, scheduled_date);

create or replace function public.update_updated_at_content_planner()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger content_planner_updated_at
  before update on public.content_planner_items
  for each row execute procedure public.update_updated_at_content_planner();
