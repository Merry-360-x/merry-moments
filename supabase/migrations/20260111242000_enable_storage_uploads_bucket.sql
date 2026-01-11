-- Enable Supabase Storage fallback for image uploads (public read, authenticated write).
-- Creates a public bucket "uploads" and RLS policies.

-- Create bucket if not exists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policies on storage.objects
-- Public can read from the uploads bucket.
DROP POLICY IF EXISTS "Public read uploads bucket" ON storage.objects;
CREATE POLICY "Public read uploads bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

-- Authenticated users can upload to the uploads bucket.
DROP POLICY IF EXISTS "Authenticated upload to uploads bucket" ON storage.objects;
CREATE POLICY "Authenticated upload to uploads bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- Authenticated users can update/delete their own objects in uploads bucket.
DROP POLICY IF EXISTS "Authenticated update own uploads" ON storage.objects;
CREATE POLICY "Authenticated update own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'uploads' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'uploads' AND owner = auth.uid());

DROP POLICY IF EXISTS "Authenticated delete own uploads" ON storage.objects;
CREATE POLICY "Authenticated delete own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND owner = auth.uid());

