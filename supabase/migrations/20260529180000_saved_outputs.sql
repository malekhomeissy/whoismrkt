-- Saved AI outputs — users can bookmark any assistant message to revisit later.
-- output_type categorises what was saved so the workspace can filter by type.

CREATE TABLE public.saved_outputs (
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
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own saved outputs" ON public.saved_outputs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX saved_outputs_user_idx ON public.saved_outputs (user_id, created_at DESC);
