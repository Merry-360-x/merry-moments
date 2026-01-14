const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sql = fs.readFileSync('supabase/migrations/20260114130000_add_admin_policies.sql', 'utf8');

console.log('='.repeat(80));
console.log('ADMIN POLICIES MIGRATION');
console.log('='.repeat(80));
console.log('');
console.log('⚠️  Due to Supabase API limitations, you need to manually run this SQL:');
console.log('');
console.log('1. Open Supabase Dashboard → SQL Editor');
console.log('   https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/sql/new');
console.log('');
console.log('2. Copy the SQL below:');
console.log('');
console.log('-'.repeat(80));
console.log(sql);
console.log('-'.repeat(80));
console.log('');
console.log('3. Paste it into the SQL Editor and click "Run"');
console.log('');
console.log('This will grant admins full access to view and manage all data.');
console.log('');
