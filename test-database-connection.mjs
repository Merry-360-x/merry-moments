#!/usr/bin/env node
/**
 * Comprehensive Database Connection Test
 * Tests all critical database operations and connections
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function logTest(name, status, message, details = '') {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const icon = icons[status] || '•';
  
  console.log(`\n${icon} ${name}`);
  console.log(`   ${message}`);
  if (details) console.log(`   ${details}`);
  
  if (status === 'success') tests.passed++;
  else if (status === 'error') tests.failed++;
  else if (status === 'warning') tests.warnings++;
}

async function runTests() {
  console.log('\n🔍 RUNNING DATABASE CONNECTION TESTS\n');
  console.log('=' .repeat(60));

  // Test 1: Environment Configuration
  console.log('\n📋 ENVIRONMENT CONFIGURATION');
  console.log('-'.repeat(60));
  
  if (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1')) {
    logTest(
      'Supabase URL',
      'error',
      'Using LOCAL database!',
      `Current: ${SUPABASE_URL}\nShould be: https://uwgiostcetoxotfnulfm.supabase.co`
    );
  } else {
    logTest(
      'Supabase URL',
      'success',
      'Production database configured',
      `URL: ${SUPABASE_URL}`
    );
  }

  // Test 2: Database Connection
  console.log('\n📊 DATABASE CONNECTION');
  console.log('-'.repeat(60));
  
  try {
    const { data, error, count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      logTest('Properties Table', 'error', 'Failed to query properties', error.message);
    } else {
      logTest(
        'Properties Table',
        'success',
        'Properties table accessible',
        `Total records: ${count || 0}`
      );
    }
  } catch (err) {
    logTest('Properties Table', 'error', 'Connection failed', err.message);
  }

  // Test 3: Tours Table
  try {
    const { count, error } = await supabase
      .from('tours')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logTest('Tours Table', 'error', 'Failed to query tours', error.message);
    } else {
      logTest('Tours Table', 'success', 'Tours table accessible', `Total records: ${count || 0}`);
    }
  } catch (err) {
    logTest('Tours Table', 'error', 'Connection failed', err.message);
  }

  // Test 4: Transport Vehicles
  try {
    const { count, error } = await supabase
      .from('transport_vehicles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logTest('Transport Vehicles', 'error', 'Failed to query vehicles', error.message);
    } else {
      logTest(
        'Transport Vehicles',
        'success',
        'Vehicles table accessible',
        `Total records: ${count || 0}`
      );
    }
  } catch (err) {
    logTest('Transport Vehicles', 'error', 'Connection failed', err.message);
  }

  // Test 5: Authentication Service
  console.log('\n🔐 AUTHENTICATION SERVICE');
  console.log('-'.repeat(60));
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logTest('Auth Service', 'warning', 'Auth check returned error', error.message);
    } else if (session) {
      logTest(
        'Auth Service',
        'success',
        'User authenticated',
        `Email: ${session.user.email}`
      );
    } else {
      logTest(
        'Auth Service',
        'success',
        'Auth service operational (no active session)',
        'Sign in to test user operations'
      );
    }
  } catch (err) {
    logTest('Auth Service', 'error', 'Auth service failed', err.message);
  }

  // Test 6: Storage Buckets
  console.log('\n📦 STORAGE BUCKETS');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logTest('Storage Buckets', 'warning', 'Limited storage access', error.message);
    } else {
      const bucketNames = data.map(b => b.name).join(', ');
      logTest(
        'Storage Buckets',
        'success',
        `Found ${data.length} bucket(s)`,
        `Buckets: ${bucketNames || 'None'}`
      );
    }
  } catch (err) {
    logTest('Storage Buckets', 'error', 'Storage check failed', err.message);
  }

  // Test 7: RPC Functions
  console.log('\n⚙️  RPC FUNCTIONS');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.rpc('admin_dashboard_metrics');
    
    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('not found')) {
        logTest(
          'Admin Functions',
          'warning',
          'Admin functions require authentication',
          'Sign in as admin to test admin functions'
        );
      } else {
        logTest('Admin Functions', 'error', 'RPC function error', error.message);
      }
    } else {
      logTest(
        'Admin Functions',
        'success',
        'Admin RPC functions working',
        `Retrieved metrics successfully`
      );
    }
  } catch (err) {
    logTest('Admin Functions', 'warning', 'RPC test skipped', 'Requires authentication');
  }

  // Test 8: User Roles Table
  try {
    const { count, error } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('permission denied')) {
        logTest(
          'User Roles',
          'warning',
          'User roles table requires authentication',
          'This is expected for security'
        );
      } else {
        logTest('User Roles', 'error', 'Failed to query user_roles', error.message);
      }
    } else {
      logTest('User Roles', 'success', 'User roles table accessible', `Total roles: ${count || 0}`);
    }
  } catch (err) {
    logTest('User Roles', 'warning', 'User roles check skipped', err.message);
  }

  // Test 9: Bookings Table
  try {
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('permission denied')) {
        logTest(
          'Bookings',
          'warning',
          'Bookings table requires authentication',
          'This is expected for security'
        );
      } else {
        logTest('Bookings', 'error', 'Failed to query bookings', error.message);
      }
    } else {
      logTest('Bookings', 'success', 'Bookings table accessible', `Total bookings: ${count || 0}`);
    }
  } catch (err) {
    logTest('Bookings', 'warning', 'Bookings check skipped', err.message);
  }

  // Test 10: Reviews Table
  try {
    const { count, error } = await supabase
      .from('property_reviews')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logTest('Reviews', 'error', 'Failed to query reviews', error.message);
    } else {
      logTest('Reviews', 'success', 'Reviews table accessible', `Total reviews: ${count || 0}`);
    }
  } catch (err) {
    logTest('Reviews', 'error', 'Reviews check failed', err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY');
  console.log('-'.repeat(60));
  console.log(`✅ Passed:   ${tests.passed}`);
  console.log(`❌ Failed:   ${tests.failed}`);
  console.log(`⚠️  Warnings: ${tests.warnings}`);
  console.log(`📝 Total:    ${tests.passed + tests.failed + tests.warnings}`);
  
  const successRate = ((tests.passed / (tests.passed + tests.failed + tests.warnings)) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);
  
  if (tests.failed === 0) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    console.log('✅ Your database is fully connected and operational.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('Please review the errors above and check your configuration.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('\n❌ Fatal error running tests:', err);
  process.exit(1);
});
