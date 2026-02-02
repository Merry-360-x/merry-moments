-- Add new legal content types: safety_guidelines and refund_policy
-- First, drop the existing check constraint
ALTER TABLE legal_content DROP CONSTRAINT IF EXISTS legal_content_content_type_check;

-- Add updated check constraint with new content types
ALTER TABLE legal_content ADD CONSTRAINT legal_content_content_type_check 
  CHECK (content_type IN ('privacy_policy', 'terms_and_conditions', 'safety_guidelines', 'refund_policy'));

-- Insert default entries for the new content types
INSERT INTO legal_content (content_type, title, content)
VALUES 
  ('safety_guidelines', 'Safety Guidelines', '{"sections": []}'::jsonb),
  ('refund_policy', 'Refund & Cancellation Policy', '{"sections": []}'::jsonb)
ON CONFLICT (content_type) DO NOTHING;
