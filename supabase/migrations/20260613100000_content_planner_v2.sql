-- Content Planner V2 — rich AI fields and plan session history

ALTER TABLE public.content_planner_items
  ADD COLUMN IF NOT EXISTS content_idea  text,
  ADD COLUMN IF NOT EXISTS cta           text,
  ADD COLUMN IF NOT EXISTS why_it_works  text,
  ADD COLUMN IF NOT EXISTS post_goal     text,
  ADD COLUMN IF NOT EXISTS session_id    uuid;

-- Plan generation sessions for history
CREATE TABLE IF NOT EXISTS public.content_plan_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL DEFAULT 'Content Plan',
  weeks       integer     NOT NULL DEFAULT 1,
  goal        text        NOT NULL DEFAULT 'engagement',
  frequency   integer     NOT NULL DEFAULT 5,
  platforms   text[]      NOT NULL DEFAULT '{}',
  item_count  integer     NOT NULL DEFAULT 0,
  model       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_plan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plan sessions"
  ON public.content_plan_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS content_plan_sessions_user_idx
  ON public.content_plan_sessions (user_id, created_at DESC);

ALTER TABLE public.content_planner_items
  ADD CONSTRAINT fk_content_plan_session
  FOREIGN KEY (session_id)
  REFERENCES public.content_plan_sessions(id)
  ON DELETE SET NULL;
