-- Add tour_package_data column to host_applications
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS tour_package_data jsonb,
  ADD COLUMN IF NOT EXISTS promoted_tour_package_id uuid;

COMMENT ON COLUMN public.host_applications.tour_package_data IS 'Tour package details submitted with host application';
COMMENT ON COLUMN public.host_applications.promoted_tour_package_id IS 'Tour package created from this host application (if any)';

-- Update approve_host_application to also create tour_packages
CREATE OR REPLACE FUNCTION public.approve_host_application(application_id uuid, note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app record;
  created_property_id uuid;
  created_tour_id uuid;
  created_tour_package_id uuid;
  created_vehicle_id uuid;
BEGIN
  -- Only operations staff or admins can approve
  IF NOT (public.is_operations_staff() OR public.is_admin()) THEN
    RAISE EXCEPTION 'Not authorized to approve host applications';
  END IF;

  SELECT * INTO app
  FROM public.host_applications
  WHERE id = application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Host application not found';
  END IF;

  IF app.user_id IS NULL THEN
    RAISE EXCEPTION 'Host application has no user_id';
  END IF;

  -- Mark approved (review fields may not exist in all schemas; wrap defensively)
  BEGIN
    UPDATE public.host_applications
    SET status = 'approved',
        updated_at = NOW(),
        reviewed_by = auth.uid(),
        review_notes = note
    WHERE id = application_id;
  EXCEPTION WHEN undefined_column THEN
    UPDATE public.host_applications
    SET status = 'approved',
        updated_at = NOW()
    WHERE id = application_id;
  END;

  -- Grant host role
  INSERT INTO public.user_roles(user_id, role)
  VALUES (app.user_id, 'host')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Best-effort profile sync
  BEGIN
    INSERT INTO public.profiles(user_id, full_name, phone, years_of_experience, languages_spoken, tour_guide_bio)
    VALUES (
      app.user_id,
      COALESCE(app.full_name, ''),
      app.phone,
      app.years_of_experience,
      app.languages_spoken,
      app.tour_guide_bio
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      years_of_experience = COALESCE(EXCLUDED.years_of_experience, profiles.years_of_experience),
      languages_spoken = COALESCE(EXCLUDED.languages_spoken, profiles.languages_spoken),
      tour_guide_bio = COALESCE(EXCLUDED.tour_guide_bio, profiles.tour_guide_bio);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Promote application-created property (accommodation)
  IF app.accommodation_data IS NOT NULL AND app.promoted_property_id IS NULL THEN
    INSERT INTO public.properties(
      host_id,
      title,
      location,
      description,
      price_per_night,
      currency,
      property_type,
      max_guests,
      bedrooms,
      bathrooms,
      beds,
      amenities,
      images,
      main_image,
      is_published
    )
    VALUES (
      app.user_id,
      COALESCE(app.accommodation_data->>'title', 'Untitled Property'),
      COALESCE(app.accommodation_data->>'location', 'Unknown'),
      NULLIF(app.accommodation_data->>'description', ''),
      COALESCE(NULLIF(app.accommodation_data->>'price_per_night', '')::numeric, 0),
      COALESCE(NULLIF(app.accommodation_data->>'currency', ''), 'RWF'),
      NULLIF(app.accommodation_data->>'property_type', ''),
      COALESCE(NULLIF(app.accommodation_data->>'max_guests', '')::int, NULL),
      COALESCE(NULLIF(app.accommodation_data->>'bedrooms', '')::int, NULL),
      COALESCE(NULLIF(app.accommodation_data->>'bathrooms', '')::int, NULL),
      COALESCE(NULLIF(app.accommodation_data->>'beds', '')::int, NULL),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(app.accommodation_data->'amenities', '[]'::jsonb))),
        NULL
      ),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(app.accommodation_data->'images', '[]'::jsonb))),
        NULL
      ),
      NULLIF((COALESCE(app.accommodation_data->'images', '[]'::jsonb)->>0), ''),
      true
    )
    RETURNING id INTO created_property_id;

    UPDATE public.host_applications
    SET promoted_property_id = created_property_id
    WHERE id = application_id;
  END IF;

  -- Promote application-created tour
  IF app.tour_data IS NOT NULL AND app.promoted_tour_id IS NULL THEN
    INSERT INTO public.tours(
      created_by,
      title,
      location,
      description,
      price_per_person,
      currency,
      category,
      difficulty,
      duration_days,
      max_group_size,
      images,
      is_published
    )
    VALUES (
      app.user_id,
      COALESCE(app.tour_data->>'title', 'Untitled Tour'),
      COALESCE(app.tour_data->>'location', 'Unknown'),
      NULLIF(app.tour_data->>'description', ''),
      COALESCE(NULLIF(app.tour_data->>'price_per_person', '')::numeric, 0),
      COALESCE(NULLIF(app.tour_data->>'currency', ''), 'RWF'),
      NULLIF(app.tour_data->>'category', ''),
      NULLIF(app.tour_data->>'difficulty', ''),
      COALESCE(NULLIF(app.tour_data->>'duration_days', '')::int, NULL),
      COALESCE(NULLIF(app.tour_data->>'max_group_size', '')::int, NULL),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(app.tour_data->'images', '[]'::jsonb))),
        NULL
      ),
      true
    )
    RETURNING id INTO created_tour_id;

    UPDATE public.host_applications
    SET promoted_tour_id = created_tour_id
    WHERE id = application_id;
  END IF;

  -- Promote application-created tour package
  IF app.tour_package_data IS NOT NULL AND app.promoted_tour_package_id IS NULL THEN
    INSERT INTO public.tour_packages(
      host_id,
      title,
      city,
      categories,
      tour_type,
      duration,
      description,
      daily_itinerary,
      included_services,
      excluded_services,
      price_per_adult,
      currency,
      max_guests,
      meeting_point,
      what_to_bring,
      gallery_images,
      itinerary_pdf,
      status,
      approved_by,
      approved_at
    )
    VALUES (
      app.user_id,
      COALESCE(app.tour_package_data->>'title', 'Untitled Tour Package'),
      COALESCE(app.tour_package_data->>'city', 'Kigali'),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(app.tour_package_data->'categories', '[]'::jsonb))),
        ARRAY['cultural']::text[]
      ),
      COALESCE(app.tour_package_data->>'tour_type', 'day_trip'),
      COALESCE(app.tour_package_data->>'duration', '1 Day'),
      NULLIF(app.tour_package_data->>'description', ''),
      NULLIF(app.tour_package_data->>'daily_itinerary', ''),
      NULLIF(app.tour_package_data->>'included_services', ''),
      NULLIF(app.tour_package_data->>'excluded_services', ''),
      COALESCE(NULLIF(app.tour_package_data->>'price_per_adult', '')::numeric, 0),
      COALESCE(NULLIF(app.tour_package_data->>'currency', ''), 'RWF'),
      COALESCE(NULLIF(app.tour_package_data->>'max_guests', '')::int, 10),
      NULLIF(app.tour_package_data->>'meeting_point', ''),
      NULLIF(app.tour_package_data->>'what_to_bring', ''),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(app.tour_package_data->'gallery_images', '[]'::jsonb))),
        NULL
      ),
      NULLIF(app.tour_package_data->>'itinerary_pdf', ''),
      'approved',
      auth.uid(),
      NOW()
    )
    RETURNING id INTO created_tour_package_id;

    UPDATE public.host_applications
    SET promoted_tour_package_id = created_tour_package_id
    WHERE id = application_id;
  END IF;

  -- Promote application-created transport vehicle
  IF app.transport_data IS NOT NULL AND app.promoted_vehicle_id IS NULL THEN
    INSERT INTO public.transport_vehicles(
      created_by,
      title,
      provider_name,
      vehicle_type,
      seats,
      driver_included,
      price_per_day,
      currency,
      media,
      image_url,
      is_published
    )
    VALUES (
      app.user_id,
      COALESCE(app.transport_data->>'title', 'Untitled Vehicle'),
      NULLIF(app.transport_data->>'provider_name', ''),
      NULLIF(app.transport_data->>'vehicle_type', ''),
      COALESCE(NULLIF(app.transport_data->>'seats', '')::int, NULL),
      COALESCE(NULLIF(app.transport_data->>'driver_included', '')::boolean, false),
      COALESCE(NULLIF(app.transport_data->>'price_per_day', '')::numeric, 0),
      COALESCE(NULLIF(app.transport_data->>'currency', ''), 'RWF'),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(app.transport_data->'images', '[]'::jsonb))),
        NULL
      ),
      NULLIF((COALESCE(app.transport_data->'images', '[]'::jsonb)->>0), ''),
      true
    )
    RETURNING id INTO created_vehicle_id;

    UPDATE public.host_applications
    SET promoted_vehicle_id = created_vehicle_id
    WHERE id = application_id;
  END IF;

  -- Ensure anything they created while applying becomes visible
  UPDATE public.properties
  SET is_published = true
  WHERE host_id = app.user_id
    AND (is_published IS DISTINCT FROM true);

  UPDATE public.tours
  SET is_published = true
  WHERE created_by = app.user_id
    AND (is_published IS DISTINCT FROM true);

  UPDATE public.transport_vehicles
  SET is_published = true
  WHERE created_by = app.user_id
    AND (is_published IS DISTINCT FROM true);

  -- Approve any tour packages they created as drafts while applying
  UPDATE public.tour_packages
  SET status = 'approved',
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
  WHERE host_id = app.user_id
    AND status IN ('draft', 'pending_approval');

END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_host_application(uuid, text) TO authenticated;

-- Ensure API schema cache refresh
NOTIFY pgrst, 'reload schema';
