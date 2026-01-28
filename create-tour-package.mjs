import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://uwgiostcetoxotfnulfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0'
);

// Create tour package for user 683f3772-a72c-4ddd-820e-f66bf63475d4
const { data, error } = await supabase
  .from('tour_packages')
  .insert({
    host_id: '683f3772-a72c-4ddd-820e-f66bf63475d4',
    title: 'Gorilla Trekking Package',
    city: 'Kigali',
    categories: ['Adventure', 'Cultural', 'Hiking'],
    tour_type: 'multi_day',
    duration: '2 Days',
    description: 'Experience the majestic mountain gorillas in their natural habitat. This tour includes transportation from Kigali, guided trekking, and all permits.',
    price_per_adult: 100,
    currency: 'RWF',
    max_guests: 10,
    gallery_images: [
      'https://res.cloudinary.com/dxdblhmbm/image/upload/v1769600574/merry360x/dm335wjzjwcgblyzqzej.jpg',
      'https://res.cloudinary.com/dxdblhmbm/image/upload/v1769600574/merry360x/lu8s9uxsdgs7xaaj8c5d.webp',
      'https://res.cloudinary.com/dxdblhmbm/image/upload/v1769600574/merry360x/qxvable085qrcpfzmota.jpg'
    ],
    status: 'approved',
    approved_at: new Date().toISOString()
  })
  .select();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Created tour package:', data[0].id);
}
