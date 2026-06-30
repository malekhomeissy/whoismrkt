-- ─────────────────────────────────────────────────────────────────────────────
-- AI Router Upgrade — add latency_ms for observability
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ai_requests
  ADD COLUMN IF NOT EXISTS latency_ms integer;

COMMENT ON COLUMN public.ai_requests.latency_ms IS
  'End-to-end provider call latency in milliseconds, measured in the edge function';

CREATE INDEX IF NOT EXISTS ai_requests_latency_idx
  ON public.ai_requests (task_type, latency_ms)
  WHERE latency_ms IS NOT NULL;
