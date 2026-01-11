-- No mock/seed data: remove automatically seeded transport services.
DO $$
BEGIN
  IF to_regclass('public.transport_services') IS NOT NULL THEN
    DELETE FROM public.transport_services
    WHERE slug IN ('taxi', 'shuttle', 'car_rental');
  END IF;
END$$;

