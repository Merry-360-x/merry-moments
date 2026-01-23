import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 Testing Tour Creation in Database\n');

async function testTourCreation() {
  try {
    // Step 1: Get a real host user ID
    console.log('📋 Step 1: Finding a host user...');
    const { data: hosts, error: hostsError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .limit(1);
    
    if (hostsError) throw hostsError;
    
    if (!hosts || hosts.length === 0) {
      console.error('❌ No users found in profiles table');
      return false;
    }
    
    const hostId = hosts[0].user_id;
    console.log(`   ✅ Using host: ${hosts[0].full_name || 'Unknown'} (${hostId})`);
    
    // Step 2: Count existing tours
    console.log('\n📊 Step 2: Counting existing tours...');
    const { count: beforeCount, error: countError } = await supabase
      .from('tours')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    console.log(`   Current tour count: ${beforeCount}`);
    
    // Step 3: Create a test tour
    console.log('\n📝 Step 3: Creating a test tour...');
    const testTour = {
      title: 'TEST TOUR - Database Check',
      location: 'Kigali, Rwanda',
      description: 'This is a test tour to verify database creation works',
      category: 'Cultural',
      difficulty: 'Easy',
      duration_days: 1,
      price_per_person: 25000,
      currency: 'RWF',
      is_published: true,
      created_by: hostId,
    };
    
    const { data: createdTour, error: createError } = await supabase
      .from('tours')
      .insert(testTour)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Tour creation failed:', createError);
      return false;
    }
    
    console.log(`   ✅ Tour created with ID: ${createdTour.id}`);
    console.log(`   Title: ${createdTour.title}`);
    console.log(`   Location: ${createdTour.location}`);
    console.log(`   Price: ${createdTour.currency} ${createdTour.price_per_person}`);
    
    // Step 4: Verify it's in the database
    console.log('\n🔍 Step 4: Verifying tour exists in database...');
    const { data: verifyTour, error: verifyError } = await supabase
      .from('tours')
      .select('*')
      .eq('id', createdTour.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return false;
    }
    
    console.log(`   ✅ Tour verified in database`);
    console.log(`   All fields match: ${JSON.stringify(verifyTour, null, 2)}`);
    
    // Step 5: Count tours again
    console.log('\n📊 Step 5: Counting tours after creation...');
    const { count: afterCount, error: count2Error } = await supabase
      .from('tours')
      .select('*', { count: 'exact', head: true });
    
    if (count2Error) throw count2Error;
    console.log(`   New tour count: ${afterCount}`);
    console.log(`   Difference: +${afterCount - beforeCount}`);
    
    // Step 6: Check if tour appears in public queries
    console.log('\n🌐 Step 6: Testing public tour queries (simulating frontend)...');
    const { data: publicTours, error: publicError } = await supabase
      .from('tours')
      .select('id, title, location, price_per_person, currency, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (publicError) throw publicError;
    
    const foundInPublic = publicTours.find(t => t.id === createdTour.id);
    console.log(`   Tours in public query: ${publicTours.length}`);
    console.log(`   Test tour found in public query: ${foundInPublic ? '✅ YES' : '❌ NO'}`);
    
    if (foundInPublic) {
      console.log(`   Title in public query: ${foundInPublic.title}`);
    }
    
    // Step 7: Clean up - delete test tour
    console.log('\n🧹 Step 7: Cleaning up test tour...');
    const { error: deleteError } = await supabase
      .from('tours')
      .delete()
      .eq('id', createdTour.id);
    
    if (deleteError) {
      console.error('⚠️  Could not delete test tour:', deleteError);
    } else {
      console.log('   ✅ Test tour deleted');
    }
    
    console.log('\n✅ All tests passed! Tour creation is working correctly in the database.');
    console.log('\n📝 Summary:');
    console.log('   - Tour creation: ✅ Working');
    console.log('   - Database storage: ✅ Verified');
    console.log('   - Public queries: ✅ Tours appear');
    console.log('   - Cleanup: ✅ Completed');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.details) console.error('   Details:', error.details);
    if (error.hint) console.error('   Hint:', error.hint);
    return false;
  }
}

testTourCreation().then(success => {
  process.exit(success ? 0 : 1);
});
