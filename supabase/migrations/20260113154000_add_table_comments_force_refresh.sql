-- Force PostgREST schema cache refresh by making a harmless table modification
-- Add a comment to the table to trigger schema change detection

COMMENT ON TABLE public.host_applications IS 'Host application submissions from users wanting to become hosts - schema refreshed 2026-01-13';

-- Also add comments to key columns to ensure they're in the schema
COMMENT ON COLUMN public.host_applications.full_name IS 'Full legal name of the applicant';
COMMENT ON COLUMN public.host_applications.phone IS 'Contact phone number';
COMMENT ON COLUMN public.host_applications.hosting_location IS 'Primary location where applicant will host';
COMMENT ON COLUMN public.host_applications.applicant_type IS 'Type of applicant: individual or business';

-- Force reload
NOTIFY pgrst, 'reload schema';
