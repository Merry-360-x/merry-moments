-- Add Kigali airport neighborhood routes (both directions)
-- Requested locations: Gisozi, Rebero, Gacuriro, Kiyovu, Kimironko, Nyamirambo, Gikondo

INSERT INTO airport_transfer_routes (from_location, to_location, distance_km, base_price, currency, is_active)
SELECT route.from_location, route.to_location, route.distance_km, route.base_price, route.currency, true
FROM (
  VALUES
    ('Kigali Airport', 'Gisozi', 13.5, 20000, 'RWF'),
    ('Gisozi', 'Kigali Airport', 13.5, 20000, 'RWF'),
    ('Kigali Airport', 'Rebero', 14.5, 21000, 'RWF'),
    ('Rebero', 'Kigali Airport', 14.5, 21000, 'RWF'),
    ('Kigali Airport', 'Gacuriro', 12.0, 18000, 'RWF'),
    ('Gacuriro', 'Kigali Airport', 12.0, 18000, 'RWF'),
    ('Kigali Airport', 'Kiyovu', 11.5, 17500, 'RWF'),
    ('Kiyovu', 'Kigali Airport', 11.5, 17500, 'RWF'),
    ('Kigali Airport', 'Kimironko', 8.0, 13000, 'RWF'),
    ('Kimironko', 'Kigali Airport', 8.0, 13000, 'RWF'),
    ('Kigali Airport', 'Nyamirambo', 15.0, 22000, 'RWF'),
    ('Nyamirambo', 'Kigali Airport', 15.0, 22000, 'RWF'),
    ('Kigali Airport', 'Gikondo', 9.0, 14500, 'RWF'),
    ('Gikondo', 'Kigali Airport', 9.0, 14500, 'RWF')
) AS route(from_location, to_location, distance_km, base_price, currency)
WHERE NOT EXISTS (
  SELECT 1
  FROM airport_transfer_routes existing
  WHERE lower(existing.from_location) = lower(route.from_location)
    AND lower(existing.to_location) = lower(route.to_location)
);
