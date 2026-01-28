import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * Vercel serverless function to handle PawaPay webhook callbacks
 * 
 * POST /api/pawapay-callback
 * Body: PawaPay webhook payload
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials");
    return json(res, 500, { error: "Server configuration error" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = req.body;
    
    console.log("PawaPay callback received:", JSON.stringify(payload, null, 2));

    const {
      depositId,
      status,
      amount,
      currency,
      payer,
      correspondent,
      created,
      failureReason,
      metadata
    } = payload || {};

    if (!depositId) {
      console.error("Missing depositId in callback");
      return json(res, 400, { error: "Missing depositId" });
    }

    // Extract booking ID from metadata or find by payment_reference
    let bookingId = null;
    
    // Try to get from metadata
    if (metadata && Array.isArray(metadata)) {
      const bookingMeta = metadata.find(m => m.fieldName === "bookingId");
      if (bookingMeta) {
        bookingId = bookingMeta.fieldValue;
      }
    }

    // If not in metadata, lookup by payment_reference
    if (!bookingId) {
      const { data: bookingLookup } = await supabase
        .from("bookings")
        .select("id")
        .eq("payment_reference", depositId)
        .maybeSingle();
      
      if (bookingLookup) {
        bookingId = bookingLookup.id;
      }
    }

    if (!bookingId) {
      console.error("Could not find booking for depositId:", depositId);
      return json(res, 400, { error: "Booking not found" });
    }

    // Update payment transaction record if exists
    try {
      await supabase
        .from("payment_transactions")
        .update({
          status,
          provider_response: payload,
          failure_reason: failureReason?.errorMessage || null,
          updated_at: new Date().toISOString()
        })
        .eq("transaction_id", depositId);
    } catch (txErr) {
      console.warn("Could not update transaction record:", txErr);
    }

    // Update booking based on payment status
    let bookingStatus = "pending_confirmation";
    let paymentStatus = "pending";

    if (status === "COMPLETED") {
      bookingStatus = "confirmed";
      paymentStatus = "paid";
    } else if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
      bookingStatus = "pending_confirmation";
      paymentStatus = "failed";
    } else if (status === "SUBMITTED" || status === "ACCEPTED") {
      bookingStatus = "pending_confirmation";
      paymentStatus = "pending";
    }

    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (bookingError) {
      console.error("Failed to update booking:", bookingError);
      return json(res, 500, { error: "Failed to update booking" });
    }

    console.log(`Booking ${bookingId} updated: status=${bookingStatus}, payment=${paymentStatus}`);

    return json(res, 200, { 
      success: true, 
      message: "Callback processed",
      bookingId,
      status
    });

  } catch (error) {
    console.error("Callback processing error:", error);
    return json(res, 500, {
      error: "Callback processing failed",
      message: error.message
    });
  }
}
