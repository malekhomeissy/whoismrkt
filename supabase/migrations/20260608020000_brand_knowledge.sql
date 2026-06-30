-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3: AI Memory & Brand Knowledge Base
-- Creates the permanent memory layer for MRKT's intelligence system.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. brand_knowledge — one row per business, holds everything the AI needs ────

CREATE TABLE IF NOT EXISTS public.brand_knowledge (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core identity
  brand_description  text,
  brand_voice        text,

  -- Offerings
  products           text,
  services           text,

  -- Market
  target_audience    text,
  competitors        text,

  -- Strategy
  content_pillars    text,
  marketing_goals    text,

  -- Guidelines
  brand_guidelines   text,

  -- Links: [{ label: string, url: string }]
  links              jsonb       NOT NULL DEFAULT '[]'::jsonb,

  updated_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (business_user_id)
);

-- 2. brand_documents — uploaded PDFs, decks, briefs ───────────────────────────

CREATE TABLE IF NOT EXISTS public.brand_documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name        text        NOT NULL,
  file_url         text        NOT NULL,
  file_type        text,
  file_size        bigint,
  description      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.brand_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brand knowledge"
  ON public.brand_knowledge
  USING     (auth.uid() = business_user_id)
  WITH CHECK (auth.uid() = business_user_id);

ALTER TABLE public.brand_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brand documents"
  ON public.brand_documents
  USING     (auth.uid() = business_user_id)
  WITH CHECK (auth.uid() = business_user_id);

-- 4. Auto-update updated_at on brand_knowledge ────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_brand_knowledge_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER brand_knowledge_updated_at
  BEFORE UPDATE ON public.brand_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_brand_knowledge_timestamp();
