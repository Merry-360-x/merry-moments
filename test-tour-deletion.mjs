import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 Testing Tour Deletion Functionality\n');

async function testTourDeletion() {
  try {
    // Step 1: Check existing tours
    console.log('📋 Step 1: Checking existing tours...');
    const { data: beforeTours, error: beforeError } = await supabase
      .from('tours')
      .select('id, title, created_by')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (beforeError) throw beforeError;
    console.log(`   Found ${beforeTours.length} recent tours`);
    if (beforeTours.length > 0) {
      beforeTours.forEach(t => console.log(`   - ${t.title} (${t.id})`));
    }
    
    // Step 2: Create a test tour
    console.log('\n📝 Step 2: Creating a test tour...');
    const testTour = {
      title: 'TEST DELETE ME - Automated Test Tour',
      location: 'Test Location',
      description: 'This is a test tour that should be deleted',
      category: 'Cultural',
      difficulty: 'Easy',
      duration_days: 1,
      price_per_person: 10000,
      currency: 'RWF',
      is_published: true,
      created_by: beforeTours[0]?.created_by || null, // Use existing host or null
    };
    
    const { data: createdTour, error: createError } = await supabase
      .from('tours')
      .insert(testTour)
      .select()
      .single();
    
    if (createError) throw createError;
    console.log(`   ✅ Created test tour: ${createdTour.id}`);
    console.log(`   Title: ${createdTour.title}`);
    
    // Step 3: Verify it exists
    console.log('\n🔍 Step 3: Verifying tour exists in database...');
    const { data: verifyTour, error: verifyError } = await supabase
      .from('tours')
      .select('*')
      .eq('id', createdTour.id)
      .single();
    
    if (verifyError) throw verifyError;
    console.log(`   ✅ Tour exists: ${verifyTour.title}`);
    
    // Step 4: Delete the tour
    console.log('\n🗑️  Step 4: Deleting the test tour...');
    const { error: deleteError } = await supabase
      .from('tours')
      .delete()
      .eq('id', createdTour.id);
    
    if (deleteError) throw deleteError;
    console.log(`   ✅ Delete operation completed`);
    
    // Step 5: Verify it's deleted
    console.log('\n✔️  Step 5: Verifying tour is deleted...');
    const { data: afterDelete, error: afterError } = await supabase
      .from('tours')
      .select('*')
      .eq('id', createdTour.id)
      .single();
    
    if (afterError && afterError.code === 'PGRST116') {
      console.log(`   ✅ Tour successfully deleted (not found in database)`);
    } else if (afterDelete) {
      console.log(`   ❌ FAILED: Tour still exists in database!`);
      return false;
    } else {
      throw afterError;
    }
    
    // Step 6: Check total count
    console.log('\n📊 Step 6: Checking total tour count...');
    const { data: afterTours, error: countError } = await supabase
      .from('tours')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (countError) throw countError;
    console.log(`   Current tours: ${afterTours.length}`);
    
    // Check if our test tour is in the list
    const foundDeletedTour = afterTours.find(t => t.id === createdTour.id);
    if (foundDeletedTour) {
      console.log(`   ❌ FAILED: Deleted tour still appears in query results!`);
      return false;
    }
    
    console.log('\n✅ All tests passed! Tour deletion works correctly.');
    console.log('\n📝 Summary:');
    console.log('   - Tour creation: ✅');
    console.log('   - Tour deletion: ✅');
    console.log('   - Database verification: ✅');
    console.log('   - Cache consistency: Should update on next page load');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  }
}

testTourDeletion().then(success => {
  process.exit(success ? 0 : 1);
});
