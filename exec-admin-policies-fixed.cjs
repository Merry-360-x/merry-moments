const { Pool } = require('pg');
const fs = require('fs');

const projectRef = 'uwgiostcetoxotfnulfm';
const dbPassword = process.env.DB_PASSWORD;

if (!dbPassword) {
  console.error('❌ DB_PASSWORD environment variable is required');
  process.exit(1);
}

(async () => {
  const pool = new Pool({
    connectionString: `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
  });
  
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    const client = await pool.connect();
    
    console.log('📖 Reading admin policies migration...');
    const migrationPath = './supabase/migrations/20260114130000_add_admin_policies.sql';
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Executing admin policies migration...');
    
    await client.query('BEGIN');
    
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅ Admin policies migration executed successfully!');
      console.log('   Your admin dashboard should now have full access to data.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    
    client.release();
    await pool.end();
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('');
    console.error('Please verify:');
    console.error('  1. Database password is correct');
    console.error('  2. Database is accessible');
    console.error('');
    console.error('Or run the SQL manually in Supabase Dashboard:');
    console.error(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    process.exit(1);
  }
})();