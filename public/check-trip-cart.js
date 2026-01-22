// Script to check and clean up trip cart issues
// Run this in your browser console on merry360x.com

console.log('🔍 Trip Cart Diagnostics\n');

// 1. Check localStorage
const GUEST_CART_KEY = 'merry360_guest_cart';
const cartRaw = localStorage.getItem(GUEST_CART_KEY);

if (!cartRaw) {
  console.log('❌ No guest cart found in localStorage');
  console.log('   This means you are either:\n   - Logged in (cart is in database)\n   - Haven\'t added anything yet');
} else {
  console.log('✅ Found guest cart in localStorage:');
  try {
    const cart = JSON.parse(cartRaw);
    console.log(`   ${cart.length} items found:\n`);
    cart.forEach((item, index) => {
      console.log(`   ${index + 1}. Type: ${item.item_type}`);
      console.log(`      Reference ID: ${item.reference_id}`);
      console.log(`      Quantity: ${item.quantity}`);
      console.log(`      Added: ${new Date(item.created_at).toLocaleString()}\n`);
    });
    
    // Test if those IDs exist
    console.log('🔍 Testing if these items exist in database...\n');
    
    for (const item of cart) {
      const tableName = item.item_type === 'tour' ? 'tours' :
                        item.item_type === 'property' ? 'properties' :
                        item.item_type === 'transport_vehicle' ? 'transport_vehicles' :
                        item.item_type === 'tour_package' ? 'tour_packages' : 'unknown';
      
      console.log(`   Testing ${item.item_type} with ID ${item.reference_id}...`);
      
      if (tableName !== 'unknown') {
        const url = `https://uwgiostcetoxotfnulfm.supabase.co/rest/v1/${tableName}?id=eq.${item.reference_id}&select=id,title`;
        const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA';
        
        try {
          const response = await fetch(url, {
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              console.log(`      ✅ Found: ${data[0].title || data[0].id}`);
            } else {
              console.log(`      ❌ NOT FOUND - This item doesn't exist!`);
              console.log(`      🔧 You should remove this from cart`);
            }
          } else {
            console.log(`      ⚠️  Error ${response.status}: ${response.statusText}`);
          }
        } catch (err) {
          console.log(`      ❌ Failed to fetch: ${err.message}`);
        }
      }
    }
    
    // Offer to clean
    console.log('\n🔧 To clean invalid items from cart, run:');
    console.log('   localStorage.removeItem("merry360_guest_cart")');
    console.log('   Then refresh the page');
    
  } catch (err) {
    console.error('❌ Error parsing cart:', err);
    console.log('🔧 Cart data is corrupted. Clear it with:');
    console.log('   localStorage.removeItem("merry360_guest_cart")');
  }
}

// 2. Check if logged in
console.log('\n👤 User authentication status:');
const supabaseAuth = localStorage.getItem('sb-uwgiostcetoxotfnulfm-auth-token');
if (supabaseAuth) {
  try {
    const authData = JSON.parse(supabaseAuth);
    if (authData && authData.user) {
      console.log(`   ✅ Logged in as: ${authData.user.email || authData.user.id}`);
      console.log('   💡 Your cart is stored in the database, not localStorage');
      console.log('   🔍 Check the trip_cart_items table in Supabase dashboard');
    } else {
      console.log('   ❌ Not logged in');
    }
  } catch {
    console.log('   ❌ Not logged in');
  }
} else {
  console.log('   ❌ Not logged in (guest mode)');
}

console.log('\n✅ Diagnostics complete!');
