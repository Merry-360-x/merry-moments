-- Manual review requests allow hosts to invite anyone by email to review a selected property
CREATE TABLE IF NOT EXISTS manual_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  reviewer_name TEXT,
  review_token UUID NOT NULL DEFAULT gen_random_uuid(),
  request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'sent', 'collected', 'expired', 'cancelled')),
  review_id UUID REFERENCES property_reviews(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_review_requests_review_token
  ON manual_review_requests(review_token);

CREATE INDEX IF NOT EXISTS idx_manual_review_requests_host_created
  ON manual_review_requests(host_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manual_review_requests_property
  ON manual_review_requests(property_id);

CREATE INDEX IF NOT EXISTS idx_manual_review_requests_email
  ON manual_review_requests(LOWER(reviewer_email));

ALTER TABLE manual_review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view own manual review requests" ON manual_review_requests;
CREATE POLICY "Hosts can view own manual review requests"
  ON manual_review_requests
  FOR SELECT
  USING (auth.uid() = host_id OR is_any_staff());

DROP POLICY IF EXISTS "Hosts can create own manual review requests" ON manual_review_requests;
CREATE POLICY "Hosts can create own manual review requests"
  ON manual_review_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = host_id
    AND EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_id
      AND p.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update own manual review requests" ON manual_review_requests;
CREATE POLICY "Hosts can update own manual review requests"
  ON manual_review_requests
  FOR UPDATE
  USING (auth.uid() = host_id OR is_any_staff())
  WITH CHECK (auth.uid() = host_id OR is_any_staff());

DROP TRIGGER IF EXISTS update_manual_review_requests_updated_at ON manual_review_requests;
CREATE TRIGGER update_manual_review_requests_updated_at
  BEFORE UPDATE ON manual_review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

NOTIFY pgrst, 'reload schema';
