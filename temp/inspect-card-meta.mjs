const SUPABASE_URL = 'https://uwgiostcetoxotfnulfm.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0MDEyOCwiZXhwIjoyMDgzOTE2MTI4fQ.ChQu8HGoCsZ73NB93xxwuvZEtWeUMbnAN4B-l7EJQV0';

const res = await fetch(
  SUPABASE_URL + '/rest/v1/checkout_requests?select=id,email,created_at,payment_status,payment_method,currency,total_amount,metadata&payment_method=eq.card&order=created_at.desc&limit=10',
  {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
    },
  }
);

const rows = await res.json();

if (!Array.isArray(rows)) {
  console.error('Unexpected response:', JSON.stringify(rows, null, 2));
  process.exit(1);
}

for (const r of rows) {
  const flw = r.metadata?.flutterwave || {};
  console.log('\n========================================');
  console.log('id:                    ', r.id);
  console.log('email:                 ', r.email);
  console.log('created_at:            ', r.created_at);
  console.log('payment_status:        ', r.payment_status);
  console.log('amount:                ', r.total_amount, r.currency);
  console.log('--- Flutterwave Metadata ---');
  console.log('billing_address_supp:  ', flw.billing_address_supplied);
  console.log('billing_country:       ', flw.billing_country);
  console.log('init_status:           ', flw.init_status);
  console.log('init_message:          ', flw.init_message);
  console.log('tx_ref:                ', flw.tx_ref);
  console.log('verify_status:         ', flw.verify_status);
  console.log('verify_http_status:    ', flw.verify_http_status);
  console.log('auth_model:            ', flw.auth_model);
  console.log('processor_response:    ', flw.processor_response);
  console.log('card:                  ', JSON.stringify(flw.card));
  console.log('customer:              ', JSON.stringify(flw.customer));
  console.log('redirect_status:       ', flw.redirect_status);
  console.log('webhook_event:         ', flw.webhook_event);
  // show full raw flw object for anything not captured above
  const known = ['billing_address_supplied','billing_country','init_status','init_message','tx_ref','verify_status','verify_http_status','auth_model','processor_response','card','customer','redirect_status','webhook_event'];
  const extra = Object.keys(flw).filter(k => !known.includes(k));
  if (extra.length) {
    console.log('extra keys:            ', extra.join(', '));
    for (const k of extra) console.log(' ', k, ':', JSON.stringify(flw[k]));
  }
}

if (rows.length === 0) console.log('(no card checkout_requests found)');
