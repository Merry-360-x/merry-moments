import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uwgiostcetoxotfnulfm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPayouts() {
  // Get recent payouts
  const { data: payouts, error } = await supabase
    .from('host_payouts')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Recent Payouts:');
  payouts.forEach(p => {
    console.log(`- ID: ${p.id}`);
    console.log(`  Host: ${p.profiles?.full_name} (${p.profiles?.email})`);
    console.log(`  Amount: ${p.amount} ${p.currency}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  PawaPay ID: ${p.pawapay_payout_id || 'None'}`);
    console.log(`  Created: ${p.created_at}`);
    console.log(`  Processed: ${p.processed_at || 'Not yet'}`);
    console.log('');
  });
}

checkPayouts();
