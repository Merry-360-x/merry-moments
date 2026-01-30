import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// PawaPay API settings
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.pawapay.cloud";
const PAWAPAY_TEST_MODE = process.env.PAWAPAY_TEST_MODE === "true";

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
 *   checkoutId: string,
 *   amount: number,
 *   currency: string (e.g., "RWF"),
 *   phoneNumber: string,
 *   payerName: string,
 *   payerEmail: string,
 *   provider: string (e.g., "MTN" or "AIRTEL")
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
      checkoutId,
      bookingId, // legacy support
      amount,
      phoneNumber,
      payerName,
      payerEmail,
      provider,
      description
    } = req.body || {};

    // Support both checkoutId and bookingId for backwards compatibility
    const orderId = checkoutId || bookingId;

    // Validation
    if (!orderId) {
      return json(res, 400, { error: "Checkout ID is required" });
    }

    const numAmount = safeNum(amount);
    if (numAmount <= 0) {
      return json(res, 400, { error: "Invalid amount" });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return json(res, 400, { error: "Phone number is required" });
    }

    // Map provider to PawaPay correspondent
    const correspondentMap = {
      "MTN": "MTN_MOMO_RWA",
      "AIRTEL": "AIRTEL_RWA",
      "mtn_momo": "MTN_MOMO_RWA",
      "airtel_money": "AIRTEL_RWA",
    };

    const correspondent = correspondentMap[provider];
    if (!correspondent) {
      return json(res, 400, { error: `Unsupported payment provider: ${provider}` });
    }

    // Fetch checkout details from database
    const { data: checkout, error: checkoutError } = await supabase
      .from("checkout_requests")
      .select("*")
      .eq("id", orderId)
      .single();

    if (checkoutError || !checkout) {
      console.error("Checkout not found:", checkoutError);
      return json(res, 404, { error: "Checkout not found" });
    }

    // Rwanda mobile money uses RWF - convert if needed
    // For now, always use RWF for mobile money in Rwanda
    const currency = "RWF";
    
    // Convert amount to RWF if checkout is in USD (approximate rate)
    let rwfAmount = numAmount;
    if (checkout.currency === "USD") {
      rwfAmount = Math.round(numAmount * 1350); // Approximate USD to RWF rate
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
      statementDescription: description || "Merry360x Order",
      metadata: [
        { fieldName: "checkoutId", fieldValue: orderId },
        { fieldName: "customerName", fieldValue: safeStr(payerName, 100) },
        { fieldName: "customerEmail", fieldValue: safeStr(payerEmail, 100), isPII: true }
      ]
    };

    console.log("Creating PawaPay deposit:", JSON.stringify(pawaPayRequest, null, 2));
    console.log("Phone number being sent:", msisdn);
    console.log("Amount:", rwfAmount, currency);
    console.log("Provider:", correspondent);

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
    console.log("PawaPay API URL:", PAWAPAY_BASE_URL);

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

    // Log the full response for debugging
    console.log("PawaPay full response object:", JSON.stringify(pawaPayData, null, 2));

    if (!pawaPayResponse.ok) {
      console.error("PawaPay API error:", pawaPayData);
      
      // Return detailed error to help debug
      return json(res, pawaPayResponse.status, { 
        error: pawaPayData.errorMessage || "Payment initiation failed",
        code: pawaPayData.errorCode,
        details: pawaPayData,
        debugInfo: {
          phone: msisdn,
          amount: rwfAmount,
          correspondent,
          depositId
        }
      });
    }

    // Check if payment was immediately rejected
    const initialStatus = pawaPayData.status;
    const rejectionReason = pawaPayData.failureReason;
    
    if (initialStatus === 'REJECTED' || initialStatus === 'FAILED') {
      console.error(`⚠️ Payment immediately ${initialStatus} by PawaPay!`);
      console.error("PawaPay rejection details:", JSON.stringify(rejectionReason, null, 2));
      console.error("Correspondent:", correspondent);
      console.error("Phone:", msisdn);
      console.error("Amount:", rwfAmount, currency);
      
      // Extract the actual failure reason from PawaPay
      let failureCode = rejectionReason?.failureCode || rejectionReason?.code || 'UNKNOWN';
      let failureMsg = rejectionReason?.failureMessage || rejectionReason?.message || `Payment ${initialStatus.toLowerCase()}`;
      
      console.error(`Failure Code: ${failureCode}`);
      console.error(`Failure Message: ${failureMsg}`);
      
      // Update database with actual failure reason
      await supabase
        .from("checkout_requests")
        .update({
          payment_method: provider === 'MTN' ? 'mtn_momo' : 'airtel_money',
          payment_status: "failed",
          payment_error: `${failureCode}: ${failureMsg}`,
          dpo_transaction_id: depositId,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);
      
      return json(res, 200, {
        success: false,
        error: `Payment ${initialStatus.toLowerCase()}`,
        message: failureMsg,
        failureCode: failureCode,
        depositId,
        status: initialStatus,
        data: {
          checkoutId: orderId,
          depositId,
          correspondent,
          reason: failureCode,
          details: rejectionReason
        }
      });
    }

    // Update checkout request with payment details
    const { error: updateError } = await supabase
      .from("checkout_requests")
      .update({
        payment_method: provider === 'MTN' ? 'mtn_momo' : 'airtel_money',
        payment_status: "pending",
        dpo_transaction_id: depositId, // Reuse this field for PawaPay deposit ID
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update checkout:", updateError);
    }

    // TEST MODE: Auto-complete payment after 5 seconds for testing
    if (PAWAPAY_TEST_MODE) {
      console.log("TEST MODE: Will auto-complete payment in 5 seconds");
      setTimeout(async () => {
        try {
          const supabaseAsync = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await supabaseAsync
            .from("checkout_requests")
            .update({
              payment_status: "paid",
              updated_at: new Date().toISOString()
            })
            .eq("id", orderId);
          console.log("TEST MODE: Payment auto-completed for", orderId);
        } catch (err) {
          console.error("TEST MODE: Failed to auto-complete:", err);
        }
      }, 5000);
    }

    // Create payment transaction record (may fail if table doesn't exist, but that's ok)
    try {
      await supabase
        .from("payment_transactions")
        .insert({
          checkout_id: orderId,
          provider: "pawapay",
          transaction_id: depositId,
          amount: rwfAmount,
          currency,
          status: pawaPayData.status || "SUBMITTED",
          payment_method: provider === 'MTN' ? 'mtn_momo' : 'airtel_money',
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
        checkoutId: orderId,
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
