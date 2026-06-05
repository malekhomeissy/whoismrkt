-- Creates saved_outputs if it does not exist yet (with project_id already included),
-- or adds project_id to an existing saved_outputs table.
-- Safe to run in either state — fully idempotent.

-- Step 1: Create the table if it doesn't exist.
-- project_id is included here so new installs get it without a second ALTER.
CREATE TABLE IF NOT EXISTS public.saved_outputs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id     uuid        REFERENCES public.chats(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  content     text        NOT NULL,
  output_type text        NOT NULL DEFAULT 'other'
                          CHECK (output_type IN (
                            'strategy','content_plan','campaign_brief',
                            'hooks','captions','calendar','other'
                          )),
  project_id  uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Step 2: RLS (safe to call even if already enabled)
ALTER TABLE public.saved_outputs ENABLE ROW LEVEL SECURITY;

-- Step 3: Policy — only create if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'saved_outputs'
      AND policyname = 'Own saved outputs'
  ) THEN
    CREATE POLICY "Own saved outputs" ON public.saved_outputs
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Step 4: Index
CREATE INDEX IF NOT EXISTS saved_outputs_user_idx
  ON public.saved_outputs (user_id, created_at DESC);

-- Step 5: If the table already existed (from 20260529180000) and is missing project_id, add it.
ALTER TABLE public.saved_outputs
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
