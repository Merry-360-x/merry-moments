#!/usr/bin/env node

/**
 * Visual test script for admin dashboard appearance
 * This script opens the admin dashboard in a browser for manual verification
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAdminDashboard() {
  console.log('🎭 Starting Admin Dashboard Appearance Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Show browser
    slowMo: 500       // Slow down operations for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: join(__dirname, 'test-results'),
      size: { width: 1920, height: 1080 }
    }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Step 1: Navigating to production site...');
    await page.goto('https://merry360x.com');
    await page.waitForTimeout(2000);
    
    console.log('📍 Step 2: Taking homepage screenshot...');
    await page.screenshot({ 
      path: join(__dirname, 'test-results', 'homepage.png'),
      fullPage: true 
    });
    
    console.log('📍 Step 3: Navigating to login page...');
    await page.goto('https://merry360x.com/login');
    await page.waitForTimeout(2000);
    
    console.log('📍 Step 4: Taking login page screenshot...');
    await page.screenshot({ 
      path: join(__dirname, 'test-results', 'login-page.png'),
      fullPage: true 
    });
    
    console.log('\n⏸️  MANUAL STEP REQUIRED:');
    console.log('   1. Please login with admin credentials in the browser window');
    console.log('   2. Navigate to the Admin Dashboard');
    console.log('   3. Look for cancelled paid bookings with refund amounts');
    console.log('   4. Press Enter in this terminal when ready to capture screenshot...\n');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
    console.log('📍 Step 5: Capturing admin dashboard screenshot...');
    await page.screenshot({ 
      path: join(__dirname, 'test-results', 'admin-dashboard-full.png'),
      fullPage: true 
    });
    
    console.log('📍 Step 6: Capturing viewport screenshot...');
    await page.screenshot({ 
      path: join(__dirname, 'test-results', 'admin-dashboard-viewport.png'),
      fullPage: false 
    });
    
    console.log('\n✅ Screenshots saved to test-results/');
    console.log('   - homepage.png');
    console.log('   - login-page.png');
    console.log('   - admin-dashboard-full.png');
    console.log('   - admin-dashboard-viewport.png');
    
    console.log('\n📋 VISUAL CHECKLIST:');
    console.log('   ☐ Dashboard loads without errors');
    console.log('   ☐ Bookings table displays correctly');
    console.log('   ☐ Cancelled paid bookings show "↩ Refund: [amount]"');
    console.log('   ☐ Currency formatting is correct (USD, RWF, EUR)');
    console.log('   ☐ Payment status badges visible');
    console.log('   ☐ Layout is responsive and clean');
    
    console.log('\n⏸️  Press Enter to close browser and exit...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ 
      path: join(__dirname, 'test-results', 'error-screenshot.png'),
      fullPage: true 
    });
  } finally {
    await context.close();
    await browser.close();
    console.log('\n✅ Test completed!');
    process.exit(0);
  }
}

// Handle ctrl+c gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user');
  process.exit(0);
});

testAdminDashboard().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
