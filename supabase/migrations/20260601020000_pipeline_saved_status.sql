-- ============================================================
-- Pipeline upgrade — add 'saved' as first creator status
-- Drop the auto-generated inline CHECK, recreate with 'saved'
-- ============================================================

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'project_saved_creators'
    AND con.contype = 'c'
    AND con.conname ILIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.project_saved_creators DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.project_saved_creators
  ADD CONSTRAINT project_saved_creators_status_check
    CHECK (status IN ('saved','shortlisted','contacted','interested','negotiating','confirmed','rejected'));

-- New default: incoming saves start at 'saved'
ALTER TABLE public.project_saved_creators
  ALTER COLUMN status SET DEFAULT 'saved';
