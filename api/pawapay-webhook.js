import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

/**
 * PawaPay Webhook Handler
 * 
 * CRITICAL: This handles asynchronous payment status updates from PawaPay
 * 
 * Webhook URL: https://merry360x.com/api/pawapay-webhook
 * 
 * PawaPay will POST here when payment status changes:
 * - SUBMITTED: Payment initiated
 * - ACCEPTED: Payment processing
 * - COMPLETED: Payment successful ✅
 * - FAILED: Payment failed (insufficient funds, etc) ❌
 * - REJECTED: Payment rejected
 * - CANCELLED: Payment cancelled
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const event = req.body;
    
    console.log("📥 PawaPay webhook received:", JSON.stringify(event, null, 2));

    // Extract payment details from webhook
    const depositId = event.depositId;
    const status = event.status; // COMPLETED, FAILED, SUBMITTED, ACCEPTED, REJECTED, CANCELLED
    const failureReason = event.failureReason;
    const created = event.created;
    const lastUpdated = event.lastUpdatedAt;

    if (!depositId) {
      console.error("❌ No depositId in webhook");
      return json(res, 400, { error: "Missing depositId" });
    }

    // Initialize Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing Supabase credentials");
      return json(res, 500, { error: "Server configuration error" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the checkout request by depositId (stored in dpo_transaction_id field)
    const { data: checkouts, error: fetchError } = await supabase
      .from("checkout_requests")
      .select("id, payment_status, email, name, total_amount, currency")
      .eq("dpo_transaction_id", depositId)
      .limit(1);

    if (fetchError) {
      console.error("❌ Database error:", fetchError);
      return json(res, 500, { error: "Database error" });
    }

    if (!checkouts || checkouts.length === 0) {
      console.warn(`⚠️ No checkout found for depositId: ${depositId}`);
      // Still return 200 to acknowledge webhook
      return json(res, 200, { ok: true, message: "Checkout not found" });
    }

    const checkout = checkouts[0];
    let newPaymentStatus = checkout.payment_status;
    let shouldNotify = false;

    // Map PawaPay status to our system
    switch (status) {
      case "COMPLETED":
        newPaymentStatus = "paid";
        shouldNotify = true;
        console.log(`✅ Payment COMPLETED for checkout ${checkout.id}`);
        break;
      
      case "FAILED":
      case "REJECTED":
      case "CANCELLED":
        newPaymentStatus = "failed";
        shouldNotify = true;
        console.log(`❌ Payment ${status} for checkout ${checkout.id}`);
        if (failureReason) {
          console.log(`   Reason:`, failureReason);
        }
        break;
      
      case "SUBMITTED":
      case "ACCEPTED":
        newPaymentStatus = "pending";
        console.log(`⏳ Payment ${status} for checkout ${checkout.id}`);
        break;
      
      default:
        console.warn(`⚠️ Unknown status: ${status}`);
    }

    // Update checkout request
    const updateData = {
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...checkout.metadata,
        pawapay_webhook: {
          status,
          depositId,
          failureReason,
          received_at: new Date().toISOString(),
          created,
          lastUpdated
        }
      }
    };

    const { error: updateError } = await supabase
      .from("checkout_requests")
      .update(updateData)
      .eq("id", checkout.id);

    if (updateError) {
      console.error("❌ Failed to update checkout:", updateError);
      return json(res, 500, { error: "Update failed" });
    }

    console.log(`✅ Checkout ${checkout.id} updated: ${checkout.payment_status} → ${newPaymentStatus}`);

    // TODO: Send email notification if payment completed or failed
    if (shouldNotify && checkout.email) {
      console.log(`📧 Should notify ${checkout.email} about ${newPaymentStatus} payment`);
      // Implement email notification here using your email service
    }

    // Acknowledge webhook (VERY IMPORTANT - always return 200)
    return json(res, 200, { 
      ok: true, 
      checkoutId: checkout.id,
      status: newPaymentStatus
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    // Still return 200 to prevent PawaPay from retrying
    return json(res, 200, { ok: true, error: error.message });
  }
}
