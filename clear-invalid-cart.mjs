#!/usr/bin/env node

// Script to clean invalid items from localStorage cart
// Run this in the project directory: node clear-invalid-cart.mjs

console.log('🧹 Cleaning invalid cart items from localStorage...\n');

const GUEST_CART_KEY = 'merry360_guest_cart';

console.log('📝 Instructions:');
console.log('   This script needs to run in your browser console.');
console.log('   Copy and paste the following code:\n');

console.log('---START---');
console.log(`
// Clear invalid cart items
(async function cleanCart() {
  const GUEST_CART_KEY = 'merry360_guest_cart';
  const cartRaw = localStorage.getItem(GUEST_CART_KEY);
  
  if (!cartRaw) {
    console.log('✅ No guest cart found');
    return;
  }
  
  try {
    const cart = JSON.parse(cartRaw);
    console.log(\`Found \${cart.length} items in cart:\`, cart);
    
    // Clear it
    localStorage.removeItem(GUEST_CART_KEY);
    console.log('✅ Cart cleared! Refresh the page.');
    
  } catch (err) {
    console.error('❌ Error:', err);
    console.log('🔧 Forcing clear...');
    localStorage.removeItem(GUEST_CART_KEY);
    console.log('✅ Cart cleared! Refresh the page.');
  }
})();
`);
console.log('---END---');

console.log('\n🌐 Steps:');
console.log('   1. Go to https://merry360x.com');
console.log('   2. Open browser console (F12 or Cmd+Option+I)');
console.log('   3. Copy the code between ---START--- and ---END---');
console.log('   4. Paste it in the console and press Enter');
console.log('   5. Refresh the page');
console.log('\n✅ Done!\n');
