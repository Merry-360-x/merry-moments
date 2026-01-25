-- Update all existing draft tour packages to approved status
-- This makes them visible on the tours page and homepage

UPDATE tour_packages
SET status = 'approved'
WHERE status = 'draft';

-- Also update any NULL status to approved
UPDATE tour_packages
SET status = 'approved'
WHERE status IS NULL;
