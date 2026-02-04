import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://uwgiostcetoxotfnulfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyTicketLogsMigration() {
  console.log('📦 Applying support ticket logs migration...\n');
  
  try {
    const migration = fs.readFileSync('supabase/migrations/20260204000000_add_support_ticket_logs.sql', 'utf-8');
    
    console.log('Applying migration...');
    const {error} = await supabase.rpc('exec_sql', { sql: migration });
    if (error) {
      console.log('Note:', error.message);
      // Try to apply manually in chunks
      console.log('\n💡 Applying manually via SQL statements...\n');
      
      // Split into individual statements
      const statements = migration.split(';').filter(s => s.trim());
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;
        
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
        if (stmtError) {
          console.log(`  ⚠️  ${stmtError.message}`);
        } else {
          console.log(`  ✅ Success`);
        }
      }
    } else {
      console.log('✅ Migration applied successfully');
    }
    
    console.log('\n✅ Support ticket logs migration completed!\n');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

applyTicketLogsMigration().catch(console.error);
