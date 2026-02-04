#!/usr/bin/env node
// Minimal test - just create a support ticket

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uwgiostcetoxotfnulfm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('🎫 Creating test support ticket...\n');
  
  // Get first user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  if (!users || users.length === 0) {
    console.error('No users found');
    return;
  }
  
  const userId = users[0].id;
  const userEmail = users[0].email;
  console.log(`User: ${userEmail} (${userId})`);
  
  // Insert ticket
  console.log('\nInserting ticket...');
  const result = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      subject: '🧪 Test - Email Notification',
      message: 'This is a test to verify emails are sent to support@merry360x.com',
      category: 'technical',
      status: 'open',
      priority: 'medium'
    });
  
  console.log('\nResult:', JSON.stringify(result, null, 2));
  
  if (!result.error) {
    console.log('\n✅ SUCCESS! Ticket created.');
    console.log('📧 Check support@merry360x.com for the email notification.');
  } else {
    console.log('\n❌ ERROR:', result.error.message);
    console.log('Details:', result.error);
  }
}

test().catch(console.error);
