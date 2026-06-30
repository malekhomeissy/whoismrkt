-- ─────────────────────────────────────────────────────────────────────────────
-- AI Requests — unified log for all provider calls (Anthropic, OpenAI, Higgsfield)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         text        NOT NULL CHECK (provider IN ('anthropic', 'openai', 'higgsfield')),
  task_type        text        NOT NULL,
  prompt           text,
  response         text,
  asset_url        text,
  status           text        NOT NULL DEFAULT 'completed'
                                 CHECK (status IN ('completed', 'failed', 'streaming')),
  error_message    text,
  estimated_cost   numeric(10, 6),
  model            text,
  input_tokens     integer,
  output_tokens    integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_requests_user_idx
  ON public.ai_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_requests_provider_idx
  ON public.ai_requests (user_id, provider, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_requests_task_idx
  ON public.ai_requests (task_type, created_at DESC);

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own request history
CREATE POLICY "Users view own ai requests"
  ON public.ai_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Only edge functions (service role) write
-- No client INSERT policy — all writes via service role in edge functions

-- ─── Daily usage view (used by rate-limit checks) ─────────────────────────────

CREATE OR REPLACE VIEW public.ai_daily_usage AS
SELECT
  user_id,
  provider,
  DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS day,
  COUNT(*)                                           AS total_requests
FROM public.ai_requests
WHERE status != 'failed'
GROUP BY user_id, provider, DATE_TRUNC('day', created_at AT TIME ZONE 'UTC');
