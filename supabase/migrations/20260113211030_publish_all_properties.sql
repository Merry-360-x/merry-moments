-- Publish all properties, tours, and transport vehicles so they appear on the website

UPDATE properties SET is_published = true WHERE is_published = false;
UPDATE tours SET is_published = true WHERE is_published = false;
UPDATE transport_vehicles SET is_published = true WHERE is_published = false;
