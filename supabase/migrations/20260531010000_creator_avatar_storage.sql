-- ============================================================
-- MRKT Creator Avatar Storage — RLS policies
-- Run in Supabase SQL Editor AFTER creating the bucket manually.
--
-- Bucket setup (do in Supabase Dashboard → Storage):
--   Name:   creator-avatars
--   Public: YES (public read)
--   Allowed MIME types: image/jpeg, image/png, image/webp
--   Max file size: 5 MB
-- ============================================================

-- Anyone can read avatar images (public bucket)
CREATE POLICY "Public read creator avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creator-avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY "Authenticated upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'creator-avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can replace their own avatar (upsert path)
CREATE POLICY "Authenticated update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'creator-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
CREATE POLICY "Authenticated delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'creator-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
