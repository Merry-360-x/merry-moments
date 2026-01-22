-- Create Sample Tours
-- Run this in Supabase SQL Editor

INSERT INTO tours (
  title,
  description,
  category,
  location,
  duration_days,
  difficulty,
  price_per_person,
  currency,
  max_group_size,
  images,
  is_published
) VALUES
(
  'Gorilla Trekking Adventure',
  'Experience the thrill of encountering mountain gorillas in their natural habitat. This unforgettable journey takes you through the lush forests of Volcanoes National Park.',
  'Wildlife Safari',
  'Volcanoes National Park, Musanze',
  2,
  'Moderate',
  1500,
  'USD',
  8,
  ARRAY['https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800', 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800'],
  true
),
(
  'Kigali City Cultural Tour',
  'Discover the vibrant culture and history of Rwanda''s capital city. Visit the Kigali Genocide Memorial, explore local markets, and enjoy authentic Rwandan cuisine.',
  'Cultural Tour',
  'Kigali City',
  1,
  'Easy',
  150,
  'USD',
  15,
  ARRAY['https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800', 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800'],
  true
),
(
  'Lake Kivu Beach Retreat',
  'Relax on the stunning shores of Lake Kivu, one of Africa''s Great Lakes. Enjoy water sports, boat rides, and breathtaking sunsets.',
  'Beach & Relaxation',
  'Gisenyi, Lake Kivu',
  3,
  'Easy',
  450,
  'USD',
  20,
  ARRAY['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
  true
),
(
  'Nyungwe Forest Canopy Walk',
  'Walk among the treetops on East Africa''s only canopy walkway, suspended 70 meters above the forest floor. Spot primates and birds.',
  'Adventure',
  'Nyungwe National Park',
  2,
  'Moderate',
  350,
  'USD',
  12,
  ARRAY['https://images.unsplash.com/photo-1596003906949-67221c37965c?w=800', 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800'],
  true
),
(
  'Akagera Wildlife Safari',
  'Embark on an exciting safari adventure in Akagera National Park. Spot the Big Five and experience Rwanda''s diverse wildlife.',
  'Wildlife Safari',
  'Akagera National Park',
  3,
  'Easy',
  800,
  'USD',
  10,
  ARRAY['https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800', 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800'],
  true
);

-- Verify tours were created
SELECT id, title, location, price_per_person, currency, is_published 
FROM tours 
ORDER BY created_at DESC;
