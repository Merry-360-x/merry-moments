import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eynhuxgfuzhujuaqzgxi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmh1eGdmdXpodWp1YXF6Z3hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjEyMDQxMywiZXhwIjoyMDQ3Njk2NDEzfQ.8oV6f7VxJ5odjmgCy5ZU5QddbGGx7KvZ4xxZMGM-Ttg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRefundCalculation() {
  console.log('🧪 Testing Refund Calculation...\n');

  // Get a booking to test with
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching bookings:', error);
    return;
  }

  if (!bookings || bookings.length === 0) {
    console.log('ℹ️  No bookings found');
    return;
  }

  console.log(`📋 Found ${bookings.length} bookings to test:\n`);

  for (const booking of bookings) {
    console.log(`\n📌 Booking ID: ${booking.id.slice(0, 8)}...`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Payment: ${booking.payment_status || 'N/A'}`);
    console.log(`   Total: ${booking.total_price} ${booking.currency || 'USD'}`);
    console.log(`   Check-in: ${booking.check_in}`);
    console.log(`   Type: ${booking.booking_type || 'N/A'}`);

    // Calculate days until check-in
    const checkInDate = new Date(booking.check_in);
    const today = new Date();
    const daysUntil = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
    console.log(`   Days until check-in: ${daysUntil}`);

    // Get cancellation policy
    let policyType = 'standard';
    if (booking.booking_type === 'property' && booking.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('cancellation_policy')
        .eq('id', booking.property_id)
        .single();
      
      policyType = property?.cancellation_policy || 'fair';
      console.log(`   Policy: ${policyType} (from property)`);
    } else if (booking.booking_type === 'tour' && booking.tour_id) {
      const { data: tour } = await supabase
        .from('tour_packages')
        .select('cancellation_policy_type')
        .eq('id', booking.tour_id)
        .single();
      
      policyType = tour?.cancellation_policy_type || 'standard';
      console.log(`   Policy: ${policyType} (from tour)`);
    } else {
      console.log(`   Policy: ${policyType} (default)`);
    }

    // Calculate refund if cancelled and paid
    if (booking.status === 'cancelled' && booking.payment_status === 'paid') {
      const refundPolicies = {
        flexible: [
          { minDays: 1, refundPct: 100, description: 'Full refund (1+ days notice)' },
          { minDays: 0, refundPct: 0, description: 'No refund (less than 1 day notice)' }
        ],
        moderate: [
          { minDays: 5, refundPct: 100, description: 'Full refund (5+ days notice)' },
          { minDays: 3, refundPct: 50, description: '50% refund (3-4 days notice)' },
          { minDays: 0, refundPct: 0, description: 'No refund (less than 3 days notice)' }
        ],
        standard: [
          { minDays: 5, refundPct: 100, description: 'Full refund (5+ days notice)' },
          { minDays: 3, refundPct: 50, description: '50% refund (3-4 days notice)' },
          { minDays: 0, refundPct: 0, description: 'No refund (less than 3 days notice)' }
        ],
        strict: [
          { minDays: 14, refundPct: 100, description: 'Full refund (14+ days notice)' },
          { minDays: 7, refundPct: 50, description: '50% refund (7-13 days notice)' },
          { minDays: 0, refundPct: 0, description: 'No refund (less than 7 days notice)' }
        ],
        fair: [
          { minDays: 7, refundPct: 100, description: 'Full refund (7+ days notice)' },
          { minDays: 2, refundPct: 50, description: '50% refund (2-6 days notice)' },
          { minDays: 0, refundPct: 0, description: 'No refund (less than 2 days notice)' }
        ],
        non_refundable: [
          { minDays: 0, refundPct: 0, description: 'Non-refundable' }
        ]
      };

      const policy = refundPolicies[policyType] || refundPolicies.standard;
      const refundRule = policy.find(rule => daysUntil >= rule.minDays) || policy[policy.length - 1];
      const refundAmount = (booking.total_price * refundRule.refundPct) / 100;

      console.log(`\n   💰 REFUND CALCULATION:`);
      console.log(`      Amount: ${refundAmount} ${booking.currency || 'USD'}`);
      console.log(`      Percentage: ${refundRule.refundPct}%`);
      console.log(`      Reason: ${refundRule.description}`);
    } else {
      console.log(`   ℹ️  Not eligible for refund calculation (${booking.status}, ${booking.payment_status})`);
    }
  }

  console.log('\n✅ Test complete!\n');
}

testRefundCalculation();
