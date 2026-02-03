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

    // PawaPay correspondents by country and provider
    // Rwanda (RWA)
    // Kenya (KEN) 
    // Uganda (UGA)
    // Zambia (ZMB)
    const correspondentMap = {
      // Rwanda
      "MTN_250": "MTN_MOMO_RWA",
      "AIRTEL_250": "AIRTEL_RWA",
      "mtn_momo_250": "MTN_MOMO_RWA",
      "airtel_money_250": "AIRTEL_RWA",
      // Kenya
      "MTN_254": "MTN_MOMO_KEN",
      "AIRTEL_254": "AIRTEL_KEN",
      "mtn_momo_254": "MTN_MOMO_KEN",
      "airtel_money_254": "AIRTEL_KEN",
      "MPESA_254": "MPESA_KEN",
      "mpesa_254": "MPESA_KEN",
      // Uganda
      "MTN_256": "MTN_MOMO_UGA",
      "AIRTEL_256": "AIRTEL_UGA",
      "mtn_momo_256": "MTN_MOMO_UGA",
      "airtel_money_256": "AIRTEL_UGA",
      // Zambia
      "MTN_260": "MTN_MOMO_ZMB",
      "AIRTEL_260": "AIRTEL_ZMB",
      "mtn_momo_260": "MTN_MOMO_ZMB",
      "airtel_money_260": "AIRTEL_ZMB",
      // Legacy fallback (Rwanda)
      "MTN": "MTN_MOMO_RWA",
      "AIRTEL": "AIRTEL_RWA",
      "mtn_momo": "MTN_MOMO_RWA",
      "airtel_money": "AIRTEL_RWA",
    };

    // Extract country code from phone number
    let cleanPhone = phoneNumber.replace(/[\s\-+]/g, "");
    let countryCode = "250"; // Default to Rwanda
    
    // Detect country from phone prefix
    if (cleanPhone.startsWith("254")) {
      countryCode = "254"; // Kenya
    } else if (cleanPhone.startsWith("256")) {
      countryCode = "256"; // Uganda
    } else if (cleanPhone.startsWith("260")) {
      countryCode = "260"; // Zambia
    } else if (cleanPhone.startsWith("250")) {
      countryCode = "250"; // Rwanda
    }
    
    const correspondentKey = `${provider}_${countryCode}`;
    const correspondent = correspondentMap[correspondentKey] || correspondentMap[provider];
    
    if (!correspondent) {
      return json(res, 400, { error: `Unsupported payment provider: ${provider} for country code ${countryCode}` });
    }
    
    console.log("🌍 Payment country:", { countryCode, provider, correspondentKey, correspondent });

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

    // All checkouts are stored in RWF, PawaPay only supports RWF
    const currency = "RWF";
    const rwfAmount = Math.round(numAmount);
    
    console.log("💰 Payment details:", {
      checkoutCurrency: checkout.currency,
      amount: numAmount,
      rwfAmount
    });

    // Generate unique deposit ID - must be a valid UUID
    const depositId = crypto.randomUUID();

    // Format phone number properly for PawaPay
    // Already have cleanPhone from country detection above
    
    // Phone number validation by country
    // Rwanda: 250 + 9 digits = 12 digits
    // Kenya: 254 + 9 digits = 12 digits  
    // Uganda: 256 + 9 digits = 12 digits
    // Zambia: 260 + 9 digits = 12 digits
    
    const countryPhoneInfo = {
      "250": { name: "Rwanda", length: 12, localLength: 9, example: "78XXXXXXX" },
      "254": { name: "Kenya", length: 12, localLength: 9, example: "7XXXXXXXX" },
      "256": { name: "Uganda", length: 12, localLength: 9, example: "7XXXXXXXX" },
      "260": { name: "Zambia", length: 12, localLength: 9, example: "9XXXXXXXX" },
    };
    
    const phoneInfo = countryPhoneInfo[countryCode] || countryPhoneInfo["250"];
    
    // Remove duplicate country code if present
    if (cleanPhone.startsWith(countryCode + countryCode)) {
      cleanPhone = cleanPhone.substring(countryCode.length);
    }
    
    // Ensure phone starts with country code
    let msisdn = cleanPhone;
    if (!msisdn.startsWith(countryCode) && msisdn.length === phoneInfo.localLength) {
      msisdn = countryCode + msisdn;
    }
    
    // Validate final phone format
    if (msisdn.length !== phoneInfo.length || !msisdn.startsWith(countryCode)) {
      console.error("❌ Invalid phone format:", { original: phoneNumber, cleaned: cleanPhone, msisdn, countryCode });
      return json(res, 400, {
        success: false,
        error: "Invalid phone number",
        message: `Phone number format is incorrect. Please enter a valid ${phoneInfo.name} number (e.g., ${phoneInfo.example})`,
        debugInfo: { phoneNumber, cleanPhone, msisdn, countryCode }
      });
    }
    
    console.log("📱 Phone number processed:", { original: phoneNumber, final: msisdn, country: phoneInfo.name });

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
      // PawaPay requires statement description to be 22 chars or less
      statementDescription: "Merry360x",
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
    console.log("📥 PawaPay full response:", JSON.stringify(pawaPayData, null, 2));
    console.log("📥 Response status:", pawaPayResponse.status);
    console.log("📥 Response keys:", Object.keys(pawaPayData || {}));

    if (!pawaPayResponse.ok) {
      console.error("❌ PawaPay API error:", pawaPayData);
      
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
    const rejectionCode = pawaPayData.rejectionReason?.rejectionCode || 
                          pawaPayData.failureReason?.failureCode ||
                          pawaPayData.correspondentError?.code ||
                          null;
    
    console.log("📊 Payment status check:", {
      status: initialStatus,
      hasFailureReason: !!rejectionReason,
      failureReason: rejectionReason,
      rejectionCode: rejectionCode,
      fullResponse: pawaPayData
    });
    
    if (initialStatus === 'REJECTED' || initialStatus === 'FAILED') {
      console.error(`⚠️ Payment immediately ${initialStatus} by PawaPay!`);
      console.error("Full PawaPay response:", JSON.stringify(pawaPayData, null, 2));
      console.error("Correspondent:", correspondent);
      console.error("Phone:", msisdn);
      console.error("Amount:", rwfAmount, currency);
      
      // Extract the actual failure reason from PawaPay - check ALL possible locations
      let failureCode = pawaPayData.rejectionReason?.rejectionCode ||
                        pawaPayData.failureReason?.failureCode || 
                        pawaPayData.failureReason?.code ||
                        pawaPayData.correspondentError?.code ||
                        pawaPayData.errorCode ||
                        'UNKNOWN';
      
      let failureMsg = pawaPayData.rejectionReason?.rejectionMessage ||
                       pawaPayData.failureReason?.failureMessage || 
                       pawaPayData.failureReason?.message ||
                       pawaPayData.correspondentError?.message ||
                       pawaPayData.errorMessage ||
                       pawaPayData.message ||
                       `Payment ${initialStatus.toLowerCase()}`;
      
      console.error(`Extracted Failure Code: ${failureCode}`);
      console.error(`Extracted Failure Message: ${failureMsg}`);
      
      // User-friendly messages for common codes
      const userMessages = {
        'PAYER_NOT_FOUND': 'The phone number is not registered for mobile money. Please check the number and try again.',
        'PAYER_LIMIT_REACHED': 'Transaction limit reached on your mobile money account. Please try a smaller amount or try again later.',
        'INSUFFICIENT_BALANCE': 'Insufficient balance in your mobile money account.',
        'TRANSACTION_DECLINED': 'The transaction was declined. Please try again or use a different payment method.',
        'DUPLICATE_TRANSACTION': 'A similar transaction was recently made. Please wait a few minutes before trying again.',
        'INVALID_PAYER': 'Invalid phone number format. Please enter a valid Rwanda mobile number.',
        'UNKNOWN': 'Payment could not be completed. Please try again or contact support.'
      };
      
      const userMessage = userMessages[failureCode] || failureMsg;
      
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
        message: userMessage,
        failureCode: failureCode,
        depositId,
        status: initialStatus,
        data: {
          checkoutId: orderId,
          depositId,
          correspondent,
          reason: failureCode,
          details: pawaPayData,
          rawFailureReason: rejectionReason
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
