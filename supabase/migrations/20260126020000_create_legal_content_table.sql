-- Create legal_content table for Privacy Policy and Terms & Conditions
CREATE TABLE IF NOT EXISTS legal_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL UNIQUE CHECK (content_type IN ('privacy_policy', 'terms_and_conditions')),
  title text NOT NULL,
  content jsonb NOT NULL, -- Store structured content as JSON
  last_updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE legal_content ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read legal content
CREATE POLICY "Anyone can read legal content"
  ON legal_content
  FOR SELECT
  USING (true);

-- Only admins can insert/update legal content
CREATE POLICY "Admins can manage legal content"
  ON legal_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Insert default content
INSERT INTO legal_content (content_type, title, content)
VALUES 
  ('privacy_policy', 'Privacy Policy', '{"sections": []}'::jsonb),
  ('terms_and_conditions', 'Terms and Conditions', '{"sections": []}'::jsonb)
ON CONFLICT (content_type) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_legal_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_content_updated_at
  BEFORE UPDATE ON legal_content
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_content_updated_at();
