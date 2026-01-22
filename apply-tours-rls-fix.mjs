import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set these in your .env file or environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  try {
    console.log('Applying tours RLS fix migration...\n');
    
    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, 'supabase', 'migrations', '20260122030000_fix_tours_rls_access.sql'),
      'utf-8'
    );

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!\n');

    // Test the access
    console.log('Testing tour access...');
    const { data: tours, error: testError } = await supabase
      .from('tours')
      .select('id, title, is_published')
      .limit(3);

    if (testError) {
      console.error('Test query failed:', testError);
    } else {
      console.log(`✅ Found ${tours?.length || 0} tours`);
      tours?.forEach(tour => {
        console.log(`  - ${tour.title} (${tour.is_published ? 'published' : 'draft'})`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

applyMigration();
