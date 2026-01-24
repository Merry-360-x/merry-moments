-- Create incident_reports table
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incident_reports_reporter_id ON incident_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_reported_user_id ON incident_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at ON incident_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blacklist_user_id ON blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires_at ON blacklist(expires_at);

-- Enable RLS
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incident_reports
CREATE POLICY "Users can view their own reports"
  ON incident_reports
  FOR SELECT
  USING (auth.uid() = reporter_id OR is_any_staff());

CREATE POLICY "Authenticated users can create reports"
  ON incident_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Staff can manage all reports"
  ON incident_reports
  FOR ALL
  USING (is_any_staff());

-- RLS Policies for blacklist
CREATE POLICY "Staff can view blacklist"
  ON blacklist
  FOR SELECT
  USING (is_any_staff());

CREATE POLICY "Staff can manage blacklist"
  ON blacklist
  FOR ALL
  USING (is_any_staff());

-- Create trigger for updated_at on incident_reports
CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
