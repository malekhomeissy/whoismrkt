-- ─────────────────────────────────────────────────────────────────────────────
-- Pipeline CRM fields — extend project_saved_creators with outreach tracking,
-- stage timestamps, and an optional campaign link for the "booked" workflow.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_saved_creators
  ADD COLUMN IF NOT EXISTS contacted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS booked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS contact_method text
    CHECK (contact_method IN ('instagram_dm','email','mrkt_message','phone','other')),
  ADD COLUMN IF NOT EXISTS campaign_id    uuid
    REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Fast lookup: all booked creators for a specific campaign
CREATE INDEX IF NOT EXISTS psc_campaign_booked_idx
  ON public.project_saved_creators (campaign_id, status)
  WHERE campaign_id IS NOT NULL;

-- Fast lookup: all booked/completed for a business user
CREATE INDEX IF NOT EXISTS psc_saved_by_status_idx
  ON public.project_saved_creators (saved_by, status);
