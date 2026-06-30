-- ─────────────────────────────────────────────────────────────────────────────
-- Contracts system
-- Business can create and send contracts to accepted creators.
-- Creators can view, accept, or decline contracts addressed to them.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contracts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_title  text        NOT NULL,
  title           text        NOT NULL,
  terms           text        NOT NULL,
  status          text        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','sent','accepted','declined')),
  sent_at         timestamptz,
  accepted_at     timestamptz,
  declined_at     timestamptz,
  decline_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_creator_idx  ON public.contracts (creator_id,  created_at DESC);
CREATE INDEX IF NOT EXISTS contracts_business_idx ON public.contracts (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contracts_campaign_idx ON public.contracts (campaign_id, created_at DESC);

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Business can do everything with their own contracts
CREATE POLICY "Business manages own contracts"
  ON public.contracts FOR ALL
  USING  (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

-- Creator can view contracts addressed to them
CREATE POLICY "Creator views own contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() = creator_id);

-- Creator can update status to accepted/declined (and set decline_reason)
CREATE POLICY "Creator responds to contracts"
  ON public.contracts FOR UPDATE
  USING  (auth.uid() = creator_id AND status = 'sent')
  WITH CHECK (auth.uid() = creator_id AND status IN ('accepted','declined'));

-- ─── 3. Trigger: updated_at timestamp ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_contracts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contracts_updated_at();

-- ─── 4. Trigger: contract sent → notify creator ──────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_contract_sent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  biz_name text;
BEGIN
  -- Only fire when status transitions to 'sent'
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    SELECT COALESCE(bp.company_name, p.name, 'A business')
    INTO   biz_name
    FROM   public.profiles p
    LEFT JOIN public.business_profiles bp ON bp.user_id = p.id
    WHERE  p.id = NEW.business_id
    LIMIT  1;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.creator_id,
      'contract_sent',
      biz_name || ' sent you a contract',
      NEW.campaign_title,
      '/contracts'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_contract_status
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_contract_sent();

-- Also fire on INSERT when status is already 'sent' (e.g. business sends immediately)
CREATE OR REPLACE FUNCTION public.notify_on_contract_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  biz_name text;
BEGIN
  IF NEW.status = 'sent' THEN
    SELECT COALESCE(bp.company_name, p.name, 'A business')
    INTO   biz_name
    FROM   public.profiles p
    LEFT JOIN public.business_profiles bp ON bp.user_id = p.id
    WHERE  p.id = NEW.business_id
    LIMIT  1;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.creator_id,
      'contract_sent',
      biz_name || ' sent you a contract',
      NEW.campaign_title,
      '/contracts'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_contract_insert
  AFTER INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_contract_insert();
