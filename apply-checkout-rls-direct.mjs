import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

// Supabase direct connection
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const dbPassword = process.env.database_password;

if (!projectRef || !dbPassword) {
  console.error('❌ Missing project ref or database password');
  console.log('Project URL:', supabaseUrl);
  console.log('Project ref:', projectRef);
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const sql = `
-- Fix checkout_requests INSERT policy for all users

-- Drop conflicting INSERT policies
DROP POLICY IF EXISTS "Users can create checkout requests" ON checkout_requests;
DROP POLICY IF EXISTS "Anyone can create checkout requests" ON checkout_requests;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON checkout_requests;
DROP POLICY IF EXISTS "Allow insert for guests" ON checkout_requests;
DROP POLICY IF EXISTS "checkout_requests_insert_policy" ON checkout_requests;
DROP POLICY IF EXISTS "Allow checkout request creation" ON checkout_requests;

-- Create permissive INSERT policy
CREATE POLICY "Allow checkout request creation"
  ON checkout_requests FOR INSERT
  WITH CHECK (true);

-- Also fix SELECT policy for users
DROP POLICY IF EXISTS "Users can view own checkout requests" ON checkout_requests;
CREATE POLICY "Users can view own checkout requests"
  ON checkout_requests FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role IN ('admin', 'super_admin', 'operations', 'financial', 'customer_support')
    )
  );
`;

async function applyFix() {
  console.log('🔧 Connecting to Supabase PostgreSQL directly...');
  console.log('   Project:', projectRef);
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('\n📝 Applying RLS fix...');
    await client.query(sql);
    
    console.log('✅ RLS policy fix applied successfully!');
    console.log('\n🎉 Users should now be able to create checkout requests');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
      console.log('\n💡 Try applying manually in Supabase Dashboard > SQL Editor');
    }
  } finally {
    await client.end();
  }
}

applyFix();
