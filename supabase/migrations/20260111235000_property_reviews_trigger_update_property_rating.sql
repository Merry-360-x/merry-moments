-- Keep public.properties.rating and review_count consistent with property_reviews.

CREATE OR REPLACE FUNCTION public.recalc_property_rating(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_avg numeric;
BEGIN
  SELECT COUNT(*), AVG(rating)::numeric
  INTO v_count, v_avg
  FROM public.property_reviews
  WHERE property_id = p_property_id;

  UPDATE public.properties
  SET
    review_count = v_count,
    rating = CASE WHEN v_count > 0 THEN ROUND(v_avg::numeric, 2) ELSE NULL END,
    updated_at = now()
  WHERE id = p_property_id;
END;
$$;

DROP TRIGGER IF EXISTS property_reviews_recalc_property_rating ON public.property_reviews;
CREATE OR REPLACE FUNCTION public.property_reviews_recalc_property_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_property_rating(OLD.property_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_property_rating(NEW.property_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER property_reviews_recalc_property_rating
AFTER INSERT OR UPDATE OR DELETE ON public.property_reviews
FOR EACH ROW
EXECUTE FUNCTION public.property_reviews_recalc_property_rating();

