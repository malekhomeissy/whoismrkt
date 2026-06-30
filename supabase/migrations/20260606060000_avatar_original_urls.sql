-- ─────────────────────────────────────────────────────────────────────────────
-- Store the original (pre-crop) image URLs so users can re-crop later.
-- The processed (cropped) URL is stored in:
--   creator_profiles.profile_image_url
--   business_profiles.logo_url
-- ─────────────────────────────────────────────────────────────────────────────

-- Creators: original upload before crop
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS avatar_original_url text;

-- Businesses: original logo upload before crop
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS logo_original_url text;

-- ─── Storage buckets ─────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage if the buckets don't exist yet.
--
-- creator-avatars bucket (already exists from Phase 1):
--   SELECT * FROM storage.buckets WHERE id = 'creator-avatars';
--
-- business-logos bucket (created via API / dashboard):
--   The RLS policies below cover the bucket once it's created.

-- ─── RLS for business-logos ───────────────────────────────────────────────────
-- (These may already exist from 20260606050000_business_logo.sql — safe to re-run)

DO $$
BEGIN
  -- SELECT: anyone can view logos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Business logos are publicly readable'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Business logos are publicly readable"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'business-logos');
    $q$;
  END IF;

  -- INSERT: authenticated owners only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Business owners can upload logo'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Business owners can upload logo"
        ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = 'business-logos'
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    $q$;
  END IF;

  -- UPDATE: owner only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Business owners can update logo'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Business owners can update logo"
        ON storage.objects FOR UPDATE
        USING (
          bucket_id = 'business-logos'
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    $q$;
  END IF;

  -- DELETE: owner only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Business owners can delete logo'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Business owners can delete logo"
        ON storage.objects FOR DELETE
        USING (
          bucket_id = 'business-logos'
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    $q$;
  END IF;
END;
$$;
