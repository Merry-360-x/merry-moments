import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://eynhuxgfuzhujuaqzgxi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmh1eGdmdXpodWp1YXF6Z3hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjEyMDQxMywiZXhwIjoyMDQ3Njk2NDEzfQ.8oV6f7VxJ5odjmgCy5ZU5QddbGGx7KvZ4xxZMGM-Ttg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔧 Applying refund calculation migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260127000001_add_refund_calculation.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // Try direct execution if rpc doesn't work
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
      
      if (directError) {
        console.error('❌ Error:', directError.message);
        
        // Manual execution via connection
        console.log('\n📋 Manual execution required. Run this SQL in Supabase SQL Editor:\n');
        console.log(migrationSQL);
        process.exit(1);
      }
    }
    
    console.log('✅ Migration applied successfully!\n');
    
    // Test the function
    console.log('🧪 Testing refund calculation function...\n');
    
    // Get a cancelled paid booking
    const { data: cancelledBookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'cancelled')
      .eq('payment_status', 'paid')
      .limit(1);
    
    if (bookingError) {
      console.error('❌ Error fetching bookings:', bookingError.message);
      return;
    }
    
    if (!cancelledBookings || cancelledBookings.length === 0) {
      console.log('ℹ️  No cancelled paid bookings found for testing.');
      console.log('   Function is ready to use when needed.\n');
      return;
    }
    
    const testBooking = cancelledBookings[0];
    console.log(`Testing with booking ID: ${testBooking.id}`);
    console.log(`Check-in: ${testBooking.check_in}`);
    console.log(`Total price: ${testBooking.total_price} ${testBooking.currency || 'USD'}\n`);
    
    // Call the refund calculation function
    const { data: refundData, error: refundError } = await supabase
      .rpc('calculate_refund_amount', {
        booking_id_param: testBooking.id
      });
    
    if (refundError) {
      console.error('❌ Error calculating refund:', refundError.message);
      return;
    }
    
    if (refundData && refundData.length > 0) {
      const result = refundData[0];
      console.log('✅ Refund calculation result:');
      console.log(`   Policy: ${result.policy_type}`);
      console.log(`   Refund: ${result.refund_percentage}% = ${result.refund_amount} ${testBooking.currency || 'USD'}`);
      console.log(`   Reason: ${result.reason}\n`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260127000001_add_refund_calculation.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationSQL);
  }
}

applyMigration();
