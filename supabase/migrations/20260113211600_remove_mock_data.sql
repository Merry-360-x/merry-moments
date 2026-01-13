-- Remove all mock/sample data from the database

-- Delete in order of dependencies (child tables first)
DELETE FROM bookings;
DELETE FROM reviews;
DELETE FROM favorites;
DELETE FROM properties;
DELETE FROM tours;
DELETE FROM transport_vehicles;
