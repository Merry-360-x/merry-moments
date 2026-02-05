-- Function to update property rating and review_count when reviews change
CREATE OR REPLACE FUNCTION update_property_rating()
RETURNS TRIGGER AS $$
DECLARE
  prop_id UUID;
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Get the property_id (handle INSERT, UPDATE, DELETE)
  IF TG_OP = 'DELETE' THEN
    prop_id := OLD.property_id;
  ELSE
    prop_id := NEW.property_id;
  END IF;

  -- Calculate new average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM property_reviews
  WHERE property_id = prop_id;

  -- Update the properties table
  UPDATE properties
  SET 
    rating = ROUND(avg_rating, 1),
    review_count = total_reviews
  WHERE id = prop_id;

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_property_rating ON property_reviews;

-- Create trigger for INSERT, UPDATE, DELETE on property_reviews
CREATE TRIGGER trigger_update_property_rating
AFTER INSERT OR UPDATE OR DELETE ON property_reviews
FOR EACH ROW
EXECUTE FUNCTION update_property_rating();

-- Also reset any properties that have ratings but no actual reviews
UPDATE properties p
SET rating = 0, review_count = 0
WHERE review_count > 0
AND NOT EXISTS (
  SELECT 1 FROM property_reviews pr WHERE pr.property_id = p.id
);
