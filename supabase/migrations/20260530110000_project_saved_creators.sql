-- Saved creators — businesses can bookmark creator profiles to a project.
-- This is the data model for the "Save to Project" button on Find Creators page.

CREATE TABLE IF NOT EXISTS public.project_saved_creators (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  creator_profile_id uuid        NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  saved_by           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, creator_profile_id)
);

ALTER TABLE public.project_saved_creators ENABLE ROW LEVEL SECURITY;

-- Only the user who saved a creator can view / manage their saves
CREATE POLICY "Own saved creators" ON public.project_saved_creators
  FOR ALL USING (auth.uid() = saved_by) WITH CHECK (auth.uid() = saved_by);

CREATE INDEX IF NOT EXISTS project_saved_creators_project_idx
  ON public.project_saved_creators (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS project_saved_creators_creator_idx
  ON public.project_saved_creators (creator_profile_id);
