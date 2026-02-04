#!/usr/bin/env node
// Simple test to insert a support ticket directly

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Creating test ticket with raw SQL...\n');
  
  try {
    // First get a user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const testUser = users[0];
    console.log(`Using user: ${testUser.email}`);
    console.log(`User ID: ${testUser.id}\n`);
    
    // Insert using RPC/SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        INSERT INTO support_tickets (user_id, subject, message, category, status, priority)
        VALUES ('${testUser.id}', '🧪 Test Ticket - Email Check', 'Testing email notifications to support@merry360x.com', 'technical', 'open', 'medium')
        RETURNING *;
      `
    });
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success!', data);
    }
    
  } catch (err) {
    console.error('Failed:', err);
  }
}

test();
