#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL not found in environment');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('💡 Get it from: https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/settings/api');
  console.log('   Look for "service_role" key under "Project API keys"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listUsers() {
  console.log('\n📋 Fetching users...\n');
  
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('❌ Error fetching users:', error.message);
    return null;
  }

  if (!users || users.users.length === 0) {
    console.log('No users found');
    return null;
  }

  console.log('Available users:');
  console.log('─'.repeat(80));
  users.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email || 'No email'} (ID: ${user.id.substring(0, 8)}...)`);
  });
  console.log('─'.repeat(80));

  return users.users;
}

async function getCurrentRoles(userId) {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching current roles:', error.message);
    return [];
  }

  return roles?.map(r => r.role) || [];
}

async function assignRole(userId, role) {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role })
    .select();

  if (error) {
    if (error.code === '23505') {
      console.log(`ℹ️  User already has the ${role} role`);
      return true;
    }
    console.error('❌ Error assigning role:', error.message);
    return false;
  }

  return true;
}

async function main() {
  console.log('\n🎯 Staff Role Assignment Tool\n');

  const users = await listUsers();
  if (!users) {
    rl.close();
    return;
  }

  const userNumber = await question('\nEnter user number: ');
  const userIndex = parseInt(userNumber) - 1;

  if (isNaN(userIndex) || userIndex < 0 || userIndex >= users.length) {
    console.log('❌ Invalid user number');
    rl.close();
    return;
  }

  const selectedUser = users[userIndex];
  console.log(`\n✅ Selected: ${selectedUser.email}`);

  // Show current roles
  const currentRoles = await getCurrentRoles(selectedUser.id);
  if (currentRoles.length > 0) {
    console.log(`📌 Current roles: ${currentRoles.join(', ')}`);
  } else {
    console.log('📌 Current roles: None');
  }

  console.log('\n🎭 Available Staff Roles:');
  console.log('1. Financial Staff (💵 Financial Dashboard)');
  console.log('2. Operations Staff (⚙️  Operations Dashboard)');
  console.log('3. Customer Support (💬 Support Dashboard)');
  console.log('4. All Staff Roles (Assign all three)');

  const roleChoice = await question('\nSelect role to assign (1-4): ');

  const roleMap = {
    '1': ['financial_staff'],
    '2': ['operations_staff'],
    '3': ['customer_support'],
    '4': ['financial_staff', 'operations_staff', 'customer_support']
  };

  const rolesToAssign = roleMap[roleChoice];

  if (!rolesToAssign) {
    console.log('❌ Invalid choice');
    rl.close();
    return;
  }

  console.log('\n⏳ Assigning role(s)...\n');

  for (const role of rolesToAssign) {
    const success = await assignRole(selectedUser.id, role);
    if (success) {
      console.log(`✅ Assigned: ${role}`);
    }
  }

  // Show updated roles
  const updatedRoles = await getCurrentRoles(selectedUser.id);
  console.log(`\n📌 Updated roles: ${updatedRoles.join(', ')}`);

  console.log('\n✨ Done! User must sign out and back in to see the dashboard link.\n');
  rl.close();
}

main().catch(console.error);
