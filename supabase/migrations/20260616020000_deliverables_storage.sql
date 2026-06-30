-- ─────────────────────────────────────────────────────────────────────────────
-- Deliverables storage bucket + RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the bucket (private — signed URLs for access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deliverables',
  'deliverables',
  false,
  104857600,  -- 100 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/heic',
    'video/mp4','video/quicktime','video/webm',
    'application/pdf',
    'application/zip',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS ──────────────────────────────────────────────────────────────

-- Creators can upload to their own application folder
CREATE POLICY "creator_upload_deliverable"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deliverables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Creators can update/delete their own uploads
CREATE POLICY "creator_update_deliverable"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "creator_delete_deliverable"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Both parties can read: creator owns it OR business owns the campaign
CREATE POLICY "read_deliverable_file"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND (
      -- The creator (folder is their user_id)
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- The business that owns the campaign the submission belongs to
      EXISTS (
        SELECT 1
        FROM campaign_deliverable_submissions cds
        JOIN campaign_applications ca ON ca.id = cds.application_id
        JOIN campaigns c              ON c.id  = ca.campaign_id
        WHERE cds.file_url LIKE '%' || name || '%'
          AND c.user_id = auth.uid()
      )
    )
  );
