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
      failureReason
    } = payload || {};

    if (!depositId) {
      console.error("Missing depositId in callback");
      return json(res, 400, { error: "Missing depositId" });
    }

    // Extract booking ID from depositId (format: merry360-{bookingId}-{timestamp})
    const parts = depositId.split("-");
    const bookingId = parts.length >= 3 ? parts.slice(1, -1).join("-") : null;

    if (!bookingId) {
      console.error("Could not extract booking ID from depositId:", depositId);
      return json(res, 400, { error: "Invalid depositId format" });
    }

    // Update payment transaction record
    const { error: txError } = await supabase
      .from("payment_transactions")
      .update({
        status,
        provider_response: payload,
        failure_reason: failureReason?.errorMessage || null,
        updated_at: new Date().toISOString()
      })
      .eq("transaction_id", depositId);

    if (txError) {
      console.error("Failed to update transaction:", txError);
    }

    // Update booking based on payment status
    let bookingStatus = "pending";
    let paymentStatus = "pending";

    if (status === "COMPLETED") {
      bookingStatus = "confirmed";
      paymentStatus = "paid";
    } else if (status === "FAILED" || status === "REJECTED" || status === "CANCELLED") {
      bookingStatus = "pending";
      paymentStatus = "failed";
    } else if (status === "SUBMITTED" || status === "ACCEPTED") {
      bookingStatus = "pending";
      paymentStatus = "pending";
    }

    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        payment_reference: depositId,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (bookingError) {
      console.error("Failed to update booking:", bookingError);
      return json(res, 500, { error: "Failed to update booking" });
    }

    console.log(`Booking ${bookingId} updated: status=${bookingStatus}, payment=${paymentStatus}`);

    // If payment completed, send confirmation email (you can add email logic here)
    if (status === "COMPLETED") {
      console.log(`Payment completed for booking ${bookingId}`);
      // TODO: Send confirmation email
    }

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
