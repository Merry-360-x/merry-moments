#!/usr/bin/env node
/**
 * API Endpoints Testing Script
 * Tests all Vercel serverless functions
 */

import https from 'https';
import http from 'http';

const BASE_URL = process.env.TEST_URL || 'https://merry360x.com';
const results = { passed: 0, failed: 0, tests: [] };

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${message ? ` - ${message}` : ''}`);
  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = options.timeout || 10000;
    
    const req = protocol.get(url, { ...options, timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testEndpoint(name, path, expectedStatus = 200) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await makeRequest(url);
    
    const passed = response.status === expectedStatus;
    logTest(name, passed, `Status: ${response.status}`);
    return passed;
  } catch (error) {
    logTest(name, false, error.message);
    return false;
  }
}

async function testAPIEndpoint(name, path, method = 'GET', body = null) {
  try {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    };
    
    const response = await makeRequest(url, options);
    const passed = response.status >= 200 && response.status < 500;
    logTest(name, passed, `Status: ${response.status}`);
    return passed;
  } catch (error) {
    logTest(name, false, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔌 Testing API Endpoints...');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('━'.repeat(60));
  
  // Test main pages
  console.log('\n📄 Testing Main Pages...');
  await testEndpoint('Homepage', '/');
  await testEndpoint('Properties Page', '/properties');
  await testEndpoint('Tours Page', '/tours');
  await testEndpoint('Transport Page', '/transport');
  await testEndpoint('About Page', '/about');
  await testEndpoint('Contact Page', '/contact');
  
  // Test authentication pages
  console.log('\n🔐 Testing Auth Pages...');
  await testEndpoint('Auth Page', '/auth');
  await testEndpoint('Profile Page', '/profile');
  
  // Test booking pages
  console.log('\n📅 Testing Booking Pages...');
  await testEndpoint('Checkout Page', '/checkout');
  await testEndpoint('Booking Success Page', '/booking-success');
  
  // Test host pages
  console.log('\n👥 Testing Host Pages...');
  await testEndpoint('Become Host Page', '/become-host');
  await testEndpoint('Host Dashboard', '/host-dashboard');
  
  // Test admin pages
  console.log('\n🛡️  Testing Admin Pages...');
  await testEndpoint('Admin Dashboard', '/admin-dashboard');
  await testEndpoint('Staff Dashboard', '/staff-dashboard');
  
  // Test API endpoints
  console.log('\n🔌 Testing API Endpoints...');
  await testAPIEndpoint('AI Trip Advisor API', '/api/ai-trip-advisor');
  await testAPIEndpoint('Extract Tour Itinerary API', '/api/extract-tour-itinerary');
  await testAPIEndpoint('DPO Create Payment API', '/api/dpo-create-payment');
  await testAPIEndpoint('DPO Callback API', '/api/dpo-callback');
  
  // Note: SPAs with client-side routing return 200 for all routes
  // The React app handles 404s on the client side
  
  console.log('\n' + '━'.repeat(60));
  console.log('📊 API TEST SUMMARY');
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

runTests().catch(error => {
  console.error('💥 API test suite crashed:', error);
  process.exit(1);
});
