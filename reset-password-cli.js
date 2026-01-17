#!/usr/bin/env node

/**
 * Password Reset Helper Script
 * 
 * Usage:
 *   node reset-password-cli.js <email>
 * 
 * This script sends a password reset email to the specified user.
 * Requires Supabase CLI to be configured.
 */

import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node reset-password-cli.js <email>');
  console.log('');
  console.log('Example:');
  console.log('  node reset-password-cli.js user@example.com');
  process.exit(1);
}

const email = args[0];

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`\n🔐 Sending password reset email to: ${email}\n`);

const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/reset-password`,
});

if (error) {
  console.error('❌ Error sending password reset email:');
  console.error(error.message);
  process.exit(1);
}

console.log('✅ Password reset email sent successfully!');
console.log('\nNext steps:');
console.log('1. Check the email inbox for the reset link');
console.log('2. Click the link to set a new password');
console.log('3. The link will expire in 1 hour\n');
