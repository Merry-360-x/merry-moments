import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uwgiostcetoxotfnulfm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function refundPayout() {
  const payoutId = 'b41361b0-8c15-47de-acd8-cde9b2635173';
  
  // Reset the payout to pending so the host can request again or admin can re-approve with PawaPay
  const { data, error } = await supabase
    .from('host_payouts')
    .update({
      status: 'pending',
      processed_by: null,
      processed_at: null,
      admin_notes: 'Refunded - original payout did not go through. Please re-approve to send via PawaPay.',
      pawapay_payout_id: null
    })
    .eq('id', payoutId)
    .select();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Payout reset to pending successfully!');
  console.log('Host can now receive the payout when admin approves again.');
  console.log('Updated payout:', data);
}

refundPayout();
