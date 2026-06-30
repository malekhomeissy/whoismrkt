-- ============================================================
-- Business Logo — add logo_url to business_profiles
-- Run AFTER creating the business-logos bucket in Supabase Dashboard:
--   Name:   business-logos
--   Public: YES
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   Max file size: 5 MB
-- ============================================================

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS logo_url text;

-- ── Storage RLS policies ────────────────────────────────────────────────────

CREATE POLICY "Public read business logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

CREATE POLICY "Authenticated upload own business logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-logos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated update own business logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated delete own business logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
