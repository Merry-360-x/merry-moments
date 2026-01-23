-- Admin override policies for deep deletion of tours and tour_packages
-- This allows admins to delete tours/packages regardless of ownership

-- Drop existing restrictive delete policies for tours if they exist
DROP POLICY IF EXISTS "Users can delete own tours" ON tours;
DROP POLICY IF EXISTS "Allow delete own tours" ON tours;

-- Create new delete policy for tours: owners OR admins can delete
CREATE POLICY "Owners and admins can delete tours"
ON tours
FOR DELETE
USING (
  (auth.uid() = created_by) 
  OR 
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ))
);

-- Drop existing restrictive delete policies for tour_packages if they exist
DROP POLICY IF EXISTS "Hosts can delete their own tour packages" ON tour_packages;
DROP POLICY IF EXISTS "Allow delete own packages" ON tour_packages;

-- Create new delete policy for tour_packages: owners OR admins can delete
CREATE POLICY "Hosts and admins can delete tour packages"
ON tour_packages
FOR DELETE
USING (
  (auth.uid() = host_id)
  OR
  (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ))
);

-- Add comment for documentation
COMMENT ON POLICY "Owners and admins can delete tours" ON tours IS 
'Allows tour creators to delete their own tours, and admins to delete any tour for moderation purposes';

COMMENT ON POLICY "Hosts and admins can delete tour packages" ON tour_packages IS 
'Allows package creators to delete their own packages, and admins to delete any package for moderation purposes';
