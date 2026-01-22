#!/usr/bin/env node

/**
 * Host Dashboard & Tours Test Script
 * Tests host-related functionality including tours, dashboard, and data visibility
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://uwgiostcetoxotfnulfm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.log('⚠️  No SUPABASE_ANON_KEY found, using public access...');
  console.log('   Set SUPABASE_ANON_KEY env var for authenticated tests\n');
}

const supabase = SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.error('❌ Cannot create Supabase client - missing credentials');
  console.log('\nUsage:');
  console.log('  SUPABASE_ANON_KEY=your_key node test-host-dashboard.mjs');
  console.log('  or');
  console.log('  export SUPABASE_ANON_KEY=your_key');
  console.log('  node test-host-dashboard.mjs');
  process.exit(1);
}

// Test configuration
const TEST_HOST_EMAIL = process.env.TEST_HOST_EMAIL || 'host@test.com';
const TEST_HOST_PASSWORD = process.env.TEST_HOST_PASSWORD || 'testpassword123';

const tests = [];
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Starting Host Dashboard & Tours Tests\n');
  console.log('=' .repeat(60));
  
  for (const { name, fn } of tests) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log('✅ PASS');
      results.passed++;
    } catch (error) {
      console.log('❌ FAIL');
      console.error(`   Error: ${error.message}`);
      results.failed++;
      results.errors.push({ test: name, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results: ${results.passed} passed, ${results.failed} failed\n`);
  
  if (results.errors.length > 0) {
    console.log('Failed Tests:');
    results.errors.forEach(({ test, error }) => {
      console.log(`  ❌ ${test}`);
      console.log(`     ${error}`);
    });
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// ============================================================================
// TESTS
// ============================================================================

test('Can fetch tours table', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, title, created_by, is_published')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Can fetch tour_packages table', async () => {
  const { data, error } = await supabase
    .from('tour_packages')
    .select('id, title, host_id, status')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Published tours are queryable', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, title, is_published')
    .eq('is_published', true)
    .limit(10);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
  
  console.log(`\n     Found ${data.length} published tours`);
});

test('Approved tour packages are queryable', async () => {
  const { data, error } = await supabase
    .from('tour_packages')
    .select('id, title, status')
    .eq('status', 'approved')
    .limit(10);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
  
  console.log(`\n     Found ${data.length} approved tour packages`);
});

test('Can query tour with created_by field', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, title, created_by')
    .not('created_by', 'is', null)
    .limit(3);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
  
  // Note: Profile joins may not work due to PostgREST schema cache
  // Frontend uses separate queries instead
});

test('Tour status values are valid', async () => {
  const { data, error } = await supabase
    .from('tour_packages')
    .select('status')
    .limit(20);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  const validStatuses = ['draft', 'pending_approval', 'approved', 'rejected', 'archived'];
  const invalidStatuses = data
    .map(row => row.status)
    .filter(status => !validStatuses.includes(status));
  
  if (invalidStatuses.length > 0) {
    throw new Error(`Invalid statuses found: ${[...new Set(invalidStatuses)].join(', ')}`);
  }
});

test('Can fetch properties for host dashboard', async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, host_id')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Can fetch transport vehicles', async () => {
  const { data, error } = await supabase
    .from('transport_vehicles')
    .select('id, vehicle_type, created_by')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Can fetch transport routes', async () => {
  const { data, error } = await supabase
    .from('transport_routes')
    .select('id, from_location, to_location')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Can fetch bookings', async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, guest_name, total_price, payment_status')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Tour images field is properly structured', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, images')
    .not('images', 'is', null)
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  data.forEach(tour => {
    if (!Array.isArray(tour.images)) {
      throw new Error(`Tour ${tour.id} has invalid images field (not array)`);
    }
  });
});

test('Tour package gallery_images is properly structured', async () => {
  const { data, error } = await supabase
    .from('tour_packages')
    .select('id, gallery_images, cover_image')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  data.forEach(pkg => {
    if (pkg.gallery_images !== null && !Array.isArray(pkg.gallery_images)) {
      throw new Error(`Package ${pkg.id} has invalid gallery_images (not array or null)`);
    }
  });
});

test('Can query tours by category', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, title, category, categories')
    .limit(10);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
  
  console.log(`\n     Found ${data.length} tours with categories`);
});

test('Tour duration_days field is numeric', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, duration_days')
    .not('duration_days', 'is', null)
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  data.forEach(tour => {
    if (typeof tour.duration_days !== 'number') {
      throw new Error(`Tour ${tour.id} has invalid duration_days (not number)`);
    }
  });
});

test('Tour price_per_person field exists and is numeric', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, price_per_person, currency')
    .not('price_per_person', 'is', null)
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  data.forEach(tour => {
    if (typeof tour.price_per_person !== 'number') {
      throw new Error(`Tour ${tour.id} has invalid price_per_person (not number)`);
    }
  });
});

test('Profiles table has tour guide fields', async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, years_of_experience, languages_spoken, tour_guide_bio')
    .limit(3);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  // Just verify the fields exist (can be null)
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Can search tours by title', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, title')
    .ilike('title', '%tour%')
    .limit(5);
  
  if (error) throw new Error(`Search query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Can search tours by location', async () => {
  const { data, error } = await supabase
    .from('tours')
    .select('id, title, location')
    .ilike('location', '%rwanda%')
    .limit(5);
  
  if (error) throw new Error(`Search query failed: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('Expected array result');
});

test('Payment status enum is valid', async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('payment_status')
    .limit(20);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  
  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded', null];
  const invalidStatuses = data
    .map(row => row.payment_status)
    .filter(status => !validPaymentStatuses.includes(status));
  
  if (invalidStatuses.length > 0) {
    throw new Error(`Invalid payment statuses: ${[...new Set(invalidStatuses)].join(', ')}`);
  }
});

// ============================================================================
// RUN TESTS
// ============================================================================

runTests();
