-- ============================================================
-- Pipeline Stages v2 — align status values with product UI
-- Replaces the stages from 20260601020000_pipeline_saved_status
--
-- Old stages: saved, shortlisted, contacted, interested, negotiating, confirmed, rejected
-- New stages: discovered, saved, contacted, negotiating, booked, completed, rejected
-- ============================================================

-- Drop the old constraint added in 20260601020000
ALTER TABLE public.project_saved_creators
  DROP CONSTRAINT IF EXISTS project_saved_creators_status_check;

-- Add the new constraint with product-aligned names
ALTER TABLE public.project_saved_creators
  ADD CONSTRAINT project_saved_creators_status_check
  CHECK (status IN ('discovered','saved','contacted','negotiating','booked','completed','rejected'));

-- Update the column default
ALTER TABLE public.project_saved_creators
  ALTER COLUMN status SET DEFAULT 'saved';

-- Migrate any existing rows with old stage names
UPDATE public.project_saved_creators SET status = 'saved'       WHERE status = 'shortlisted';
UPDATE public.project_saved_creators SET status = 'booked'      WHERE status = 'confirmed';
UPDATE public.project_saved_creators SET status = 'negotiating' WHERE status = 'interested';
