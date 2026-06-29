-- Add 'eula' to the legal_content content_type check constraint
ALTER TABLE legal_content DROP CONSTRAINT IF EXISTS legal_content_content_type_check;
ALTER TABLE legal_content ADD CONSTRAINT legal_content_content_type_check
  CHECK (content_type IN (
    'privacy_policy',
    'terms_and_conditions',
    'safety_guidelines',
    'refund_policy',
    'eula'
  ));

-- Insert default empty EULA content
INSERT INTO legal_content (content_type, title, content)
VALUES ('eula', 'End User License Agreement', '{"sections": []}'::jsonb)
ON CONFLICT (content_type) DO NOTHING;
