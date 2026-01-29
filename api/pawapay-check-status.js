import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Determine if we're using sandbox or production
const USE_SANDBOX = process.env.PAWAPAY_SANDBOX === "true" || !process.env.PAWAPAY_API_TOKEN;

const PAWAPAY_BASE_URL = USE_SANDBOX
  ? "https://api.sandbox.pawapay.cloud"
  : "https://api.pawapay.cloud";

const PAWAPAY_API_TOKEN = USE_SANDBOX
  ? process.env.PAWAPAY_SANDBOX_TOKEN || process.env.PAWAPAY_API_TOKEN
  : process.env.PAWAPAY_API_TOKEN;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * Vercel serverless function to check payment status from PawaPay
 * This provides an alternative to callbacks - directly querying PawaPay
 * 
 * GET /api/pawapay-check-status?depositId=xxx&bookingId=xxx
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const { depositId, bookingId } = req.query;

  if (!depositId) {
    return json(res, 400, { error: "Missing depositId parameter" });
  }

  if (!PAWAPAY_API_TOKEN) {
    console.error("Missing PawaPay API token");
    return json(res, 500, { error: "Server configuration error" });
  }

  try {
    // Query PawaPay for payment status
    const pawapayUrl = `${PAWAPAY_BASE_URL}/deposits/${depositId}`;
    
    console.log(`Checking payment status at: ${pawapayUrl}`);
    
    const response = await fetch(pawapayUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PAWAPAY_API_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const responseText = await response.text();
    console.log("PawaPay status response:", responseText);

    let pawaPayData;
    try {
      pawaPayData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse PawaPay response:", e);
      return json(res, 500, { 
        error: "Payment provider error", 
        details: responseText.substring(0, 200)
      });
    }

    if (!response.ok) {
      console.error("PawaPay API error:", pawaPayData);
      return json(res, response.status, { 
        error: pawaPayData.errorMessage || "Failed to check payment status",
        code: pawaPayData.errorCode
      });
    }

    // Get the payment status from PawaPay
    // PawaPay returns an array for deposits endpoint
    const depositData = Array.isArray(pawaPayData) ? pawaPayData[0] : pawaPayData;
    const pawapayStatus = depositData?.status;

    console.log(`PawaPay status for ${depositId}: ${pawapayStatus}`);

    // If we have a booking ID and Supabase credentials, update the booking
    if (bookingId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Map PawaPay status to our system
      let bookingStatus = "pending_confirmation";
      let paymentStatus = "pending";

      if (pawapayStatus === "COMPLETED") {
        bookingStatus = "confirmed";
        paymentStatus = "paid";
      } else if (pawapayStatus === "FAILED" || pawapayStatus === "REJECTED" || pawapayStatus === "CANCELLED") {
        bookingStatus = "pending_confirmation";
        paymentStatus = "failed";
      } else if (pawapayStatus === "SUBMITTED" || pawapayStatus === "ACCEPTED") {
        bookingStatus = "pending_confirmation";
        paymentStatus = "pending";
      }

      // Update the booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: bookingStatus,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Failed to update booking:", updateError);
      } else {
        console.log(`Booking ${bookingId} updated: status=${bookingStatus}, payment=${paymentStatus}`);
      }

      return json(res, 200, {
        success: true,
        depositId,
        pawapayStatus,
        bookingStatus,
        paymentStatus,
        depositData
      });
    }

    // Just return the PawaPay status if no booking update needed
    return json(res, 200, {
      success: true,
      depositId,
      pawapayStatus,
      depositData
    });

  } catch (error) {
    console.error("Status check error:", error);
    return json(res, 500, {
      error: "Status check failed",
      message: error.message
    });
  }
}
