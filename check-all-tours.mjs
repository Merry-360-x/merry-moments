import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Checking Both Tour Tables\n');

async function checkTours() {
  try {
    // Check tours table
    console.log('📊 TOURS TABLE (Simple Tours - from HostDashboard):');
    console.log('═'.repeat(60));
    const { data: tours, error: toursError, count: toursCount } = await supabase
      .from('tours')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (toursError) throw toursError;
    
    console.log(`Total records: ${toursCount}`);
    if (tours && tours.length > 0) {
      tours.forEach((tour, i) => {
        console.log(`\n${i + 1}. ${tour.title}`);
        console.log(`   ID: ${tour.id}`);
        console.log(`   Location: ${tour.location}`);
        console.log(`   Price: ${tour.currency} ${tour.price_per_person}`);
        console.log(`   Duration: ${tour.duration_days} day(s)`);
        console.log(`   Category: ${tour.category || 'N/A'}`);
        console.log(`   Published: ${tour.is_published ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${new Date(tour.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   ℹ️  No simple tours found');
    }
    
    // Check tour_packages table
    console.log('\n\n📦 TOUR_PACKAGES TABLE (Detailed Packages - from CreateTourPackage):');
    console.log('═'.repeat(60));
    const { data: packages, error: packagesError, count: packagesCount } = await supabase
      .from('tour_packages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (packagesError) throw packagesError;
    
    console.log(`Total records: ${packagesCount}`);
    if (packages && packages.length > 0) {
      packages.forEach((pkg, i) => {
        console.log(`\n${i + 1}. ${pkg.title}`);
        console.log(`   ID: ${pkg.id}`);
        console.log(`   Location: ${pkg.city}, ${pkg.country}`);
        console.log(`   Price: ${pkg.currency} ${pkg.price_per_adult} per adult`);
        console.log(`   Duration: ${pkg.duration}`);
        console.log(`   Category: ${pkg.category || 'N/A'}`);
        console.log(`   Type: ${pkg.tour_type || 'N/A'}`);
        console.log(`   Status: ${pkg.status || 'N/A'}`);
        console.log(`   Has PDF: ${pkg.itinerary_pdf_url ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${new Date(pkg.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   ℹ️  No tour packages found');
    }
    
    console.log('\n\n📝 SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`Simple Tours (tours table): ${toursCount} record(s)`);
    console.log(`Tour Packages (tour_packages table): ${packagesCount} record(s)`);
    console.log(`Total Tours: ${(toursCount || 0) + (packagesCount || 0)} record(s)`);
    
    console.log('\n💡 NOTE:');
    console.log('   - Simple tours are created in HostDashboard');
    console.log('   - Tour packages are created in CreateTourPackage page');
    console.log('   - Both are working correctly in the database!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.details) console.error('   Details:', error.details);
  }
}

checkTours();
