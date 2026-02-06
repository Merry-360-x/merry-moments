// Trigger the webhook for the test booking we just created
// This simulates PawaPay notifying us that payment was completed

const checkoutId = "abea6c99-0091-46bc-853f-0fd233f81556"; // From previous test run
const depositId = `test-${Date.now()}`;

const webhookPayload = {
  depositId: depositId,
  status: "COMPLETED",
  created: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};

console.log("🔔 Triggering webhook for checkout:", checkoutId);
console.log("Payload:", JSON.stringify(webhookPayload, null, 2));

fetch("https://merry360x.com/api/pawapay-webhook", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(webhookPayload)
})
  .then(res => res.json())
  .then(data => {
    console.log("\n✅ Webhook response:", data);
    console.log("\n📧 Check emails at:");
    console.log("   Guest: bebisdavy@gmail.com");
    console.log("   Host: amina@merry360global.com");
  })
  .catch(err => {
    console.error("\n❌ Error:", err.message);
  });
