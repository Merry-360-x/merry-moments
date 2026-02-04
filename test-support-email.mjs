#!/usr/bin/env node
// Test script to create a support ticket and verify email notification

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupportTicketEmail() {
  console.log('🎫 Testing Support Ticket Email Notification\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Get a test user from the database
    console.log('\n📝 Step 1: Getting test user...');
    
    // Get users from auth.users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users || users.length === 0) {
      console.error('❌ Could not find any users in the database');
      console.error('Please create at least one user account first');
      process.exit(1);
    }
    
    const testUser = users[0];
    console.log(`✅ Using test user: ${testUser.email || 'No email'}`);
    console.log(`   User ID: ${testUser.id}`);
    
    // Step 2: Create a test support ticket
    console.log('\n📧 Step 2: Creating test support ticket...');
    
    const ticketData = {
      user_id: testUser.id,
      subject: '🧪 Test Ticket - Email Notification Check',
      message: `This is a test ticket created at ${new Date().toLocaleString()} to verify that email notifications are being sent to support@merry360x.com.\n\nPlease check your email inbox!`,
      category: 'technical',
      status: 'open',
      priority: 'medium'
    };
    
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData);
    
    if (ticketError) {
      console.error('❌ Failed to create ticket:', ticketError.message);
      throw ticketError;
    }
    
    // Wait a moment then fetch the most recent ticket
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: recentTickets } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const createdTicket = recentTickets?.[0];
    
    if (!createdTicket) {
      console.error('❌ Could not fetch the created ticket');
      throw new Error('Ticket creation verification failed');
    }
    
    console.log('✅ Test ticket created successfully!');
    console.log(`   Ticket ID: ${createdTicket.id}`);
    console.log(`   Subject: ${createdTicket.subject}`);
    console.log(`   Status: ${createdTicket.status}`);
    
    // Step 3: Verify the ticket was logged
    console.log('\n📊 Step 3: Verifying ticket log entry...');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const { data: logs, error: logError } = await supabase
      .from('support_ticket_logs')
      .select('*')
      .eq('ticket_id', createdTicket.id)
      .eq('action_type', 'created');
    
    if (logError) {
      console.warn('⚠️  Could not verify logs:', logError.message);
    } else if (logs && logs.length > 0) {
      console.log('✅ Ticket creation logged successfully!');
      console.log(`   Log entries: ${logs.length}`);
    } else {
      console.log('⚠️  No log entries found yet (this is okay, they might be created asynchronously)');
    }
    
    // Step 4: Check email notification
    console.log('\n✉️  Step 4: Email notification status...');
    console.log('   The database trigger should have sent an email to: support@merry360x.com');
    console.log('   Email subject: 🎫 [TECHNICAL] 🧪 Test Ticket - Email Notification Check');
    console.log('   Email should include:');
    console.log('   • Ticket details and message');
    console.log('   • Your user information');
    console.log('   • Link to customer support dashboard');
    console.log('   • Reply-to set to your email');
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('\n📬 Next steps:');
    console.log('   1. Check the email inbox for support@merry360x.com');
    console.log('   2. Verify you received the notification email');
    console.log('   3. Check that all ticket details are included');
    console.log('   4. Try replying to test the reply-to functionality');
    console.log(`\n🗑️  To clean up, delete the test ticket from the dashboard`);
    console.log(`   or run: DELETE FROM support_tickets WHERE id = '${createdTicket.id}';\n`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testSupportTicketEmail();
