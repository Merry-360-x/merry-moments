-- Auto-generate nickname from surname (last name of full_name)

CREATE OR REPLACE FUNCTION auto_set_nickname_from_surname()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set nickname if it's NULL or empty
  IF NEW.nickname IS NULL OR TRIM(NEW.nickname) = '' THEN
    -- Extract surname (last word) from full_name
    IF NEW.full_name IS NOT NULL AND TRIM(NEW.full_name) != '' THEN
      -- Get the last word from full_name (surname)
      NEW.nickname := TRIM(SPLIT_PART(TRIM(NEW.full_name), ' ', 
        ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(NEW.full_name), ' '), 1)
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS auto_nickname_on_insert ON profiles;
CREATE TRIGGER auto_nickname_on_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_nickname_from_surname();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS auto_nickname_on_update ON profiles;
CREATE TRIGGER auto_nickname_on_update
  BEFORE UPDATE OF full_name ON profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION auto_set_nickname_from_surname();

-- Update existing profiles that don't have nicknames
UPDATE profiles
SET nickname = TRIM(SPLIT_PART(TRIM(full_name), ' ', 
  ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(full_name), ' '), 1)
))
WHERE (nickname IS NULL OR TRIM(nickname) = '')
  AND full_name IS NOT NULL 
  AND TRIM(full_name) != '';
