-- Function to get all blocked dates for a property as an array of date strings
CREATE OR REPLACE FUNCTION get_blocked_dates(p_property_id UUID)
RETURNS TABLE(blocked_date DATE) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT d::DATE
  FROM property_blocked_dates pbd,
       generate_series(pbd.start_date, pbd.end_date, '1 day'::interval) d
  WHERE pbd.property_id = p_property_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_blocked_dates IS 'Returns all blocked dates for a property as individual dates';
