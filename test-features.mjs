#!/usr/bin/env node
/**
 * Comprehensive Feature Test Suite
 * Tests all core features and utilities
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(name, status, details = '') {
  const symbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${symbol} ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, status, details });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;
}

console.log('\n🧪 COMPREHENSIVE FEATURE TEST SUITE\n');
console.log('═'.repeat(60));

// Test 1: Environment Variables
console.log('\n📋 Testing Environment Configuration...\n');

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET'
];

let envVarsPresent = true;
for (const varName of requiredEnvVars) {
  if (process.env[varName]) {
    logTest(`Environment: ${varName}`, 'pass', 'Variable is set');
  } else {
    logTest(`Environment: ${varName}`, 'fail', 'Variable is missing');
    envVarsPresent = false;
  }
}

// Test 2: Cancellation Policies Module
console.log('\n📋 Testing Cancellation Policies System...\n');

try {
  const policyContent = readFileSync(
    join(__dirname, 'src/lib/cancellation-policies.ts'),
    'utf-8'
  );
  
  const requiredExports = [
    'getCancellationPolicyDetails',
    'calculateRefundAmount',
    'formatRefundSchedule',
    'CANCELLATION_POLICIES'
  ];
  
  for (const exportName of requiredExports) {
    if (policyContent.includes(`export function ${exportName}`) || 
        policyContent.includes(`export const ${exportName}`)) {
      logTest(`Cancellation: ${exportName}`, 'pass', 'Function exported');
    } else {
      logTest(`Cancellation: ${exportName}`, 'fail', 'Function not found');
    }
  }
  
  // Check for all 5 policy types
  const policyTypes = ['flexible', 'moderate', 'standard', 'strict', 'custom'];
  for (const type of policyTypes) {
    if (policyContent.includes(`'${type}'`)) {
      logTest(`Cancellation Policy: ${type}`, 'pass', 'Policy defined');
    } else {
      logTest(`Cancellation Policy: ${type}`, 'fail', 'Policy missing');
    }
  }
} catch (error) {
  logTest('Cancellation Policies Module', 'fail', error.message);
}

// Test 3: User Display Utilities
console.log('\n📋 Testing User Display System...\n');

try {
  const userDisplayContent = readFileSync(
    join(__dirname, 'src/lib/user-display.ts'),
    'utf-8'
  );
  
  const requiredFunctions = [
    'fetchUserInfo',
    'fetchUsersInfo',
    'getDisplayName',
    'getContactInfo',
    'formatUserDisplay'
  ];
  
  for (const funcName of requiredFunctions) {
    if (userDisplayContent.includes(`export async function ${funcName}`) ||
        userDisplayContent.includes(`export function ${funcName}`)) {
      logTest(`User Display: ${funcName}`, 'pass', 'Function exported');
    } else {
      logTest(`User Display: ${funcName}`, 'fail', 'Function not found');
    }
  }
} catch (error) {
  logTest('User Display Module', 'fail', error.message);
}

// Test 4: Form Validation System
console.log('\n📋 Testing Form Validation Framework...\n');

try {
  const validationContent = readFileSync(
    join(__dirname, 'src/lib/form-validation.ts'),
    'utf-8'
  );
  
  const requiredExports = [
    'validateField',
    'validateForm',
    'useFormValidation',
    'commonRules'
  ];
  
  for (const exportName of requiredExports) {
    if (validationContent.includes(exportName)) {
      logTest(`Form Validation: ${exportName}`, 'pass', 'Export found');
    } else {
      logTest(`Form Validation: ${exportName}`, 'fail', 'Export not found');
    }
  }
  
  // Check for common validation rules
  const rules = ['email', 'phone', 'url', 'positiveNumber', 'wholeNumber'];
  for (const rule of rules) {
    if (validationContent.includes(rule)) {
      logTest(`Validation Rule: ${rule}`, 'pass', 'Rule defined');
    } else {
      logTest(`Validation Rule: ${rule}`, 'fail', 'Rule missing');
    }
  }
} catch (error) {
  logTest('Form Validation Module', 'fail', error.message);
}

// Test 5: React Components
console.log('\n📋 Testing React Components...\n');

const components = [
  'UserDisplay.tsx',
  'ValidatedInput.tsx'
];

for (const component of components) {
  try {
    const content = readFileSync(
      join(__dirname, 'src/components', component),
      'utf-8'
    );
    
    if (content.includes('export')) {
      logTest(`Component: ${component}`, 'pass', 'Component exports found');
    } else {
      logTest(`Component: ${component}`, 'fail', 'No exports found');
    }
  } catch (error) {
    logTest(`Component: ${component}`, 'fail', 'File not found');
  }
}

// Test 6: Database Migrations
console.log('\n📋 Testing Database Migrations...\n');

try {
  const migrations = [
    '20260123000001_add_tours_cancellation_policies.sql',
    '20260123000002_add_profile_nickname.sql'
  ];
  
  for (const migration of migrations) {
    try {
      const content = readFileSync(
        join(__dirname, 'supabase/migrations', migration),
        'utf-8'
      );
      
      if (content.includes('ALTER TABLE') || content.includes('CREATE')) {
        logTest(`Migration: ${migration}`, 'pass', 'Valid SQL migration');
      } else {
        logTest(`Migration: ${migration}`, 'warn', 'Unexpected migration format');
      }
    } catch (error) {
      logTest(`Migration: ${migration}`, 'fail', 'File not found');
    }
  }
} catch (error) {
  logTest('Database Migrations', 'fail', error.message);
}

// Test 7: API Endpoints
console.log('\n📋 Testing API Endpoints (Vercel Functions)...\n');

const apiEndpoints = [
  'ai-trip-advisor.js',
  'dpo-callback.js',
  'dpo-create-payment.js',
  'extract-tour-itinerary.js'
];

for (const endpoint of apiEndpoints) {
  try {
    const content = readFileSync(
      join(__dirname, 'api', endpoint),
      'utf-8'
    );
    
    if (content.includes('export default') || content.includes('module.exports')) {
      logTest(`API: ${endpoint}`, 'pass', 'Handler function found');
    } else {
      logTest(`API: ${endpoint}`, 'warn', 'No default export found');
    }
  } catch (error) {
    logTest(`API: ${endpoint}`, 'fail', 'File not found');
  }
}

// Test 8: Cloudinary Integration
console.log('\n📋 Testing Cloudinary Configuration...\n');

if (process.env.VITE_CLOUDINARY_CLOUD_NAME && process.env.VITE_CLOUDINARY_UPLOAD_PRESET) {
  logTest('Cloudinary Integration', 'pass', 'Configuration present');
} else {
  logTest('Cloudinary Integration', 'fail', 'Missing configuration');
}

// Test 9: Supabase Connection (if env vars available)
console.log('\n📋 Testing Supabase Connection...\n');

if (envVarsPresent && process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      logTest('Supabase Connection', 'fail', error.message);
    } else {
      logTest('Supabase Connection', 'pass', 'Successfully connected');
      
      // Test tours table structure
      const { data: tours, error: toursError } = await supabase
        .from('tours')
        .select('id, cancellation_policy_type, custom_cancellation_policy, non_refundable_items')
        .limit(1);
      
      if (!toursError) {
        logTest('Tours Table Schema', 'pass', 'Cancellation policy columns exist');
      } else {
        logTest('Tours Table Schema', 'fail', toursError.message);
      }
      
      // Test profiles table for nickname
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname, full_name')
        .limit(1);
      
      if (!profilesError) {
        logTest('Profiles Table Schema', 'pass', 'Nickname column exists');
      } else {
        logTest('Profiles Table Schema', 'fail', profilesError.message);
      }
    }
  } catch (error) {
    logTest('Supabase Connection', 'fail', error.message);
  }
} else {
  logTest('Supabase Connection', 'warn', 'Skipped - missing env vars');
}

// Test 10: Build Artifacts
console.log('\n📋 Testing Build Configuration...\n');

try {
  const viteconfigContent = readFileSync(
    join(__dirname, 'vite.config.ts'),
    'utf-8'
  );
  
  if (viteconfigContent.includes('defineConfig')) {
    logTest('Vite Configuration', 'pass', 'Valid config file');
  } else {
    logTest('Vite Configuration', 'fail', 'Invalid config');
  }
  
  const tsconfigContent = readFileSync(
    join(__dirname, 'tsconfig.json'),
    'utf-8'
  );
  
  if (tsconfigContent.includes('"compilerOptions"')) {
    logTest('TypeScript Configuration', 'pass', 'Valid tsconfig');
  } else {
    logTest('TypeScript Configuration', 'fail', 'Invalid tsconfig');
  }
} catch (error) {
  logTest('Build Configuration', 'fail', error.message);
}

// Final Report
console.log('\n═'.repeat(60));
console.log('\n📊 TEST SUMMARY\n');
console.log(`Total Tests Run: ${results.tests.length}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
console.log(`\n📈 Success Rate: ${successRate}%`);

if (results.failed > 0) {
  console.log('\n❌ FAILED TESTS:\n');
  results.tests
    .filter(t => t.status === 'fail')
    .forEach(t => console.log(`   • ${t.name}: ${t.details}`));
}

console.log('\n═'.repeat(60));

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
