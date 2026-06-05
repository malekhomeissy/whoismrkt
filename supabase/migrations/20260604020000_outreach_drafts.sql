-- project_outreach_drafts
-- Structured outreach drafts (typed, with subject / short / full versions)
-- generated for a specific creator inside a project.

create table if not exists project_outreach_drafts (
  id                 uuid        default gen_random_uuid() primary key,
  project_id         uuid        references projects(id)         on delete cascade not null,
  creator_profile_id uuid        references creator_profiles(id) on delete cascade not null,
  user_id            uuid        references auth.users(id)       on delete cascade not null,
  draft_type         text                                                           not null,
  subject            text,
  short_version      text,
  full_version       text,
  created_at         timestamptz default now()                                      not null
);

alter table project_outreach_drafts enable row level security;

create policy "Users manage own outreach drafts"
  on project_outreach_drafts
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create index project_outreach_drafts_project_idx on project_outreach_drafts (project_id);
create index project_outreach_drafts_user_idx    on project_outreach_drafts (user_id);
create index project_outreach_drafts_creator_idx on project_outreach_drafts (creator_profile_id);
