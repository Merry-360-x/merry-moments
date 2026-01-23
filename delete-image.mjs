import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const client = createClient(supabaseUrl, supabaseKey);

const imageUrl = 'https://res.cloudinary.com/dxdblhmbm/image/upload/f_auto,q_auto,w_800,h_600,c_fill,fl_progressive/v1769160198/merry360x/jw6dukayo4t2sbuh6lop.jpg';

console.log('\n🔍 Finding tour package with this image...\n');

// Get all packages and search in JavaScript
const { data: packages, error } = await client
  .from('tour_packages')
  .select('*');

if (error) {
  console.error('Error:', error);
} else if (packages && packages.length > 0) {
  const matchingPackages = packages.filter(pkg => 
    pkg.cover_image === imageUrl || 
    (pkg.gallery_images && Array.isArray(pkg.gallery_images) && pkg.gallery_images.includes(imageUrl))
  );
  
  if (matchingPackages.length === 0) {
    console.log('❌ No packages found with this image\n');
  } else {
    console.log(`Found ${matchingPackages.length} package(s):\n`);
    
    for (const pkg of matchingPackages) {
    console.log(`📦 "${pkg.title}"`);
    console.log(`   ID: ${pkg.id}`);
    console.log(`   Cover: ${pkg.cover_image}`);
    console.log(`   Gallery: ${JSON.stringify(pkg.gallery_images)}`);
    
    // Remove the image
    let updated = false;
    const updates = {};
    
    if (pkg.cover_image === imageUrl) {
      updates.cover_image = null;
      updated = true;
      console.log(`   🗑️  Removing from cover_image`);
    }
    
    if (pkg.gallery_images && Array.isArray(pkg.gallery_images)) {
      const filtered = pkg.gallery_images.filter(img => img !== imageUrl);
      if (filtered.length !== pkg.gallery_images.length) {
        updates.gallery_images = filtered.length > 0 ? filtered : null;
        updated = true;
        console.log(`   🗑️  Removing from gallery_images`);
      }
    }
    
    if (updated) {
      const { error: updateError } = await client
        .from('tour_packages')
        .update(updates)
        .eq('id', pkg.id);
      
      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`   ✅ Image removed successfully`);
      }
    }
    console.log('');
  }
}
} else {
  console.log('❌ No packages found\n');
}
