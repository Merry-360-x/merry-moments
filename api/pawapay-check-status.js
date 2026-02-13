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

      // Fetch full checkout to get items for booking creation
      const { data: checkoutData, error: checkoutFetchError } = await supabase
        .from("checkout_requests")
        .select("id, user_id, payment_status, metadata, currency")
        .eq("id", orderId)
        .single();

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

      // Create bookings if payment completed and not already created
      if (paymentStatus === "paid" && checkoutData && checkoutData.payment_status !== "paid") {
        console.log("📦 Creating bookings from checkout items (via status check)...");
        const items = checkoutData.metadata?.items || [];
        const bookingDetails = checkoutData.metadata?.booking_details;
        
        for (const item of items) {
          try {
            // Check if booking already exists
            const { data: existingBooking } = await supabase
              .from("bookings")
              .select("id")
              .eq("order_id", orderId)
              .eq(item.item_type === 'property' ? "property_id" : item.item_type === 'transport_vehicle' ? "transport_id" : "tour_id", item.reference_id)
              .limit(1);

            if (existingBooking && existingBooking.length > 0) {
              console.log(`⏭️ Booking already exists for item ${item.reference_id}`);
              continue;
            }

            const bookingData = {
              guest_id: checkoutData.user_id,
              guest_name: checkoutData.metadata?.guest_info?.name || null,
              guest_email: checkoutData.email,
              guest_phone: checkoutData.metadata?.guest_info?.phone || null,
              order_id: checkoutData.id,
              total_price: item.calculated_price || item.price,
              currency: item.calculated_price_currency || item.currency || checkoutData.currency || 'RWF',
              status: 'pending',
              confirmation_status: 'pending',
              payment_status: 'paid',
              payment_method: 'mobile_money',
              guests: bookingDetails?.guests || item.metadata?.guests || 1,
              review_token: crypto.randomUUID(),
            };

            // Set booking_type for proper dashboard filtering
            if (item.item_type === 'property') {
              bookingData.booking_type = 'property';
              bookingData.property_id = item.reference_id;
              bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in;
              bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out;
            } else if (item.item_type === 'tour' || item.item_type === 'tour_package') {
              bookingData.booking_type = 'tour';
              bookingData.tour_id = item.reference_id;
              bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
              bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
            } else if (item.item_type === 'transport_vehicle') {
              bookingData.booking_type = 'transport';
              bookingData.transport_id = item.reference_id;
              bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
              bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
            }

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
