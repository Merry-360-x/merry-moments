-- Insert sample data to ensure all pages have content to display
-- This populates the database with realistic sample data for testing

-- Sample Properties Data
INSERT INTO properties (
    title, location, description, property_type, price_per_night, currency,
    bedrooms, bathrooms, beds, max_guests, rating, review_count,
    check_in_time, check_out_time, is_published, images, created_at
) VALUES
('Luxury Safari Lodge', 'Kigali, Rwanda', 'Stunning luxury safari lodge with panoramic views of the African savanna. Perfect for wildlife enthusiasts and adventure seekers.', 'Lodge', 450, 'USD', 3, 2, 4, 6, 4.8, 127, '14:00:00', '11:00:00', true, ARRAY['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800']::text[], NOW() - INTERVAL '1 day'),

('Serene Lake Resort', 'Rubavu, Rwanda', 'Peaceful lakeside resort with pristine waters and mountain views. Ideal for relaxation and water activities.', 'Resort', 320, 'USD', 2, 2, 2, 4, 4.6, 89, '15:00:00', '10:00:00', true, ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800']::text[], NOW() - INTERVAL '2 days'),

('Modern City Hotel', 'Kigali City Center, Rwanda', 'Contemporary hotel in the heart of Kigali with modern amenities and excellent service. Perfect for business and leisure travelers.', 'Hotel', 180, 'USD', 1, 1, 2, 2, 4.4, 203, '14:00:00', '12:00:00', true, ARRAY['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800']::text[], NOW() - INTERVAL '3 days'),

('Mountain View Villa', 'Musanze, Rwanda', 'Spectacular villa with breathtaking mountain views near Volcanoes National Park. Perfect for gorilla trekking adventures.', 'Villa', 280, 'USD', 4, 3, 6, 8, 4.9, 156, '16:00:00', '11:00:00', true, ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=800']::text[], NOW() - INTERVAL '4 days'),

('Cozy Forest Guesthouse', 'Nyungwe Forest, Rwanda', 'Charming guesthouse nestled in the lush Nyungwe Forest. Experience nature at its finest with hiking and canopy walks.', 'Guesthouse', 150, 'USD', 2, 1, 3, 4, 4.3, 74, '13:00:00', '10:00:00', true, ARRAY['https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800']::text[], NOW() - INTERVAL '5 days'),

('Boutique Garden Hotel', 'Kigali, Rwanda', 'Elegant boutique hotel with beautiful gardens and personalized service. A tranquil oasis in the bustling city.', 'Hotel', 220, 'USD', 1, 1, 1, 2, 4.7, 92, '15:00:00', '11:00:00', true, ARRAY['https://images.unsplash.com/photo-1587874895272-f9a1d6c82a04?w=800', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800']::text[], NOW() - INTERVAL '6 days')

ON CONFLICT (id) DO NOTHING;

-- Sample Tours Data
INSERT INTO tours (
    title, location, description, category, difficulty, duration_days, 
    price_per_person, currency, rating, review_count, is_published, images, created_at
) VALUES
('Gorilla Trekking Adventure', 'Volcanoes National Park, Rwanda', 'Once-in-a-lifetime experience tracking mountain gorillas in their natural habitat. Expert guides ensure safe and memorable encounters.', 'Wildlife', 'Moderate', 1, 850, 'USD', 4.9, 234, true, ARRAY['https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800']::text[], NOW() - INTERVAL '1 day'),

('Nyungwe Canopy Walk', 'Nyungwe Forest, Rwanda', 'Walk among the treetops on this thrilling canopy walkway suspended 50 meters above the forest floor. Spot primates and exotic birds.', 'Adventure', 'Easy', 1, 120, 'USD', 4.6, 178, true, ARRAY['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800']::text[], NOW() - INTERVAL '2 days'),

('Lake Kivu Cultural Tour', 'Rubavu, Rwanda', 'Immerse yourself in local culture with visits to traditional villages, fishing communities, and artisan workshops around beautiful Lake Kivu.', 'Cultural', 'Easy', 2, 180, 'USD', 4.4, 95, true, ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800']::text[], NOW() - INTERVAL '3 days'),

('Kigali City Discovery', 'Kigali, Rwanda', 'Explore Rwanda''s vibrant capital with visits to museums, markets, and historical sites. Learn about the country''s remarkable transformation.', 'Cultural', 'Easy', 1, 95, 'USD', 4.5, 156, true, ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800']::text[], NOW() - INTERVAL '4 days'),

('Akagera Safari Experience', 'Akagera National Park, Rwanda', 'Big Five safari adventure in Rwanda''s premier savanna national park. Spot elephants, lions, rhinos, and diverse wildlife on game drives.', 'Wildlife', 'Easy', 3, 520, 'USD', 4.7, 189, true, ARRAY['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 'https://images.unsplash.com/photo-1580789524611-39bceccc2e02?w=800']::text[], NOW() - INTERVAL '5 days'),

('Golden Monkey Tracking', 'Volcanoes National Park, Rwanda', 'Track the rare and beautiful golden monkeys in the bamboo forests of Volcanoes National Park. A unique primate experience.', 'Wildlife', 'Moderate', 1, 180, 'USD', 4.3, 67, true, ARRAY['https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800']::text[], NOW() - INTERVAL '6 days')

ON CONFLICT (id) DO NOTHING;

-- Sample Transport Vehicles Data
INSERT INTO transport_vehicles (
    title, provider_name, vehicle_type, seats, price_per_day, currency,
    driver_included, is_published, image_url, created_at
) VALUES
('Toyota Land Cruiser 4WD', 'Rwanda Safari Tours', 'SUV', 7, 150, 'USD', true, true, 'https://images.unsplash.com/photo-1544636831-6ad51bf3b963?w=800', NOW() - INTERVAL '1 day'),

('Mercedes Sprinter Van', 'Kigali Transport Co', 'Van', 15, 180, 'USD', true, true, 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800', NOW() - INTERVAL '2 days'),

('Comfortable Sedan', 'City Ride Rwanda', 'Car', 4, 80, 'USD', true, true, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800', NOW() - INTERVAL '3 days'),

('Luxury Coach Bus', 'Premium Transport Rwanda', 'Bus', 45, 300, 'USD', true, true, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800', NOW() - INTERVAL '4 days'),

('Mountain Jeep 4x4', 'Adventure Rides Rwanda', 'Jeep', 5, 120, 'USD', true, true, 'https://images.unsplash.com/photo-1606240842707-1ca21c1b3e7c?w=800', NOW() - INTERVAL '5 days'),

('Executive Minibus', 'Executive Transport Ltd', 'Minibus', 12, 200, 'USD', true, true, 'https://images.unsplash.com/photo-1544636831-6ad51bf3b963?w=800', NOW() - INTERVAL '6 days')

ON CONFLICT (id) DO NOTHING;

-- Sample Transport Routes Data  
INSERT INTO transport_routes (
    from_location, to_location, base_price, currency, is_published, created_at
) VALUES
('Kigali Airport', 'City Center', 25, 'USD', true, NOW() - INTERVAL '1 day'),
('Kigali', 'Volcanoes National Park', 120, 'USD', true, NOW() - INTERVAL '2 days'),
('Kigali', 'Lake Kivu (Rubavu)', 80, 'USD', true, NOW() - INTERVAL '3 days'),
('Kigali', 'Akagera National Park', 150, 'USD', true, NOW() - INTERVAL '4 days'),
('Kigali', 'Nyungwe Forest', 100, 'USD', true, NOW() - INTERVAL '5 days'),
('Volcanoes National Park', 'Lake Kivu', 90, 'USD', true, NOW() - INTERVAL '6 days'),
('Lake Kivu', 'Nyungwe Forest', 70, 'USD', true, NOW() - INTERVAL '7 days'),
('Akagera', 'Kigali Airport', 180, 'USD', true, NOW() - INTERVAL '8 days')

ON CONFLICT (id) DO NOTHING;