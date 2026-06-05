-- Projects workspace — users organise chats, saved outputs, and campaigns into named projects.
-- Each project is a workspace container. Chats and saved outputs can be optionally linked to one.

CREATE TABLE IF NOT EXISTS public.projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS projects_user_idx ON public.projects (user_id, updated_at DESC);

-- Allow chats to belong to a project
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Allow saved outputs to be filed into a project.
-- Guarded: saved_outputs may not exist yet at this point (created in 20260530100000).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saved_outputs'
  ) THEN
    ALTER TABLE public.saved_outputs
      ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;
