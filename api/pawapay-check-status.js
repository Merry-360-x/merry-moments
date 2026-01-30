import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.pawapay.cloud";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * Vercel serverless function to check payment status from PawaPay
 * This provides an alternative to callbacks - directly querying PawaPay
 * 
 * GET /api/pawapay-check-status?depositId=xxx&checkoutId=xxx
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const { depositId, checkoutId, bookingId } = req.query;
  const orderId = checkoutId || bookingId; // Support both

  if (!depositId) {
    return json(res, 400, { error: "Missing depositId parameter" });
  }

  if (!PAWAPAY_API_KEY) {
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
        "Authorization": `Bearer ${PAWAPAY_API_KEY}`,
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
    const failureReason = depositData?.failureReason;

    console.log(`📊 PawaPay raw response for ${depositId}:`, JSON.stringify(depositData, null, 2));
    console.log(`📊 Extracted status: ${pawapayStatus}, failureReason:`, failureReason || 'none');

    // Extract human-readable failure message
    let failureMessage = null;
    if (failureReason) {
      const code = failureReason.failureCode || failureReason.code;
      const message = failureReason.failureMessage || failureReason.errorMessage;
      
      console.log(`Failure detected - Code: ${code}, Message: ${message}`);
      
      // Map common failure codes to user-friendly messages
      if (code === 'INSUFFICIENT_BALANCE' || code === 'PAYER_LIMIT_REACHED' || code === 'INSUFFICIENT_FUNDS') {
        failureMessage = 'Insufficient balance. Please recharge your mobile money account and try again.';
      } else if (code === 'PAYER_NOT_FOUND' || code === 'INVALID_PAYER') {
        failureMessage = 'Mobile money account not found. Please check your phone number.';
      } else if (code === 'TRANSACTION_DECLINED' || code === 'USER_DECLINED' || code === 'DECLINED') {
        failureMessage = 'Payment was declined. Please try again or use a different payment method.';
      } else if (code === 'TIMEOUT' || code === 'EXPIRED') {
        failureMessage = 'Payment request expired. Please try again.';
      } else if (code === 'DUPLICATE_TRANSACTION') {
        failureMessage = 'Duplicate transaction detected. Please wait or contact support.';
      } else if (code === 'CANCELLED' || code === 'USER_CANCELLED') {
        failureMessage = 'Payment was cancelled. Please try again if you wish to complete the booking.';
      } else if (message) {
        failureMessage = message;
      } else {
        failureMessage = 'Payment could not be completed. Please try again or use a different payment method.';
      }
    }
    
    // Also check if status itself indicates failure
    if (!failureMessage) {
      if (pawapayStatus === 'FAILED' || pawapayStatus === 'REJECTED') {
        failureMessage = 'Payment could not be completed. Please try again or use a different payment method.';
      } else if (pawapayStatus === 'CANCELLED') {
        failureMessage = 'Payment was cancelled. Please try again if you wish to complete the booking.';
      }
    }

    // If we have an order ID and Supabase credentials, update the checkout
    if (orderId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Map PawaPay status to our system
      let paymentStatus = "pending";

      if (pawapayStatus === "COMPLETED") {
        paymentStatus = "paid";
      } else if (pawapayStatus === "FAILED" || pawapayStatus === "REJECTED" || pawapayStatus === "CANCELLED") {
        paymentStatus = "failed";
      } else if (pawapayStatus === "SUBMITTED" || pawapayStatus === "ACCEPTED") {
        paymentStatus = "pending";
      }

      // Update the checkout request
      const { error: updateError } = await supabase
        .from("checkout_requests")
        .update({
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update checkout:", updateError);
      } else {
        console.log(`Checkout ${orderId} updated: payment=${paymentStatus}`);
      }

      return json(res, 200, {
        success: true,
        depositId,
        pawapayStatus,
        paymentStatus,
        failureMessage,
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
