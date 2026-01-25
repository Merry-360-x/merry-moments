-- Update uploads bucket to support PDFs and other documents
-- Previously only allowed images, now adding PDF support for tour itineraries and policies

UPDATE storage.buckets
SET 
  file_size_limit = 20971520,  -- Increase to 20MB for PDFs
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo'
  ]::text[]
WHERE id = 'uploads';
