#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.cloud';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Validate environment
function validateEnv() {
  const missing = [];
  if (!PAWAPAY_API_KEY) missing.push('PAWAPAY_API_KEY');
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  if (missing.length > 0) {
    error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Test PawaPay connection
async function testConnection() {
  log('\n🔌 Testing PawaPay Connection...', colors.bright);
  
  try {
    const response = await fetch(`${PAWAPAY_BASE_URL}/deposits?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAWAPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      success('Connected to PawaPay API successfully!');
      info(`Environment: ${PAWAPAY_BASE_URL.includes('sandbox') ? 'Sandbox' : 'Production'}`);
      return true;
    } else {
      const text = await response.text();
      error(`Connection failed: ${response.status} ${response.statusText}`);
      console.log(text);
      return false;
    }
  } catch (err) {
    error(`Connection error: ${err.message}`);
    return false;
  }
}

// Create a test payment
async function createPayment(bookingId, phoneNumber, amount, method = 'mtn_momo') {
  log(`\n💳 Creating Payment...`, colors.bright);
  info(`Booking ID: ${bookingId}`);
  info(`Phone: ${phoneNumber}`);
  info(`Amount: ${amount} RWF`);
  info(`Method: ${method}`);
  
  const correspondentMap = {
    'mtn_momo': 'MTN_MOMO_RWA',
    'airtel_money': 'AIRTEL_RWA',
  };
  
  const correspondent = correspondentMap[method];
  if (!correspondent) {
    error(`Invalid payment method: ${method}`);
    return;
  }
  
  const depositId = `merry360-${bookingId}-${Date.now()}`;
  
  // Clean phone number
  let msisdn = phoneNumber.replace(/[\s\-+]/g, '');
  if (!msisdn.startsWith('250') && msisdn.length === 9) {
    msisdn = '250' + msisdn;
  }
  
  const payload = {
    depositId,
    amount: parseFloat(amount).toFixed(2),
    currency: 'RWF',
    correspondent,
    payer: {
      type: 'MSISDN',
      address: {
        value: msisdn
      }
    },
    customerTimestamp: new Date().toISOString(),
    statementDescription: `Merry360 Booking ${bookingId.substring(0, 8)}`,
  };
  
  try {
    const response = await fetch(`${PAWAPAY_BASE_URL}/deposits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAWAPAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      success('Payment created successfully!');
      console.log('\nPayment Details:');
      console.log(JSON.stringify(data, null, 2));
      
      // Save to database
      await supabase.from('payment_transactions').insert({
        booking_id: bookingId,
        provider: 'pawapay',
        transaction_id: depositId,
        amount: parseFloat(amount),
        currency: 'RWF',
        status: data.status || 'SUBMITTED',
        payment_method: method,
        phone_number: msisdn,
        provider_response: data
      });
      
      success(`Transaction saved to database: ${depositId}`);
    } else {
      error('Payment creation failed!');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    error(`Error: ${err.message}`);
  }
}

// Check payment status
async function checkStatus(depositId) {
  log(`\n🔍 Checking Payment Status...`, colors.bright);
  info(`Deposit ID: ${depositId}`);
  
  try {
    const response = await fetch(`${PAWAPAY_BASE_URL}/deposits/${depositId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAWAPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\nPayment Status:');
      console.log(JSON.stringify(data, null, 2));
      
      // Update database
      await supabase
        .from('payment_transactions')
        .update({
          status: data.status,
          provider_response: data
        })
        .eq('transaction_id', depositId);
      
      success('Status updated in database');
    } else {
      error('Status check failed!');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    error(`Error: ${err.message}`);
  }
}

// List recent transactions
async function listTransactions(limit = 10) {
  log(`\n📋 Recent Transactions (limit ${limit})...`, colors.bright);
  
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      warning('No transactions found');
      return;
    }
    
    console.log('\n');
    data.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.transaction_id}`);
      console.log(`   Booking: ${tx.booking_id}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Method: ${tx.payment_method}`);
      console.log(`   Phone: ${tx.phone_number}`);
      console.log(`   Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('');
    });
    
  } catch (err) {
    error(`Error: ${err.message}`);
  }
}

// Show help
function showHelp() {
  console.log(`
${colors.bright}PawaPay CLI - Mobile Money Payment Manager${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node pawapay-cli.mjs <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}test${colors.reset}                          Test PawaPay API connection
  ${colors.green}create${colors.reset} <booking> <phone> <amount> [method]
                                   Create a payment
                                   Methods: mtn_momo (default), airtel_money
  ${colors.green}status${colors.reset} <depositId>            Check payment status
  ${colors.green}list${colors.reset} [limit]                  List recent transactions (default: 10)
  ${colors.green}help${colors.reset}                          Show this help message

${colors.cyan}Examples:${colors.reset}
  node pawapay-cli.mjs test
  node pawapay-cli.mjs create abc-123 250788123456 10000
  node pawapay-cli.mjs create abc-123 250788123456 10000 airtel_money
  node pawapay-cli.mjs status merry360-abc-123-1234567890
  node pawapay-cli.mjs list 20

${colors.cyan}Environment Variables Required:${colors.reset}
  PAWAPAY_API_KEY              PawaPay API key
  PAWAPAY_BASE_URL             API URL (sandbox/production)
  VITE_SUPABASE_URL            Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key
`);
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  validateEnv();
  
  switch (command) {
    case 'test':
      await testConnection();
      break;
      
    case 'create':
      if (args.length < 4) {
        error('Usage: create <bookingId> <phoneNumber> <amount> [method]');
        process.exit(1);
      }
      await createPayment(args[1], args[2], args[3], args[4] || 'mtn_momo');
      break;
      
    case 'status':
      if (!args[1]) {
        error('Usage: status <depositId>');
        process.exit(1);
      }
      await checkStatus(args[1]);
      break;
      
    case 'list':
      await listTransactions(parseInt(args[1]) || 10);
      break;
      
    default:
      error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
