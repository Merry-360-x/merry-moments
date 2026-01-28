import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// PawaPay API settings
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.pawapay.cloud";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function safeStr(x, max = 500) {
  const s = typeof x === "string" ? x : "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Vercel serverless function to initiate PawaPay mobile money payment
 * 
 * POST /api/pawapay-create-payment
 * Body: {
 *   bookingId: string,
 *   amount: number,
 *   currency: string (e.g., "RWF"),
 *   phoneNumber: string,
 *   customerName: string,
 *   customerEmail: string,
 *   paymentMethod: string (e.g., "mtn_momo", "airtel_money")
 * }
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials");
    return json(res, 500, { error: "Server configuration error" });
  }

  if (!PAWAPAY_API_KEY) {
    console.error("Missing PawaPay API key");
    return json(res, 500, { error: "Payment provider not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const {
      bookingId,
      amount,
      phoneNumber,
      customerName,
      customerEmail,
      paymentMethod
    } = req.body || {};

    // Validation
    if (!bookingId) {
      return json(res, 400, { error: "Booking ID is required" });
    }

    const numAmount = safeNum(amount);
    if (numAmount <= 0) {
      return json(res, 400, { error: "Invalid amount" });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return json(res, 400, { error: "Phone number is required" });
    }

    // Map payment method to PawaPay correspondent
    const correspondentMap = {
      "mtn_momo": "MTN_MOMO_RWA",
      "airtel_money": "AIRTEL_RWA",
    };

    const correspondent = correspondentMap[paymentMethod];
    if (!correspondent) {
      return json(res, 400, { error: `Unsupported payment method: ${paymentMethod}` });
    }

    // Fetch booking details from database to get the correct currency
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return json(res, 404, { error: "Booking not found" });
    }

    // Rwanda mobile money uses RWF - convert if needed
    // For now, always use RWF for mobile money in Rwanda
    const currency = "RWF";
    
    // Convert amount to RWF if booking is in USD (approximate rate)
    let rwfAmount = numAmount;
    if (booking.currency === "USD") {
      rwfAmount = Math.round(numAmount * 1300); // Approximate USD to RWF rate
    }

    // Generate unique deposit ID - must be a valid UUID
    const depositId = crypto.randomUUID();

    // Format phone number (remove +, spaces, dashes)
    const cleanPhone = phoneNumber.replace(/[\s\-+]/g, "");
    
    // Ensure phone starts with country code (250 for Rwanda)
    let msisdn = cleanPhone;
    if (!msisdn.startsWith("250") && msisdn.length === 9) {
      msisdn = "250" + msisdn;
    }

    // Create PawaPay deposit request
    const pawaPayRequest = {
      depositId,
      amount: String(rwfAmount),
      currency,
      correspondent,
      payer: {
        type: "MSISDN",
        address: {
          value: msisdn
        }
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "Merry360x Booking",
      metadata: [
        { fieldName: "bookingId", fieldValue: bookingId },
        { fieldName: "customerName", fieldValue: safeStr(customerName, 100) },
        { fieldName: "customerEmail", fieldValue: safeStr(customerEmail, 100), isPII: true }
      ]
    };

    console.log("Creating PawaPay deposit:", JSON.stringify(pawaPayRequest, null, 2));

    // Call PawaPay API
    const pawaPayResponse = await fetch(`${PAWAPAY_BASE_URL}/deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAWAPAY_API_KEY}`
      },
      body: JSON.stringify(pawaPayRequest)
    });

    const responseText = await pawaPayResponse.text();
    console.log("PawaPay response status:", pawaPayResponse.status);
    console.log("PawaPay response:", responseText);

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

    if (!pawaPayResponse.ok) {
      console.error("PawaPay API error:", pawaPayData);
      return json(res, pawaPayResponse.status, { 
        error: pawaPayData.errorMessage || "Payment initiation failed",
        code: pawaPayData.errorCode
      });
    }

    // Update booking with payment details
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_method: paymentMethod,
        payment_status: "pending",
        payment_reference: depositId,
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
    }

    // Create payment transaction record (may fail if table doesn't exist, but that's ok)
    try {
      await supabase
        .from("payment_transactions")
        .insert({
          booking_id: bookingId,
          provider: "pawapay",
          transaction_id: depositId,
          amount: rwfAmount,
          currency,
          status: pawaPayData.status || "SUBMITTED",
          payment_method: paymentMethod,
          phone_number: msisdn,
          provider_response: pawaPayData,
          created_at: new Date().toISOString()
        });
    } catch (txErr) {
      console.warn("Could not create payment transaction record:", txErr);
    }

    return json(res, 200, {
      success: true,
      depositId,
      status: pawaPayData.status,
      message: "Payment initiated. Please complete the transaction on your phone.",
      data: {
        bookingId,
        depositId,
        amount: rwfAmount,
        currency,
        phoneNumber: msisdn,
        correspondent,
        status: pawaPayData.status
      }
    });

  } catch (error) {
    console.error("Payment creation error:", error);
    return json(res, 500, {
      error: "Payment initiation failed",
      message: error.message
    });
  }
}
