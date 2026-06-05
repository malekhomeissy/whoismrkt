-- ============================================================
-- Upgrade project_saved_creators — add CRM / shortlist fields
-- ============================================================

ALTER TABLE public.project_saved_creators
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'shortlisted'
    CHECK (status IN ('shortlisted','contacted','interested','negotiating','confirmed','rejected')),
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS why_fits text,
  ADD COLUMN IF NOT EXISTS estimated_rate text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high','medium','low')),
  ADD COLUMN IF NOT EXISTS outreach_draft text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS project_saved_creators_status_idx
  ON public.project_saved_creators (project_id, status);

CREATE INDEX IF NOT EXISTS project_saved_creators_priority_idx
  ON public.project_saved_creators (project_id, priority);

-- Auto-update updated_at on any change
CREATE TRIGGER project_saved_creators_touch
  BEFORE UPDATE ON public.project_saved_creators
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
