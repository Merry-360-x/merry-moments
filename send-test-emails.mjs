// Simple test to trigger emails for existing booking
import { readFileSync } from 'fs';

// Load .env
try {
  const envConfig = readFileSync('.env', 'utf8');
  const envVars = {};
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  
  const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log("🔄 Updating checkout with deposit ID...\n");
  
  const checkoutId = "abea6c99-0091-46bc-853f-0fd233f81556";
  const depositId = `test-deposit-${Date.now()}`;
  
  // Update checkout with deposit ID
  const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/checkout_requests?id=eq.${checkoutId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      dpo_transaction_id: depositId,
      payment_status: 'pending'
    })
  });
  
  if (!updateResponse.ok) {
    console.error("❌ Failed to update checkout");
    const error = await updateResponse.text();
    console.error(error);
    process.exit(1);
  }
  
  console.log("✅ Checkout updated with deposit ID:", depositId);
  console.log("\n🔔 Triggering webhook to send emails...\n");
  
  // Now trigger webhook
  const webhookPayload = {
    depositId: depositId,
    status: "COMPLETED",
    created: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  };
  
  const webhookResponse = await fetch("https://merry360x.com/api/pawapay-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(webhookPayload)
  });
  
  const result = await webhookResponse.json();
  
  console.log("✅ Webhook triggered!");
  console.log("Response:", JSON.stringify(result, null, 2));
  console.log("\n📧 Emails should be sent to:");
  console.log("   Guest: bebisdavy@gmail.com");
  console.log("   Host: amina@merry360global.com");
  console.log("\n✅ Test complete! Check your email inboxes.");
  
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
