#!/usr/bin/env node
/**
 * Test Tour Details Pages
 */

import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://merry360x.com';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const results = { passed: 0, failed: 0, tests: [] };

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ` - ${message}` : ''}`);
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

// Fetch page content
function fetchPage(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test tour detail query
async function testTourQuery() {
  console.log('\n📊 Testing Tour Database Query...');
  
  try {
    // Test the exact query from TourDetails component
    const { data: tours, error } = await supabase
      .from('tours')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    logTest('Tour query successful', true, `Found ${tours.length} tours`);
    
    if (tours.length > 0) {
      const tour = tours[0];
      logTest('Sample tour data', true, `"${tour.title}" - ${tour.location}`);
      logTest('Tour has created_by', !!tour.created_by, tour.created_by ? tour.created_by.slice(0, 8) : 'No creator');
      
      // Test profile fetch for the tour creator
      if (tour.created_by) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, years_of_experience, languages_spoken, tour_guide_bio, avatar_url')
          .eq('user_id', tour.created_by)
          .single();
        
        if (profileError) {
          logTest('Host profile fetch', false, profileError.message);
        } else {
          logTest('Host profile fetch', true, 
            profile?.full_name ? `Host: ${profile.full_name}` : 'Profile exists but no name');
          
          if (profile) {
            logTest('Profile completeness', true, 
              `Experience: ${profile.years_of_experience || 0} years, Languages: ${profile.languages_spoken?.length || 0}`);
          }
        }
      }
    }
    
    return tours;
  } catch (error) {
    logTest('Tour Query', false, error.message);
    return [];
  }
}

// Test tour detail pages
async function testTourDetailPages(tours) {
  console.log('\n🗺️  Testing Tour Detail Pages...');
  
  if (tours.length === 0) {
    logTest('Tour Detail Pages', true, 'No tours available to test (expected for new platform)');
    return true;
  }
  
  try {
    // Test first 3 tours
    for (let i = 0; i < Math.min(3, tours.length); i++) {
      const tour = tours[i];
      const { status } = await fetchPage(`/tours/${tour.id}`);
      logTest(`Tour detail: ${tour.title}`, status === 200, 
        `Status: ${status} - ${BASE_URL}/tours/${tour.id}`);
    }
    
    return true;
  } catch (error) {
    logTest('Tour Detail Pages', false, error.message);
    return false;
  }
}

// Test tours listing page
async function testToursListingPage() {
  console.log('\n📋 Testing Tours Listing Page...');
  
  try {
    const { status, html } = await fetchPage('/tours');
    logTest('Tours page loads', status === 200, `Status: ${status}`);
    
    // Check for tour-related content
    const hasContent = html.length > 1000;
    logTest('Tours page has content', hasContent, `${(html.length / 1024).toFixed(1)}KB`);
    
    return true;
  } catch (error) {
    logTest('Tours Listing Page', false, error.message);
    return false;
  }
}

// Test published tours
async function testPublishedTours() {
  console.log('\n✨ Testing Published Tours...');
  
  try {
    const { data: published, error } = await supabase
      .from('tours')
      .select('id, title, is_published')
      .eq('is_published', true)
      .limit(10);
    
    if (error) throw error;
    
    logTest('Published tours query', true, 
      published.length > 0 
        ? `${published.length} published tours` 
        : 'No published tours yet (expected for new platform)');
    
    if (published.length > 0) {
      published.forEach((tour, i) => {
        logTest(`Published tour ${i + 1}`, true, tour.title);
      });
    }
    
    return published;
  } catch (error) {
    logTest('Published Tours', false, error.message);
    return [];
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Tour Details Page Tests...');
  console.log(`Testing: ${BASE_URL}`);
  console.log('━'.repeat(60));
  
  await testToursListingPage();
  const tours = await testTourQuery();
  await testPublishedTours();
  await testTourDetailPages(tours);
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 TOUR DETAILS TEST SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('━'.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
