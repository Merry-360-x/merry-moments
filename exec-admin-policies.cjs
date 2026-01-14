const fs = require('fs');
const { Pool } = require('pg');

const projectRef = 'uwgiostcetoxotfnulfm';
const dbPassword = process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.error('❌ Missing DB_PASSWORD or SUPABASE_DB_PASSWORD environment variable');
  console.error('');
  console.error('You can find the database password in your Supabase dashboard:');
  console.error(`https://supabase.com/dashboard/project/${projectRef}/settings/database`);
  console.error('');
  console.error('Then run:');
  console.error(`  DB_PASSWORD='your-password' node exec-admin-policies.cjs`);
  process.exit(1);
}

// PostgreSQL connection string for Supabase
const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`;

const sql = fs.readFileSync('supabase/migrations/20260114130000_add_admin_policies.sql', 'utf8');

(async () => {
  console.log('🔄 Connecting to Supabase PostgreSQL database...\n');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');
    console.log('🔄 Applying admin policies migration...\n');
    
    // Execute the entire migration as a single transaction
    await client.query('BEGIN');
    
    try {
      await client.query(sql);
      await client.query('COMMIT');
      
      console.log('✅ Admin policies migration applied successfully!');
      console.log('');
      console.log('Admin users can now:');
      console.log('  • View all users in admin dashboard');
      console.log('  • Manage host applications');
      console.log('  • Perform all admin CRUD operations');
      console.log('');
    } catch (err) {
      await client.query('ROLLBACK');
      
      console.error('❌ Migration failed:', err.message);
      console.error('');
      
      if (err.message.includes('already exists')) {
        console.log('ℹ️  Some policies may already exist. Trying individual statements...\n');
        
        // Split and execute individually
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--') && s.length > 10);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i];
          console.log(`[${i + 1}/${statements.length}] Executing...`);
          
          try {
            await client.query(stmt);
            console.log(`✓ Success`);
            successCount++;
          } catch (err) {
            if (err.message.includes('already exists')) {
              console.log(`⚠ Already exists (skipping)`);
              successCount++;
            } else {
              console.log(`✗ Error: ${err.message}`);
              errorCount++;
            }
          }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Results: ${successCount} successful, ${errorCount} errors`);
        console.log(`${'='.repeat(60)}\n`);
        
        if (errorCount === 0) {
          console.log('✅ Migration completed successfully!');
        }
      } else {
        console.error('Please run the SQL manually in Supabase Dashboard:');
        console.error(`https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        process.exit(1);
      }
    }
    
    client.release();
    await pool.end();
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
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
    }
  }
  
  console.log(`\n✓ Processed ${statements.length} statements`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some policies may not have been created due to API limitations.');
    console.log('   Trying direct SQL execution via pg pool...\n');
    process.exit(1);
  } else {
    console.log('\n✅ Admin policies applied successfully!');
  }
})();
