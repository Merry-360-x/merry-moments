#!/usr/bin/env node
/**
 * Create Sample Tours for Testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleTours() {
  console.log('🎯 Creating sample tours...\n');

  const sampleTours = [
    {
      title: 'Gorilla Trekking Adventure',
      description: 'Experience the thrill of encountering mountain gorillas in their natural habitat. This unforgettable journey takes you through the lush forests of Volcanoes National Park, where you\'ll spend precious moments observing these magnificent creatures up close.',
      category: 'Wildlife Safari',
      location: 'Volcanoes National Park, Musanze',
      duration_days: 2,
      difficulty: 'Moderate',
      price_per_person: 1500,
      currency: 'USD',
      max_group_size: 8,
      images: [
        'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800',
        'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800'
      ],
      is_published: true
    },
    {
      title: 'Kigali City Cultural Tour',
      description: 'Discover the vibrant culture and history of Rwanda\'s capital city. Visit the Kigali Genocide Memorial, explore local markets, enjoy authentic Rwandan cuisine, and experience the warmth of Kigali\'s people.',
      category: 'Cultural Tour',
      location: 'Kigali City',
      duration_days: 1,
      difficulty: 'Easy',
      price_per_person: 150,
      currency: 'USD',
      max_group_size: 15,
      images: [
        'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800',
        'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800'
      ],
      is_published: true
    },
    {
      title: 'Lake Kivu Beach Retreat',
      description: 'Relax on the stunning shores of Lake Kivu, one of Africa\'s Great Lakes. Enjoy water sports, boat rides, and breathtaking sunsets while staying at beautiful lakeside accommodations.',
      category: 'Beach & Relaxation',
      location: 'Gisenyi, Lake Kivu',
      duration_days: 3,
      difficulty: 'Easy',
      price_per_person: 450,
      currency: 'USD',
      max_group_size: 20,
      images: [
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
      ],
      is_published: true
    },
    {
      title: 'Nyungwe Forest Canopy Walk',
      description: 'Walk among the treetops on East Africa\'s only canopy walkway, suspended 70 meters above the forest floor. Spot primates, birds, and enjoy panoramic views of the ancient rainforest.',
      category: 'Adventure',
      location: 'Nyungwe National Park',
      duration_days: 2,
      difficulty: 'Moderate',
      price_per_person: 350,
      currency: 'USD',
      max_group_size: 12,
      images: [
        'https://images.unsplash.com/photo-1596003906949-67221c37965c?w=800',
        'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800'
      ],
      is_published: true
    },
    {
      title: 'Akagera Wildlife Safari',
      description: 'Embark on an exciting safari adventure in Akagera National Park. Spot the Big Five, cruise on Lake Ihema, and experience Rwanda\'s diverse wildlife and stunning savanna landscapes.',
      category: 'Wildlife Safari',
      location: 'Akagera National Park',
      duration_days: 3,
      difficulty: 'Easy',
      price_per_person: 800,
      currency: 'USD',
      max_group_size: 10,
      images: [
        'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800',
        'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800'
      ],
      is_published: true
    }
  ];

  try {
    for (const tour of sampleTours) {
      const { data, error } = await supabase
        .from('tours')
        .insert(tour)
        .select()
        .single();

      if (error) {
        console.log(`❌ Failed to create "${tour.title}":`, error.message);
      } else {
        console.log(`✅ Created: ${data.title}`);
        console.log(`   📍 ${data.location}`);
        console.log(`   💰 ${data.currency} ${data.price_per_person}/person`);
        console.log(`   🔗 https://merry360x.com/tours/${data.id}\n`);
      }
    }

    console.log('\n✨ Sample tours created successfully!');
    console.log('Visit https://merry360x.com/tours to see them.');
    
  } catch (error) {
    console.error('💥 Error creating tours:', error);
    process.exit(1);
  }
}

createSampleTours();
