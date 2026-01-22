#!/usr/bin/env node

/**
 * Comprehensive Dashboard Test Suite
 * Tests all user roles: Admin, Host, Guest, Financial Staff, Operations Staff, Customer Support
 * Uses real data and actual database queries
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwgiostcetoxotfnulfm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY not set');
  console.log('\nUsage: SUPABASE_ANON_KEY=your_key node test-all-dashboards.mjs\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
const results = {
  admin: { passed: 0, failed: 0, errors: [] },
  host: { passed: 0, failed: 0, errors: [] },
  guest: { passed: 0, failed: 0, errors: [] },
  financial: { passed: 0, failed: 0, errors: [] },
  operations: { passed: 0, failed: 0, errors: [] },
  support: { passed: 0, failed: 0, errors: [] },
};

let testUsers = {
  admin: null,
  host: null,
  guest: null,
};

// Helper function to run tests
async function runTest(category, name, fn) {
  try {
    process.stdout.write(`  ${name}... `);
    const result = await fn();
    console.log('✅ PASS');
    results[category].passed++;
    return result;
  } catch (error) {
    console.log('❌ FAIL');
    console.error(`     ${error.message}`);
    results[category].failed++;
    results[category].errors.push({ test: name, error: error.message });
    return null;
  }
}

// ============================================================================
// ADMIN DASHBOARD TESTS
// ============================================================================

async function testAdminDashboard() {
  console.log('\n📊 ADMIN DASHBOARD TESTS');
  console.log('='.repeat(60));

  await runTest('admin', 'Fetch all properties count', async () => {
    const { count, error } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Total Properties: ${count}`);
    return count;
  });

  await runTest('admin', 'Fetch all bookings with metrics', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, total_price, status, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Recent Bookings: ${data.length}`);
    
    const totalRevenue = data.reduce((sum, b) => sum + (b.total_price || 0), 0);
    console.log(`     Total Revenue (10): ${totalRevenue}`);
    return data;
  });

  await runTest('admin', 'Fetch all users (profiles)', async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Total Users: ${count}`);
    return count;
  });

  await runTest('admin', 'Fetch system statistics', async () => {
    const [properties, tours, tourPackages, bookings] = await Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('tours').select('id', { count: 'exact', head: true }),
      supabase.from('tour_packages').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
    ]);

    console.log(`\n     Properties: ${properties.count}`);
    console.log(`     Tours: ${tours.count}`);
    console.log(`     Tour Packages: ${tourPackages.count}`);
    console.log(`     Bookings: ${bookings.count}`);
    
    return {
      properties: properties.count,
      tours: tours.count,
      tourPackages: tourPackages.count,
      bookings: bookings.count,
    };
  });

  await runTest('admin', 'Fetch pending approvals', async () => {
    const [properties, tours] = await Promise.all([
      supabase.from('properties').select('id').eq('status', 'pending'),
      supabase.from('tour_packages').select('id').eq('status', 'pending_approval'),
    ]);

    console.log(`\n     Pending Properties: ${properties.data?.length || 0}`);
    console.log(`     Pending Tour Packages: ${tours.data?.length || 0}`);
    
    return {
      properties: properties.data?.length || 0,
      tours: tours.data?.length || 0,
    };
  });

  await runTest('admin', 'Fetch recent user activity', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Recent Users: ${data.length}`);
    return data;
  });
}

// ============================================================================
// HOST DASHBOARD TESTS
// ============================================================================

async function testHostDashboard() {
  console.log('\n🏠 HOST DASHBOARD TESTS');
  console.log('='.repeat(60));

  // Find a host user
  const { data: hosts } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .eq('is_host', true)
    .limit(1);

  const testHostId = hosts?.[0]?.user_id;
  
  if (!testHostId) {
    console.log('  ⚠️  No host users found in database');
    return;
  }

  console.log(`  Using host: ${hosts[0].full_name || testHostId}`);

  await runTest('host', 'Fetch host properties', async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, status, created_at')
      .eq('host_id', testHostId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Host Properties: ${data.length}`);
    return data;
  });

  await runTest('host', 'Fetch host tours', async () => {
    const { data, error } = await supabase
      .from('tours')
      .select('id, title, is_published, created_at')
      .eq('created_by', testHostId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Host Tours: ${data.length}`);
    return data;
  });

  await runTest('host', 'Fetch host tour packages', async () => {
    const { data, error } = await supabase
      .from('tour_packages')
      .select('id, title, status, created_at')
      .eq('host_id', testHostId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Host Tour Packages: ${data.length}`);
    return data;
  });

  await runTest('host', 'Fetch host bookings', async () => {
    // Get host's properties first
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', testHostId);
    
    if (!properties || properties.length === 0) {
      console.log(`\n     No properties, no bookings`);
      return [];
    }

    const propertyIds = properties.map(p => p.id);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_name, total_price, status, created_at')
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Host Bookings: ${data.length}`);
    return data;
  });

  await runTest('host', 'Calculate host revenue', async () => {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('host_id', testHostId);
    
    if (!properties || properties.length === 0) {
      console.log(`\n     No revenue data`);
      return 0;
    }

    const propertyIds = properties.map(p => p.id);
    
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_price, payment_status')
      .in('property_id', propertyIds)
      .eq('payment_status', 'paid');
    
    const revenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
    console.log(`\n     Total Revenue: ${revenue}`);
    return revenue;
  });
}

// ============================================================================
// GUEST/USER DASHBOARD TESTS
// ============================================================================

async function testGuestDashboard() {
  console.log('\n👤 GUEST/USER DASHBOARD TESTS');
  console.log('='.repeat(60));

  // Find a guest user (someone with bookings)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('guest_id, guest_name')
    .not('guest_id', 'is', null)
    .limit(1);

  const testGuestId = bookings?.[0]?.guest_id;
  
  if (!testGuestId) {
    console.log('  ⚠️  No guest bookings found in database');
    return;
  }

  console.log(`  Using guest: ${bookings[0].guest_name || testGuestId}`);

  await runTest('guest', 'Fetch user bookings', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_id, total_price, status, check_in, check_out')
      .eq('guest_id', testGuestId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    console.log(`\n     User Bookings: ${data.length}`);
    return data;
  });

  await runTest('guest', 'Fetch upcoming bookings', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_id, check_in, status')
      .eq('guest_id', testGuestId)
      .gte('check_in', today)
      .order('check_in', { ascending: true});
    
    if (error) throw new Error(error.message);
    console.log(`\n     Upcoming Bookings: ${data.length}`);
    return data;
  });

  await runTest('guest', 'Browse available properties', async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price_per_night, location')
      .eq('is_published', true)
      .limit(10);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Available Properties: ${data.length}`);
    return data;
  });

  await runTest('guest', 'Browse available tours', async () => {
    const [tours, tourPackages] = await Promise.all([
      supabase.from('tours').select('id, title, price_per_person').eq('is_published', true).limit(5),
      supabase.from('tour_packages').select('id, title, price_per_adult').eq('status', 'approved').limit(5),
    ]);

    const totalTours = (tours.data?.length || 0) + (tourPackages.data?.length || 0);
    console.log(`\n     Available Tours: ${totalTours}`);
    return totalTours;
  });
}

// ============================================================================
// FINANCIAL STAFF TESTS
// ============================================================================

async function testFinancialDashboard() {
  console.log('\n💰 FINANCIAL STAFF DASHBOARD TESTS');
  console.log('='.repeat(60));

  await runTest('financial', 'Calculate total revenue', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('total_price, payment_status')
      .eq('payment_status', 'paid');
    
    if (error) throw new Error(error.message);
    
    const totalRevenue = data.reduce((sum, b) => sum + (b.total_price || 0), 0);
    console.log(`\n     Total Revenue: ${totalRevenue}`);
    console.log(`     Paid Bookings: ${data.length}`);
    return totalRevenue;
  });

  await runTest('financial', 'Calculate pending payments', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('total_price, payment_status')
      .eq('payment_status', 'pending');
    
    if (error) throw new Error(error.message);
    
    const pendingAmount = data.reduce((sum, b) => sum + (b.total_price || 0), 0);
    console.log(`\n     Pending Payments: ${pendingAmount}`);
    console.log(`     Pending Count: ${data.length}`);
    return pendingAmount;
  });

  await runTest('financial', 'Fetch payment status breakdown', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('payment_status, total_price');
    
    if (error) throw new Error(error.message);
    
    const breakdown = data.reduce((acc, b) => {
      const status = b.payment_status || 'unknown';
      if (!acc[status]) acc[status] = { count: 0, amount: 0 };
      acc[status].count++;
      acc[status].amount += b.total_price || 0;
      return acc;
    }, {});

    console.log(`\n     Payment Status Breakdown:`);
    Object.entries(breakdown).forEach(([status, { count, amount }]) => {
      console.log(`       ${status}: ${count} bookings, ${amount} total`);
    });
    
    return breakdown;
  });

  await runTest('financial', 'Fetch failed payments', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_name, total_price, created_at')
      .eq('payment_status', 'failed')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Failed Payments: ${data.length}`);
    return data;
  });

  await runTest('financial', 'Calculate refunded amount', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('total_price')
      .eq('payment_status', 'refunded');
    
    if (error) throw new Error(error.message);
    
    const refundedAmount = data.reduce((sum, b) => sum + (b.total_price || 0), 0);
    console.log(`\n     Refunded Amount: ${refundedAmount}`);
    console.log(`     Refunded Count: ${data.length}`);
    return refundedAmount;
  });
}

// ============================================================================
// OPERATIONS STAFF TESTS
// ============================================================================

async function testOperationsDashboard() {
  console.log('\n⚙️  OPERATIONS STAFF DASHBOARD TESTS');
  console.log('='.repeat(60));

  await runTest('operations', 'Fetch pending property approvals', async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, host_id, created_at')
      .eq('is_published', false)
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Pending Properties: ${data.length}`);
    return data;
  });

  await runTest('operations', 'Fetch pending tour package approvals', async () => {
    const { data, error } = await supabase
      .from('tour_packages')
      .select('id, title, host_id, created_at')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Pending Tour Packages: ${data.length}`);
    return data;
  });

  await runTest('operations', 'Fetch active bookings', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_id, status, check_in, check_out')
      .in('status', ['confirmed', 'checked-in'])
      .order('check_in', { ascending: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Active Bookings: ${data.length}`);
    return data;
  });

  await runTest('operations', 'Fetch today\'s check-ins', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_id, property_id')
      .eq('check_in', today)
      .eq('status', 'confirmed');
    
    if (error) throw new Error(error.message);
    console.log(`\n     Today's Check-ins: ${data.length}`);
    return data;
  });

  await runTest('operations', 'Fetch today\'s check-outs', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_name, property_id')
      .eq('check_out_date', today)
      .in('status', ['confirmed', 'checked-in']);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Today's Check-outs: ${data.length}`);
    return data;
  });

  await runTest('operations', 'Fetch transport vehicles status', async () => {
    const { data, error } = await supabase
      .from('transport_vehicles')
      .select('id, vehicle_type, is_available, created_by');
    
    if (error) throw new Error(error.message);
    
    const available = data.filter(v => v.is_available).length;
    console.log(`\n     Total Vehicles: ${data.length}`);
    console.log(`     Available: ${available}`);
    return data;
  });
}

// ============================================================================
// CUSTOMER SUPPORT TESTS
// ============================================================================

async function testCustomerSupportDashboard() {
  console.log('\n🎧 CUSTOMER SUPPORT DASHBOARD TESTS');
  console.log('='.repeat(60));

  await runTest('support', 'Fetch recent bookings for support', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_name, guest_email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Recent Bookings: ${data.length}`);
    return data;
  });

  await runTest('support', 'Fetch cancelled bookings', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_name, guest_email, total_price, created_at')
      .eq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Cancelled Bookings: ${data.length}`);
    return data;
  });

  await runTest('support', 'Search bookings by guest email', async () => {
    const { data: sampleBooking } = await supabase
      .from('bookings')
      .select('guest_email')
      .not('guest_email', 'is', null)
      .limit(1)
      .single();
    
    if (!sampleBooking?.guest_email) {
      console.log(`\n     No email data to test`);
      return [];
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('id, guest_name, status, total_price')
      .eq('guest_email', sampleBooking.guest_email);
    
    if (error) throw new Error(error.message);
    console.log(`\n     Bookings for ${sampleBooking.guest_email}: ${data.length}`);
    return data;
  });

  await runTest('support', 'Fetch all properties for reference', async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, city, status')
      .order('title', { ascending: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     Properties in System: ${data.length}`);
    return data;
  });

  await runTest('support', 'Fetch user profiles for lookup', async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw new Error(error.message);
    console.log(`\n     User Profiles: ${count}`);
    return count;
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🧪 COMPREHENSIVE DASHBOARD TEST SUITE');
  console.log('Testing all roles with real data from production database\n');

  await testAdminDashboard();
  await testHostDashboard();
  await testGuestDashboard();
  await testFinancialDashboard();
  await testOperationsDashboard();
  await testCustomerSupportDashboard();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 FINAL TEST RESULTS\n');
  
  const categories = ['admin', 'host', 'guest', 'financial', 'operations', 'support'];
  let totalPassed = 0;
  let totalFailed = 0;
  
  categories.forEach(cat => {
    const { passed, failed } = results[cat];
    totalPassed += passed;
    totalFailed += failed;
    
    const label = cat.toUpperCase().padEnd(15);
    const status = failed === 0 ? '✅' : '❌';
    console.log(`${status} ${label} ${passed} passed, ${failed} failed`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎯 OVERALL: ${totalPassed} passed, ${totalFailed} failed\n`);
  
  // Print errors
  if (totalFailed > 0) {
    console.log('❌ FAILED TESTS:\n');
    categories.forEach(cat => {
      if (results[cat].errors.length > 0) {
        console.log(`${cat.toUpperCase()}:`);
        results[cat].errors.forEach(({ test, error }) => {
          console.log(`  • ${test}`);
          console.log(`    ${error}`);
        });
        console.log('');
      }
    });
  }
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
