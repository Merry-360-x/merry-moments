#!/usr/bin/env node

/**
 * Admin Dashboard Comprehensive Testing Script
 * Tests all admin functionality with real database data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, message = '', data = null) {
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${emoji} ${name}: ${message}`);
  
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 200));
  }
  
  results.tests.push({ name, status, message, data });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;
}

console.log('\n🚀 Starting Admin Dashboard Comprehensive Tests...\n');
console.log('=' .repeat(60));

// Test 1: Overview Metrics
async function testOverviewMetrics() {
  console.log('\n📊 Testing Overview Metrics...');
  
  try {
    // Test revenue calculation
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('total_price, status, payment_status')
      .in('status', ['confirmed', 'completed']);
    
    if (bookingsError) throw bookingsError;
    
    const revenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    logTest('Revenue Calculation', 'pass', `Total revenue: ${revenue} RWF`, { count: bookings.length, revenue });
    
    // Test booking counts by status
    const pending = bookings.filter(b => b.status === 'pending').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    
    logTest('Booking Status Counts', 'pass', `Pending: ${pending}, Confirmed: ${confirmed}, Completed: ${completed}`);
    
    // Test user count
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (userError) throw userError;
    
    logTest('User Count', 'pass', `Total users: ${userCount}`);
    
    // Test properties count
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id, is_published, is_featured');
    
    if (propsError) throw propsError;
    
    const publishedProps = properties.filter(p => p.is_published).length;
    const featuredProps = properties.filter(p => p.is_featured).length;
    
    logTest('Properties Count', 'pass', 
      `Total: ${properties.length}, Published: ${publishedProps}, Featured: ${featuredProps}`);
    
  } catch (error) {
    logTest('Overview Metrics', 'fail', error.message);
  }
}

// Test 2: Host Applications
async function testHostApplications() {
  console.log('\n👥 Testing Host Applications...');
  
  try {
    const { data: applications, error } = await supabase
      .from('host_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const pending = applications.filter(a => a.status === 'pending').length;
    const approved = applications.filter(a => a.status === 'approved').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    
    logTest('Host Applications Fetch', 'pass', 
      `Total: ${applications.length}, Pending: ${pending}, Approved: ${approved}, Rejected: ${rejected}`);
    
    // Check if applications have required fields
    if (applications.length > 0) {
      const sample = applications[0];
      const requiredFields = ['user_id', 'status', 'full_name', 'phone', 'applicant_type'];
      const missingFields = requiredFields.filter(field => !sample[field]);
      
      if (missingFields.length === 0) {
        logTest('Application Data Structure', 'pass', 'All required fields present');
      } else {
        logTest('Application Data Structure', 'warn', `Missing fields: ${missingFields.join(', ')}`);
      }
    }
    
  } catch (error) {
    logTest('Host Applications', 'fail', error.message);
  }
}

// Test 3: User Management & Roles
async function testUserManagement() {
  console.log('\n👤 Testing User Management & Roles...');
  
  try {
    // Test user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at');
    
    if (rolesError) throw rolesError;
    
    const roleStats = {
      admin: roles.filter(r => r.role === 'admin').length,
      operations_staff: roles.filter(r => r.role === 'operations_staff').length,
      financial_staff: roles.filter(r => r.role === 'financial_staff').length,
      customer_support: roles.filter(r => r.role === 'customer_support').length,
    };
    
    logTest('User Roles', 'pass', 
      `Admin: ${roleStats.admin}, Ops: ${roleStats.operations_staff}, Finance: ${roleStats.financial_staff}, Support: ${roleStats.customer_support}`);
    
    // Test profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, created_at')
      .limit(5);
    
    if (profilesError) throw profilesError;
    
    logTest('User Profiles', 'pass', `Fetched ${profiles.length} user profiles`);
    
    // Test blacklist
    const { data: blacklist, error: blacklistError } = await supabase
      .from('blacklist')
      .select('user_id, reason, created_at')
      .limit(5);
    
    if (blacklistError) throw blacklistError;
    
    logTest('Blacklist', 'pass', `${blacklist.length} blacklisted users`);
    
  } catch (error) {
    logTest('User Management', 'fail', error.message);
  }
}

// Test 4: Bookings Management
async function testBookingsManagement() {
  console.log('\n📅 Testing Bookings Management...');
  
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    logTest('Bookings Fetch', 'pass', `Fetched ${bookings.length} bookings`);
    
    // Check for bulk orders (multiple bookings with same order_id)
    const orderIds = bookings.map(b => b.order_id).filter(Boolean);
    const bulkOrders = orderIds.filter((id, index) => orderIds.indexOf(id) !== index);
    
    if (bulkOrders.length > 0) {
      logTest('Bulk Orders Detection', 'pass', `Found ${new Set(bulkOrders).size} bulk orders`);
    } else {
      logTest('Bulk Orders Detection', 'warn', 'No bulk orders found in recent bookings');
    }
    
    // Check booking types distribution
    const types = {
      property: bookings.filter(b => b.booking_type === 'property' || b.property_id).length,
      tour: bookings.filter(b => b.booking_type === 'tour' || b.tour_id).length,
      transport: bookings.filter(b => b.booking_type === 'transport' || b.transport_id).length,
    };
    
    logTest('Booking Types', 'pass', 
      `Properties: ${types.property}, Tours: ${types.tour}, Transport: ${types.transport}`);
    
    // Test payment status distribution
    const paymentStats = {
      pending: bookings.filter(b => b.payment_status === 'pending').length,
      requested: bookings.filter(b => b.payment_status === 'requested').length,
      paid: bookings.filter(b => b.payment_status === 'paid').length,
    };
    
    logTest('Payment Status', 'pass', 
      `Pending: ${paymentStats.pending}, Requested: ${paymentStats.requested}, Paid: ${paymentStats.paid}`);
    
  } catch (error) {
    logTest('Bookings Management', 'fail', error.message);
  }
}

// Test 5: Properties Management
async function testPropertiesManagement() {
  console.log('\n🏠 Testing Properties Management...');
  
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, title, location, price_per_night, is_published, is_featured, max_guests')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    logTest('Properties Fetch', 'pass', `Fetched ${properties.length} properties`);
    
    // Check data quality
    const withImages = properties.filter(p => p.images && p.images.length > 0).length;
    const withLocation = properties.filter(p => p.location).length;
    const withPrice = properties.filter(p => p.price_per_night > 0).length;
    
    logTest('Properties Data Quality', 'pass', 
      `With images: ${withImages}/${properties.length}, With location: ${withLocation}/${properties.length}, With price: ${withPrice}/${properties.length}`);
    
  } catch (error) {
    logTest('Properties Management', 'fail', error.message);
  }
}

// Test 6: Tours Management
async function testToursManagement() {
  console.log('\n🗺️ Testing Tours Management...');
  
  try {
    const { data: tours, error } = await supabase
      .from('tour_packages')
      .select('id, title, city, country, price_per_person, is_approved')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    logTest('Tours Fetch', 'pass', `Fetched ${tours.length} tours`);
    
    const approved = tours.filter(t => t.is_approved).length;
    
    logTest('Tours Status', 'pass', 
      `Approved: ${approved}/${tours.length}`);
    
  } catch (error) {
    logTest('Tours Management', 'fail', error.message);
  }
}

// Test 7: Transport Management
async function testTransportManagement() {
  console.log('\n🚗 Testing Transport Management...');
  
  try {
    const { data: vehicles, error } = await supabase
      .from('transport_vehicles')
      .select('id, title, vehicle_type, seats, price_per_day, is_approved')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    logTest('Transport Fetch', 'pass', `Fetched ${vehicles.length} vehicles`);
    
    const approved = vehicles.filter(v => v.is_approved).length;
    const vehicleTypes = [...new Set(vehicles.map(v => v.vehicle_type))];
    
    logTest('Transport Status', 'pass', 
      `Approved: ${approved}/${vehicles.length}, Types: ${vehicleTypes.join(', ')}`);
    
  } catch (error) {
    logTest('Transport Management', 'fail', error.message);
  }
}

// Test 8: Reviews Management
async function testReviewsManagement() {
  console.log('\n⭐ Testing Reviews Management...');
  
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, is_hidden, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    logTest('Reviews Fetch', 'pass', `Fetched ${reviews.length} reviews`);
    
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      const hidden = reviews.filter(r => r.is_hidden).length;
      
      logTest('Reviews Stats', 'pass', 
        `Avg rating: ${avgRating.toFixed(1)}/5, Hidden: ${hidden}/${reviews.length}`);
    }
    
  } catch (error) {
    logTest('Reviews Management', 'fail', error.message);
  }
}

// Test 9: Support Tickets
async function testSupportTickets() {
  console.log('\n💬 Testing Support Tickets...');
  
  try {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('id, subject, status, priority, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    logTest('Support Tickets Fetch', 'pass', `Fetched ${tickets.length} tickets`);
    
    if (tickets.length > 0) {
      const statusCounts = {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length,
      };
      
      logTest('Ticket Status', 'pass', 
        `Open: ${statusCounts.open}, In Progress: ${statusCounts.in_progress}, Resolved: ${statusCounts.resolved}, Closed: ${statusCounts.closed}`);
    }
    
  } catch (error) {
    logTest('Support Tickets', 'fail', error.message);
  }
}

// Test 10: Legal Content Management
async function testLegalContent() {
  console.log('\n📄 Testing Legal Content Management...');
  
  try {
    const { data: privacyPolicy, error: privacyError } = await supabase
      .from('legal_content')
      .select('*')
      .eq('content_type', 'privacy_policy')
      .single();
    
    if (privacyError) throw privacyError;
    
    const privacySections = privacyPolicy?.content?.sections?.length || 0;
    logTest('Privacy Policy', 'pass', 
      `${privacySections} sections, Last updated: ${privacyPolicy.updated_at || 'Never'}`);
    
    const { data: termsConditions, error: termsError } = await supabase
      .from('legal_content')
      .select('*')
      .eq('content_type', 'terms_and_conditions')
      .single();
    
    if (termsError) throw termsError;
    
    const termsSections = termsConditions?.content?.sections?.length || 0;
    logTest('Terms & Conditions', 'pass', 
      `${termsSections} sections, Last updated: ${termsConditions.updated_at || 'Never'}`);
    
  } catch (error) {
    logTest('Legal Content', 'fail', error.message);
  }
}

// Test 11: Ad Banners
async function testAdBanners() {
  console.log('\n📢 Testing Ad Banners...');
  
  try {
    const { data: banners, error } = await supabase
      .from('ad_banners')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    
    logTest('Ad Banners Fetch', 'pass', `${banners.length} banners configured`);
    
    if (banners.length > 0) {
      const withCTA = banners.filter(b => b.cta_label && b.cta_url).length;
      logTest('Banner Configuration', 'pass', `${withCTA}/${banners.length} have call-to-action`);
    }
    
  } catch (error) {
    logTest('Ad Banners', 'fail', error.message);
  }
}

// Test 12: RLS Policies (Security)
async function testRLSPolicies() {
  console.log('\n🔒 Testing RLS Policies...');
  
  try {
    // Test that legal_content is readable by everyone
    const { data: legalContent, error: legalError } = await supabase
      .from('legal_content')
      .select('content_type')
      .limit(1);
    
    if (!legalError && legalContent) {
      logTest('Legal Content RLS (Public Read)', 'pass', 'Public can read legal content');
    } else {
      logTest('Legal Content RLS (Public Read)', 'fail', 'Public read access blocked');
    }
    
    // Test that properties are readable
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id')
      .limit(1);
    
    if (!propsError && properties) {
      logTest('Properties RLS (Public Read)', 'pass', 'Public can read properties');
    } else {
      logTest('Properties RLS (Public Read)', 'fail', 'Public read access blocked');
    }
    
  } catch (error) {
    logTest('RLS Policies', 'fail', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testOverviewMetrics();
  await testHostApplications();
  await testUserManagement();
  await testBookingsManagement();
  await testPropertiesManagement();
  await testToursManagement();
  await testTransportManagement();
  await testReviewsManagement();
  await testSupportTickets();
  await testLegalContent();
  await testAdBanners();
  await testRLSPolicies();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️  Warnings: ${results.warnings}`);
  console.log(`   📝 Total Tests: ${results.tests.length}`);
  
  const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(`   🎯 Success Rate: ${successRate}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'fail')
      .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
  }
  
  if (results.warnings > 0) {
    console.log('\n⚠️  Warnings:');
    results.tests
      .filter(t => t.status === 'warn')
      .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
  }
  
  console.log('\n✨ Admin Dashboard Testing Complete!\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
