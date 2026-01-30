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
      .select("id, user_id, payment_status, email, name, phone, total_amount, currency, metadata")
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
    let shouldCreateBookings = false;

    // Map PawaPay status to our system
    switch (status) {
      case "COMPLETED":
        newPaymentStatus = "paid";
        shouldCreateBookings = true;
        shouldNotify = true;
        console.log(`✅ Payment COMPLETED for checkout ${checkout.id}`);
        break;
      
      case "FAILED":
      case "REJECTED":
      case "CANCELLED":
        newPaymentStatus = "failed";
        shouldNotify = true;
        console.log(`❌ Payment ${status} for checkout ${checkout.id}${failureReason ? ` - ${failureReason}` : ''}`);
        break;
      
      case "SUBMITTED":
      case "ACCEPTED":
        newPaymentStatus = "pending";
        console.log(`⏳ Payment ${status} for checkout ${checkout.id}`);
        break;
      
      default:
        console.warn(`⚠️ Unknown status: ${status}`);
    }

    // Prepare update payload
    const currentMetadata = checkout.metadata || {};
    const updateData = {
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...currentMetadata,
        pawapay_webhook: {
          status,
          depositId,
          failureReason: failureReason || null,
          received_at: new Date().toISOString(),
          created,
          lastUpdated
        }
      }
    };

    // If failed, also store the failure reason in a dedicated field
    if (newPaymentStatus === "failed" && failureReason) {
      updateData.payment_error = failureReason;
    }

    // Atomic update with optimistic locking
    const { data: updated, error: updateError } = await supabase
      .from("checkout_requests")
      .update(updateData)
      .eq("id", checkout.id)
      .eq("payment_status", checkout.payment_status) // Only update if status hasn't changed
      .select("id, payment_status")
      .single();

    if (updateError) {
      console.error("❌ Failed to update checkout:", updateError);
      // Check if it was a concurrent update
      if (updateError.code === 'PGRST116') {
        console.log("⚠️ Payment status already updated by another process");
        return json(res, 200, { ok: true, message: "Already processed" });
      }
      return json(res, 500, { error: "Update failed" });
    }

    if (!updated) {
      console.log("⚠️ Payment status already changed, skipping update");
      return json(res, 200, { ok: true, message: "Already processed" });
    }

    console.log(`✅ Checkout ${checkout.id} updated: ${checkout.payment_status} → ${newPaymentStatus}`);

    // Create bookings when payment is completed
    if (shouldCreateBookings && checkout.metadata?.items) {
      console.log("📦 Creating bookings from checkout items...");
      const items = checkout.metadata.items;
      const bookingDetails = checkout.metadata.booking_details;
      
      for (const item of items) {
        try {
          const bookingData = {
            guest_id: checkout.user_id,
            guest_email: checkout.email,
            order_id: checkout.id,
            total_price: item.calculated_price || item.price,
            currency: checkout.currency || 'RWF',
            status: 'confirmed',
            payment_status: 'paid',
            payment_method: 'mobile_money',
            guests: bookingDetails?.guests || item.metadata?.guests || 1,
          };

          // Handle different item types and set booking_type
          if (item.item_type === 'property') {
            bookingData.booking_type = 'property';
            bookingData.property_id = item.reference_id;
            bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in;
            bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out;
          } else if (item.item_type === 'tour' || item.item_type === 'tour_package') {
            bookingData.booking_type = 'tour';
            bookingData.tour_id = item.reference_id;
            // For tours, use check_in date as the tour date
            bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
            bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
          } else if (item.item_type === 'transport_vehicle') {
            bookingData.booking_type = 'transport';
            bookingData.transport_id = item.reference_id;
            bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
            bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
          }

          console.log("📝 Creating booking:", bookingData);

          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .insert(bookingData)
            .select("id")
            .single();

          if (bookingError) {
            console.error("❌ Failed to create booking:", bookingError);
          } else {
            console.log(`✅ Booking created: ${booking.id}`);
          }
        } catch (bookingErr) {
          console.error("❌ Booking creation error:", bookingErr);
        }
      }
    }

    // TODO: Send email notification if payment completed or failed
    if (shouldNotify && checkout.email) {
      console.log(`📧 Should notify ${checkout.email} about ${newPaymentStatus} payment`);
      // Implement email notification here using your email service
    }

    // Acknowledge webhook (VERY IMPORTANT - always return 200)
    return json(res, 200, { 
      ok: true, 
      checkoutId: checkout.id,
      status: newPaymentStatus,
      bookingsCreated: shouldCreateBookings
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    // Still return 200 to prevent PawaPay from retrying
    return json(res, 200, { ok: true, error: error.message });
  }
}
