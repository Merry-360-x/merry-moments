#!/usr/bin/env node

/**
 * Simple test script to verify admin dashboard loads
 */

import { exec } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 Simple Admin Dashboard Test\n');

console.log('Step 1: Opening login page...');
const LOGIN_URL = 'https://merry360x.com/login';

const openUrl = (url) => {
  const command = process.platform === 'darwin' 
    ? `open "${url}"`
    : process.platform === 'win32'
    ? `start "${url}"`
    : `xdg-open "${url}"`;
  
  exec(command);
};

openUrl(LOGIN_URL);

setTimeout(() => {
  console.log('\n📋 Instructions:');
  console.log('  1. Login with admin credentials in the browser');
  console.log('  2. After login, you should be redirected or navigate to /admin');
  console.log('  3. Check the browser console (F12 or Cmd+Option+I)');
  console.log('\n✅ Verification Checklist:');
  console.log('  □ Page loads without blank screen');
  console.log('  □ No "Cannot access \'ze\' before initialization" error');
  console.log('  □ Admin Dashboard heading is visible');
  console.log('  □ Bookings table displays');
  console.log('  □ Cancelled paid bookings show "↩ Refund: [amount]"');
  
  console.log('\n\nPress Enter after you login to open the admin dashboard directly...');
  
  rl.question('', () => {
    console.log('\nOpening admin dashboard...');
    openUrl('https://merry360x.com/admin');
    
    console.log('\n✅ Admin dashboard opened.');
    console.log('Check the console for errors and verify the checklist above.');
    console.log('\nPress Ctrl+C when done.\n');
  });
}, 2000);
