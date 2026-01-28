-- Optional: Create a table for persisting form drafts to the database
-- This enables cross-device sync for authenticated users

CREATE TABLE IF NOT EXISTS public.form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_key TEXT NOT NULL,
  draft_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each user can have one draft per form
  CONSTRAINT form_drafts_user_form_unique UNIQUE (user_id, form_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_form_drafts_user_id ON public.form_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_form_key ON public.form_drafts(form_key);

-- Enable RLS
ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own drafts
CREATE POLICY "Users can view own drafts"
  ON public.form_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON public.form_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON public.form_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON public.form_drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_form_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS form_drafts_updated_at ON public.form_drafts;
CREATE TRIGGER form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_form_drafts_updated_at();

-- Grant permissions
GRANT ALL ON public.form_drafts TO authenticated;

COMMENT ON TABLE public.form_drafts IS 'Stores user form drafts for persistence across sessions and devices';
