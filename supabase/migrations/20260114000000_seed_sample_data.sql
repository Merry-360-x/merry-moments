-- Allow NULL host_id for demo/seed data
-- This enables adding sample content without needing registered users

-- Alter properties table to allow NULL host_id
ALTER TABLE properties ALTER COLUMN host_id DROP NOT NULL;

-- Alter tours table to allow NULL host_id
ALTER TABLE tours ALTER COLUMN host_id DROP NOT NULL;

-- Sample Properties (Accommodations)
INSERT INTO properties (
  id, host_id, title, name, description, location, lat, lng,
  property_type, bedrooms, bathrooms, beds, max_guests, 
  price_per_night, currency, amenities, images,
  check_in_time, check_out_time,
  is_published, is_featured, rating, review_count,
  smoking_allowed, pets_allowed, events_allowed,
  created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  NULL,
  'Luxury Beachfront Villa',
  'Beachfront Villa',
  'Experience paradise in this stunning beachfront villa with panoramic ocean views, private pool, and direct beach access. Perfect for families and groups looking for an unforgettable getaway.',
  'Cape Town, South Africa',
  -33.9249, 18.4241,
  'Villa',
  4, 3, 6, 8,
  350, 'USD',
  ARRAY['wifi', 'pool', 'kitchen', 'air_conditioning', 'parking'],
  ARRAY['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
  '14:00', '11:00',
  true, true, 4.9, 127,
  false, false, false,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Mountain View Lodge',
  'Mountain Lodge',
  'Escape to the mountains in this cozy lodge with breathtaking views. Features a fireplace, hot tub, and hiking trails right at your doorstep.',
  'Drakensberg, South Africa',
  -28.7365, 29.1013,
  'Lodge',
  3, 2, 4, 6,
  220, 'USD',
  ARRAY['wifi', 'fireplace', 'kitchen', 'parking'],
  ARRAY['https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800', 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800'],
  '15:00', '10:00',
  true, true, 4.8, 89,
  false, true, false,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Modern City Apartment',
  'City Apartment',
  'Sleek and stylish apartment in the heart of the city. Walking distance to restaurants, shops, and entertainment. Perfect for business travelers and urban explorers.',
  'Johannesburg, South Africa',
  -26.2041, 28.0473,
  'Apartment',
  2, 1, 2, 4,
  120, 'USD',
  ARRAY['wifi', 'air_conditioning', 'kitchen', 'gym', 'parking'],
  ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
  '14:00', '11:00',
  true, false, 4.6, 56,
  false, false, false,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Safari Bush Camp',
  'Safari Camp',
  'Immerse yourself in the African wilderness at this luxury safari camp. Experience close encounters with wildlife while enjoying premium comfort.',
  'Kruger National Park, South Africa',
  -24.0157, 31.4854,
  'Resort',
  2, 1, 2, 2,
  450, 'USD',
  ARRAY['wifi', 'air_conditioning', 'pool', 'restaurant'],
  ARRAY['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800', 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800'],
  '12:00', '10:00',
  true, true, 4.95, 203,
  false, false, false,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Coastal Boutique Hotel',
  'Boutique Hotel',
  'Charming boutique hotel with ocean views, gourmet restaurant, and spa. Perfect for romantic getaways and relaxation.',
  'Durban, South Africa',
  -29.8587, 31.0218,
  'Hotel',
  1, 1, 1, 2,
  180, 'USD',
  ARRAY['wifi', 'air_conditioning', 'pool', 'spa', 'restaurant'],
  ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800'],
  '14:00', '12:00',
  true, false, 4.7, 142,
  false, false, false,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Wine Country Estate',
  'Wine Estate',
  'Elegant estate in the heart of wine country. Enjoy wine tastings, gourmet dining, and stunning vineyard views.',
  'Stellenbosch, South Africa',
  -33.9321, 18.8602,
  'Villa',
  5, 4, 6, 10,
  550, 'USD',
  ARRAY['wifi', 'pool', 'kitchen', 'parking', 'garden'],
  ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
  '15:00', '11:00',
  true, true, 4.85, 178,
  false, true, true,
  NOW(), NOW()
);

-- Sample Tours
INSERT INTO tours (
  id, host_id, title, name, description, destination, location, 
  duration_days, price_per_person, price, currency, category,
  images, main_image,
  is_published, is_featured, rating, review_count,
  created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  NULL,
  'Cape Town City Explorer',
  'Cape Town City Explorer',
  'Discover the best of Cape Town in this comprehensive day tour. Visit Table Mountain, the V&A Waterfront, Bo-Kaap, and enjoy stunning coastal views along Chapmans Peak Drive.',
  'Cape Town',
  'Cape Town, South Africa',
  1,
  150, 150, 'USD',
  'City Tour',
  ARRAY['https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800', 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=800'],
  'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
  true, true, 4.8, 256,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Kruger Safari Adventure',
  'Kruger Safari Adventure',
  'Experience the thrill of an African safari in the world-famous Kruger National Park. Spot the Big Five and discover incredible wildlife in their natural habitat.',
  'Kruger National Park',
  'Kruger National Park, South Africa',
  3,
  850, 850, 'USD',
  'Safari',
  ARRAY['https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800', 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800'],
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800',
  true, true, 4.95, 189,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Garden Route Discovery',
  'Garden Route Discovery',
  'Journey along South Africas famous Garden Route, from lush forests to pristine beaches. Visit Knysna, Plettenberg Bay, and Tsitsikamma National Park.',
  'Garden Route',
  'Garden Route, South Africa',
  5,
  1200, 1200, 'USD',
  'Road Trip',
  ARRAY['https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'],
  'https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=800',
  true, true, 4.75, 134,
  NOW(), NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Wine Tasting Experience',
  'Wine Tasting Experience',
  'Explore the famous Cape Winelands and taste world-class wines. Visit historic wine estates in Stellenbosch, Franschhoek, and Paarl.',
  'Cape Winelands',
  'Stellenbosch, South Africa',
  1,
  180, 180, 'USD',
  'Food & Wine',
  ARRAY['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800'],
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
  true, false, 4.85, 98,
  NOW(), NOW()
);

-- Sample Transport Vehicles
INSERT INTO transport_vehicles (
  id, title, provider_name, vehicle_type, seats, 
  price_per_day, currency, driver_included, media, image_url,
  is_published, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  'Luxury Safari 4x4',
  'Merry Moments Transport',
  'SUV',
  7,
  180, 'USD', false,
  ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'],
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
  true, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Executive Sedan',
  'Merry Moments Transport',
  'Sedan',
  4,
  150, 'USD', true,
  ARRAY['https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800'],
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800',
  true, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Family Minivan',
  'Merry Moments Transport',
  'Van',
  10,
  120, 'USD', false,
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  true, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Compact City Car',
  'Merry Moments Transport',
  'Compact',
  5,
  45, 'USD', false,
  ARRAY['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800'],
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
  true, NOW(), NOW()
);

-- Add sample transport routes
INSERT INTO transport_routes (
  id, from_location, to_location, base_price, currency, created_at
) VALUES 
(
  gen_random_uuid(),
  'Cape Town Airport',
  'Cape Town City Center',
  50, 'USD', NOW()
),
(
  gen_random_uuid(),
  'Johannesburg Airport',
  'Johannesburg City Center',
  45, 'USD', NOW()
),
(
  gen_random_uuid(),
  'Durban Airport',
  'Durban City Center',
  40, 'USD', NOW()
);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
