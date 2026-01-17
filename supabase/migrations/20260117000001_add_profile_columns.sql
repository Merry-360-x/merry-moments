-- Add missing columns to profiles table

-- Add date_of_birth column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add bio column (if it doesn't exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add updated_at column for tracking changes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or replace trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
