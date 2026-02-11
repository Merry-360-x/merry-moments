-- Add 18+ consent tracking on user profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS adult_confirmed_at TIMESTAMPTZ;
