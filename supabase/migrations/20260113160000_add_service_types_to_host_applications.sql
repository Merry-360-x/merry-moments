-- Add service_types column to host_applications table
-- This allows hosts to specify if they want to offer accommodation, transport, tours, or multiple services

DO $$ 
BEGIN
  -- Add service_types column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'host_applications' 
    AND column_name = 'service_types'
  ) THEN
    ALTER TABLE public.host_applications 
    ADD COLUMN service_types TEXT[] DEFAULT '{}';
    
    COMMENT ON COLUMN public.host_applications.service_types IS 'Types of services host wants to offer: accommodation, transport, tour';
  END IF;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
