-- ─────────────────────────────────────────────────────────────────────────────
-- Deliverable tracking — per-creator submission status for each campaign deliverable
-- Creator submits work links; business approves or requests revision.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Table ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_deliverable_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid        NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  deliverable_id  uuid        NOT NULL REFERENCES public.campaign_deliverables(id) ON DELETE CASCADE,
  application_id  uuid        REFERENCES public.campaign_applications(id) ON DELETE CASCADE,
  creator_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'not_started'
                                CHECK (status IN (
                                  'not_started',
                                  'in_progress',
                                  'submitted',
                                  'revision_requested',
                                  'approved'
                                )),
  submission_url  text,
  creator_notes   text,
  feedback        text,
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, creator_id)
);

CREATE INDEX IF NOT EXISTS deliverable_submissions_creator_idx
  ON public.campaign_deliverable_submissions (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS deliverable_submissions_campaign_idx
  ON public.campaign_deliverable_submissions (campaign_id, creator_id);

CREATE INDEX IF NOT EXISTS deliverable_submissions_application_idx
  ON public.campaign_deliverable_submissions (application_id);

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.campaign_deliverable_submissions ENABLE ROW LEVEL SECURITY;

-- Creator can view and update (submit) their own submissions
CREATE POLICY "Creator manages own deliverable submissions"
  ON public.campaign_deliverable_submissions FOR ALL
  USING  (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Business can view all submissions for their campaigns
CREATE POLICY "Business views campaign deliverable submissions"
  ON public.campaign_deliverable_submissions FOR SELECT
  USING (auth.uid() = business_id);

-- Business can update submissions (approve, request revision, leave feedback)
CREATE POLICY "Business reviews deliverable submissions"
  ON public.campaign_deliverable_submissions FOR UPDATE
  USING  (auth.uid() = business_id)
  WITH CHECK (auth.uid() = business_id);

-- ─── 3. updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_deliverable_submission_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    NEW.submitted_at = now();
  END IF;
  IF NEW.status IN ('approved','revision_requested') AND OLD.status NOT IN ('approved','revision_requested') THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deliverable_submission_updated_at
  BEFORE UPDATE ON public.campaign_deliverable_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_deliverable_submission_updated_at();

-- ─── 4. Trigger: deliverable approved → notify creator ───────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_deliverable_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  campaign_title text;
  biz_name       text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT c.title INTO campaign_title
    FROM   public.campaigns c
    WHERE  c.id = NEW.campaign_id;

    SELECT COALESCE(bp.company_name, p.name, 'A business')
    INTO   biz_name
    FROM   public.profiles p
    LEFT JOIN public.business_profiles bp ON bp.user_id = p.id
    WHERE  p.id = NEW.business_id
    LIMIT  1;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.creator_id,
      'deliverable_approved',
      biz_name || ' approved your deliverable',
      campaign_title,
      '/applications'
    );
  END IF;

  -- Also notify on revision requested
  IF NEW.status = 'revision_requested' AND OLD.status != 'revision_requested' THEN
    SELECT c.title INTO campaign_title
    FROM   public.campaigns c
    WHERE  c.id = NEW.campaign_id;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.creator_id,
      'revision_requested',
      'Revision requested on your deliverable',
      COALESCE(NEW.feedback, campaign_title),
      '/applications'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_deliverable_status
  AFTER UPDATE ON public.campaign_deliverable_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_deliverable_approved();
