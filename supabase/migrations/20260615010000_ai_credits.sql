-- ─────────────────────────────────────────────────────────────────────────────
-- AI Credits System
--
-- Tracks monthly AI credit allowances per user.
-- Beta users get 200 credits/month free.
-- Pro users get unlimited (is_pro = true bypasses credit checks).
-- Credits reset monthly at the reset_at timestamp.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_credits (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits  integer      NOT NULL DEFAULT 200,
  used_credits   integer      NOT NULL DEFAULT 0,
  reset_at       timestamptz,
  is_pro         boolean      NOT NULL DEFAULT false,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT ai_credits_user_unique UNIQUE (user_id),
  CONSTRAINT ai_credits_used_lte_total CHECK (used_credits >= 0)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS ai_credits_user_id_idx ON public.ai_credits (user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_ai_credits_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_credits_touch ON public.ai_credits;
CREATE TRIGGER ai_credits_touch
  BEFORE UPDATE ON public.ai_credits
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_credits_updated_at();

-- RLS
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credits"
  ON public.ai_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON public.ai_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.ai_credits FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_credits IS
  'Monthly AI credit allowances. Beta: 200/month. Pro: unlimited (is_pro = true).';
