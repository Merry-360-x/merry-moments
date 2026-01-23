import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSampleData() {
  console.log('Inserting sample tours and transport vehicles...\n');
  
  // Insert sample tours
  console.log('1. Inserting tours...');
  const { data: tours, error: toursError } = await supabase
    .from('tours')
    .insert([
      {
        title: 'Gorilla Trekking Adventure',
        location: 'Volcanoes National Park, Rwanda',
        description: 'Once-in-a-lifetime experience tracking mountain gorillas in their natural habitat.',
        category: 'Wildlife',
        difficulty: 'Moderate',
        duration_days: 1,
        price_per_person: 850,
        currency: 'USD',
        rating: 4.9,
        review_count: 234,
        is_published: true,
        images: ['https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800']
      },
      {
        title: 'Nyungwe Canopy Walk',
        location: 'Nyungwe Forest, Rwanda',
        description: 'Walk among the treetops on this thrilling canopy walkway.',
        category: 'Adventure',
        difficulty: 'Easy',
        duration_days: 1,
        price_per_person: 120,
        currency: 'USD',
        rating: 4.6,
        review_count: 178,
        is_published: true,
        images: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800']
      },
      {
        title: 'Akagera Safari Experience',
        location: 'Akagera National Park, Rwanda',
        description: 'Big Five safari adventure in Rwanda\'s premier savanna national park.',
        category: 'Wildlife',
        difficulty: 'Easy',
        duration_days: 3,
        price_per_person: 520,
        currency: 'USD',
        rating: 4.7,
        review_count: 189,
        is_published: true,
        images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800']
      }
    ])
    .select();
  
  if (toursError) {
    console.error('❌ Error inserting tours:', toursError);
  } else {
    console.log(`✅ Inserted ${tours?.length || 0} tours`);
  }
  
  // Insert sample vehicles
  console.log('\n2. Inserting transport vehicles...');
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('transport_vehicles')
    .insert([
      {
        title: 'Toyota Land Cruiser 4WD',
        provider_name: 'Rwanda Safari Tours',
        vehicle_type: 'SUV',
        seats: 7,
        price_per_day: 150,
        currency: 'USD',
        driver_included: true,
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1544636831-6ad51bf3b963?w=800'
      },
      {
        title: 'Mercedes Sprinter Van',
        provider_name: 'Kigali Transport Co',
        vehicle_type: 'Van',
        seats: 15,
        price_per_day: 180,
        currency: 'USD',
        driver_included: true,
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800'
      },
      {
        title: 'Comfortable Sedan',
        provider_name: 'City Ride Rwanda',
        vehicle_type: 'Car',
        seats: 4,
        price_per_day: 80,
        currency: 'USD',
        driver_included: true,
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800'
      }
    ])
    .select();
  
  if (vehiclesError) {
    console.error('❌ Error inserting vehicles:', vehiclesError);
  } else {
    console.log(`✅ Inserted ${vehicles?.length || 0} vehicles`);
  }
  
  console.log('\n✨ Sample data insertion complete!');
}

insertSampleData().catch(console.error);
