import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetBookings() {
  console.log('\n🗑️  Resetting all bookings...\n')
  
  // Delete all bookings
  const { error, count } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all by using impossible condition
  
  if (error) {
    console.error('❌ Error deleting bookings:', error.message)
    process.exit(1)
  }
  
  console.log(`✅ Successfully deleted all bookings`)
  console.log(`📊 Total bookings: 0`)
  console.log(`💰 Total revenue: 0 RWF\n`)
}

resetBookings()
