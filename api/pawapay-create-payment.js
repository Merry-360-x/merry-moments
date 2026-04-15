import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// PawaPay API settings
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.pawapay.io";
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

function parsePawaPayDepositPayload(payload) {
  if (Array.isArray(payload)) return payload[0] || {};
  if (payload && typeof payload === "object") return payload;
  return {};
}

function extractPawaPayFailure(payload, fallbackStatus) {
  const depositPayload = parsePawaPayDepositPayload(payload);

  const code = depositPayload?.rejectionReason?.rejectionCode ||
    depositPayload?.failureReason?.failureCode ||
    depositPayload?.failureReason?.code ||
    depositPayload?.correspondentError?.code ||
    depositPayload?.errorCode ||
    null;

  const message = depositPayload?.rejectionReason?.rejectionMessage ||
    depositPayload?.failureReason?.failureMessage ||
    depositPayload?.failureReason?.message ||
    depositPayload?.correspondentError?.message ||
    depositPayload?.errorMessage ||
    depositPayload?.message ||
    (fallbackStatus ? `Payment ${String(fallbackStatus).toLowerCase()}` : null);

  return { code, message };
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

    // PawaPay correspondents — all active countries on our merchant account
    const correspondentMap = {
      // Rwanda (+250) — RWF
      "MTN_250": "MTN_MOMO_RWA",
      "AIRTEL_250": "AIRTEL_RWA",
      "mtn_momo_250": "MTN_MOMO_RWA",
      "airtel_money_250": "AIRTEL_RWA",
      // Kenya (+254) — KES
      "MPESA_254": "MPESA_KEN",
      "mpesa_254": "MPESA_KEN",
      // Uganda (+256) — UGX
      "MTN_256": "MTN_MOMO_UGA",
      "AIRTEL_256": "AIRTEL_OAPI_UGA",
      "mtn_momo_256": "MTN_MOMO_UGA",
      "airtel_money_256": "AIRTEL_OAPI_UGA",
      // Zambia (+260) — ZMW
      "MTN_260": "MTN_MOMO_ZMB",
      "ZAMTEL_260": "ZAMTEL_ZMB",
      "mtn_momo_260": "MTN_MOMO_ZMB",
      "zamtel_260": "ZAMTEL_ZMB",
      // Tanzania (+255) — TZS
      "VODACOM_255": "VODACOM_TZN",
      "vodacom_255": "VODACOM_TZN",
      "TIGO_255": "TIGO_TZN",
      "tigo_255": "TIGO_TZN",
      "AIRTEL_255": "AIRTEL_TZN",
      "airtel_money_255": "AIRTEL_TZN",
      // Ghana (+233) — GHS
      "MTN_233": "MTN_MOMO_GHA",
      "mtn_momo_233": "MTN_MOMO_GHA",
      "VODAFONE_233": "VODAFONE_GHA",
      "vodafone_233": "VODAFONE_GHA",
      // DRC (+243) — CDF
      "VODACOM_243": "VODACOM_MPESA_COD",
      "vodacom_243": "VODACOM_MPESA_COD",
      "AIRTEL_243": "AIRTEL_COD",
      "airtel_money_243": "AIRTEL_COD",
      "ORANGE_243": "ORANGE_COD",
      "orange_243": "ORANGE_COD",
      // Cameroon (+237) — XAF
      "MTN_237": "MTN_MOMO_CMR",
      "mtn_momo_237": "MTN_MOMO_CMR",
      "ORANGE_237": "ORANGE_CMR",
      "orange_237": "ORANGE_CMR",
      // Senegal (+221) — XOF
      "ORANGE_221": "ORANGE_SEN",
      "orange_221": "ORANGE_SEN",
      "FREE_221": "FREE_SEN",
      "free_221": "FREE_SEN",
      // Ivory Coast (+225) — XOF
      "MTN_225": "MTN_MOMO_CIV",
      "mtn_momo_225": "MTN_MOMO_CIV",
      "ORANGE_225": "ORANGE_CIV",
      "orange_225": "ORANGE_CIV",
      // Mozambique (+258) — MZN
      "VODACOM_258": "VODACOM_MOZ",
      "vodacom_258": "VODACOM_MOZ",
      "MPESA_258": "MPESA_MOZ",
      "mpesa_258": "MPESA_MOZ",
      // Malawi (+265) — MWK
      "AIRTEL_265": "AIRTEL_MWI",
      "airtel_money_265": "AIRTEL_MWI",
      "TNM_265": "TNM_MWI",
      "tnm_265": "TNM_MWI",
      // Burundi (+257) — BIF
      "ECONET_257": "ECONET_BDI",
      "econet_257": "ECONET_BDI",
      // Congo-Brazzaville (+242) — XAF
      "MTN_242": "MTN_MOMO_COG",
      "mtn_momo_242": "MTN_MOMO_COG",
      "AIRTEL_242": "AIRTEL_COG",
      "airtel_money_242": "AIRTEL_COG",
      // Benin (+229) — XOF
      "MTN_229": "MTN_MOMO_BEN",
      "mtn_momo_229": "MTN_MOMO_BEN",
      "MOOV_229": "MOOV_BEN",
      "moov_229": "MOOV_BEN",
      // Gabon (+241) — XAF
      "AIRTEL_241": "AIRTEL_GAB",
      "airtel_money_241": "AIRTEL_GAB",
      // Sierra Leone (+232) — SLE
      "ORANGE_232": "ORANGE_SLE",
      "orange_232": "ORANGE_SLE",
      // Tanzania Halotel (+255) — TZS
      "HALOTEL_255": "HALOTEL_TZN",
      "halotel_255": "HALOTEL_TZN",
      // Direct correspondent identity mappings (Flutter sends these directly)
      "MTN_MOMO_RWA": "MTN_MOMO_RWA",
      "AIRTEL_RWA": "AIRTEL_RWA",
      "MPESA_KEN": "MPESA_KEN",
      "MTN_MOMO_UGA": "MTN_MOMO_UGA",
      "AIRTEL_OAPI_UGA": "AIRTEL_OAPI_UGA",
      "MTN_MOMO_ZMB": "MTN_MOMO_ZMB",
      "ZAMTEL_ZMB": "ZAMTEL_ZMB",
      "VODACOM_TZN": "VODACOM_TZN",
      "TIGO_TZN": "TIGO_TZN",
      "AIRTEL_TZN": "AIRTEL_TZN",
      "MTN_MOMO_GHA": "MTN_MOMO_GHA",
      "VODAFONE_GHA": "VODAFONE_GHA",
      "VODACOM_MPESA_COD": "VODACOM_MPESA_COD",
      "AIRTEL_COD": "AIRTEL_COD",
      "ORANGE_COD": "ORANGE_COD",
      "MTN_MOMO_CMR": "MTN_MOMO_CMR",
      "ORANGE_CMR": "ORANGE_CMR",
      "ORANGE_SEN": "ORANGE_SEN",
      "FREE_SEN": "FREE_SEN",
      "MTN_MOMO_CIV": "MTN_MOMO_CIV",
      "ORANGE_CIV": "ORANGE_CIV",
      "VODACOM_MOZ": "VODACOM_MOZ",
      "MPESA_MOZ": "MPESA_MOZ",
      "AIRTEL_MWI": "AIRTEL_MWI",
      "TNM_MWI": "TNM_MWI",
      "ECONET_BDI": "ECONET_BDI",
      "MTN_MOMO_COG": "MTN_MOMO_COG",
      "AIRTEL_COG": "AIRTEL_COG",
      "MTN_MOMO_BEN": "MTN_MOMO_BEN",
      "MOOV_BEN": "MOOV_BEN",
      "AIRTEL_GAB": "AIRTEL_GAB",
      "ORANGE_SLE": "ORANGE_SLE",
      "HALOTEL_TZN": "HALOTEL_TZN",
      // Legacy fallback (Rwanda)
      "MTN": "MTN_MOMO_RWA",
      "AIRTEL": "AIRTEL_RWA",
      "mtn_momo": "MTN_MOMO_RWA",
      "airtel_money": "AIRTEL_RWA",
      // Legacy shorthand for non-Rwanda providers (phone prefix determines country)
      "MPESA": "MPESA_KEN",
      "VODACOM": "VODACOM_TZN",
      "ORANGE": "ORANGE_SEN",
      "FREE": "FREE_SEN",
      "ZAMTEL": "ZAMTEL_ZMB",
      "MOOV": "MOOV_BEN",
      "HALOTEL": "HALOTEL_TZN",
    };

    // Extract country code from phone number
    let cleanPhone = phoneNumber.replace(/[\s\-+]/g, "");
    let countryCode = "250"; // Default to Rwanda
    
    // Detect country from phone prefix
    const prefixMap = [
      ["221", "221"], ["225", "225"], ["229", "229"], ["232", "232"],
      ["233", "233"], ["237", "237"], ["241", "241"], ["242", "242"],
      ["243", "243"], ["250", "250"], ["254", "254"], ["255", "255"],
      ["256", "256"], ["257", "257"], ["258", "258"], ["260", "260"],
      ["265", "265"],
    ];
    for (const [prefix, code] of prefixMap) {
      if (cleanPhone.startsWith(prefix)) { countryCode = code; break; }
    }
    
    const providerKey = String(provider || "").trim();
    const providerNormalized = providerKey.toUpperCase();
    const correspondentKey = `${providerNormalized}_${countryCode}`;
    const correspondent = correspondentMap[correspondentKey] ||
      correspondentMap[providerNormalized] ||
      correspondentMap[providerKey];
    
    if (!correspondent) {
      return json(res, 400, { error: `Unsupported payment provider: ${providerKey || "unknown"} for country code ${countryCode}` });
    }
    
    console.log("🌍 Payment country:", { countryCode, provider: providerNormalized, correspondentKey, correspondent });

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

    // Phone number validation by country - define this early so we can get the currency
    const countryPhoneInfo = {
      "221": { name: "Senegal", length: 12, localLength: 9, example: "7XXXXXXXX", currency: "XOF" },
      "225": { name: "Ivory Coast", length: 13, localLength: 10, example: "0XXXXXXXXX", currency: "XOF" },
      "229": { name: "Benin", length: 11, localLength: 8, example: "9XXXXXXX", currency: "XOF" },
      "232": { name: "Sierra Leone", length: 11, localLength: 8, example: "7XXXXXXX", currency: "SLE" },
      "233": { name: "Ghana", length: 12, localLength: 9, example: "2XXXXXXXX", currency: "GHS" },
      "237": { name: "Cameroon", length: 12, localLength: 9, example: "6XXXXXXXX", currency: "XAF" },
      "241": { name: "Gabon", length: 12, localLength: 9, example: "6XXXXXXXX", currency: "XAF" },
      "242": { name: "Congo", length: 12, localLength: 9, example: "0XXXXXXXX", currency: "XAF" },
      "243": { name: "DR Congo", length: 12, localLength: 9, example: "8XXXXXXXX", currency: "CDF" },
      "250": { name: "Rwanda", length: 12, localLength: 9, example: "78XXXXXXX", currency: "RWF" },
      "254": { name: "Kenya", length: 12, localLength: 9, example: "7XXXXXXXX", currency: "KES" },
      "255": { name: "Tanzania", length: 12, localLength: 9, example: "7XXXXXXXX", currency: "TZS" },
      "256": { name: "Uganda", length: 12, localLength: 9, example: "7XXXXXXXX", currency: "UGX" },
      "257": { name: "Burundi", length: 11, localLength: 8, example: "7XXXXXXX", currency: "BIF" },
      "258": { name: "Mozambique", length: 12, localLength: 9, example: "8XXXXXXXX", currency: "MZN" },
      "260": { name: "Zambia", length: 12, localLength: 9, example: "9XXXXXXXX", currency: "ZMW" },
      "265": { name: "Malawi", length: 12, localLength: 9, example: "9XXXXXXXX", currency: "MWK" },
    };
    
    const phoneInfo = countryPhoneInfo[countryCode] || countryPhoneInfo["250"];
    
    // Save the original checkout currency before we change it for payment
    const originalCurrency = checkout.currency || "USD";
    
    // Use the currency that matches the payment method's country
    // PawaPay requires the currency to match the correspondent's country
    const currency = phoneInfo.currency;
    
    // Convert the checkout amount to the payment currency if needed
    // For now, we'll assume the amount is already converted on the frontend
    const paymentAmount = Math.round(numAmount);
    
    console.log("💰 Payment details:", {
      originalCurrency: originalCurrency,
      checkoutCurrency: checkout.currency,
      paymentCurrency: currency,
      originalAmount: numAmount,
      paymentAmount,
      country: phoneInfo.name
    });

    // Format phone number properly for PawaPay
    // Already have cleanPhone from country detection above
    
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

    const submitPawaPayDeposit = async (depositIdValue, correspondentValue) => {
      const requestPayload = {
        depositId: depositIdValue,
        amount: String(paymentAmount),
        currency,
        correspondent: correspondentValue,
        payer: {
          type: "MSISDN",
          address: { value: msisdn }
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

      console.log("Creating PawaPay deposit:", JSON.stringify(requestPayload, null, 2));
      console.log("Phone number being sent:", msisdn);
      console.log("Amount:", paymentAmount, currency);
      console.log("Correspondent:", correspondentValue);

      const providerResponse = await fetch(`${PAWAPAY_BASE_URL}/deposits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PAWAPAY_API_KEY}`
        },
        body: JSON.stringify(requestPayload)
      });

      const responseText = await providerResponse.text();
      console.log("PawaPay response status:", providerResponse.status);
      console.log("PawaPay response:", responseText);
      console.log("PawaPay API URL:", PAWAPAY_BASE_URL);

      let rawPayload;
      try {
        rawPayload = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse PawaPay response:", e);
        throw new Error(`Unable to parse provider response: ${responseText.substring(0, 200)}`);
      }

      const depositPayload = parsePawaPayDepositPayload(rawPayload);
      return {
        ok: providerResponse.ok,
        statusCode: providerResponse.status,
        rawPayload,
        depositPayload,
      };
    };

    let selectedProvider = providerNormalized;
    let selectedCorrespondent = correspondent;
    let selectedDepositId = crypto.randomUUID();

    let providerAttempt = await submitPawaPayDeposit(selectedDepositId, selectedCorrespondent);
    let pawaPayData = providerAttempt.depositPayload;
    let rawProviderPayload = providerAttempt.rawPayload;

    if (!providerAttempt.ok) {
      console.error("❌ PawaPay API error:", rawProviderPayload);
      return json(res, providerAttempt.statusCode, {
        error: pawaPayData.errorMessage || "Payment initiation failed",
        code: pawaPayData.errorCode,
        details: rawProviderPayload,
        debugInfo: {
          phone: msisdn,
          amount: paymentAmount,
          correspondent: selectedCorrespondent,
          depositId: selectedDepositId,
        }
      });
    }

    let initialStatus = String(pawaPayData.status || "").toUpperCase();
    let { code: rejectionCode, message: rejectionMessage } = extractPawaPayFailure(pawaPayData, initialStatus);

    const canFallbackRwandaProvider =
      (initialStatus === "REJECTED" || initialStatus === "FAILED") &&
      countryCode === "250" &&
      ["MTN", "AIRTEL"].includes(selectedProvider) &&
      ["PAYER_NOT_FOUND", "INVALID_PAYER"].includes(String(rejectionCode || "").toUpperCase());

    if (canFallbackRwandaProvider) {
      const alternateProvider = selectedProvider === "MTN" ? "AIRTEL" : "MTN";
      const alternateCorrespondent = correspondentMap[`${alternateProvider}_${countryCode}`];

      if (alternateCorrespondent) {
        console.warn("⚠️ Initial provider rejected payer, retrying with alternate provider", {
          countryCode,
          originalProvider: selectedProvider,
          alternateProvider,
          rejectionCode,
        });

        const fallbackDepositId = crypto.randomUUID();
        const fallbackAttempt = await submitPawaPayDeposit(fallbackDepositId, alternateCorrespondent);

        if (fallbackAttempt.ok) {
          selectedProvider = alternateProvider;
          selectedCorrespondent = alternateCorrespondent;
          selectedDepositId = fallbackDepositId;
          providerAttempt = fallbackAttempt;
          pawaPayData = fallbackAttempt.depositPayload;
          rawProviderPayload = fallbackAttempt.rawPayload;
          initialStatus = String(pawaPayData.status || "").toUpperCase();
          ({ code: rejectionCode, message: rejectionMessage } = extractPawaPayFailure(pawaPayData, initialStatus));
        }
      }
    }

    // Log the full response for debugging
    console.log("📥 PawaPay normalized payload:", JSON.stringify(pawaPayData, null, 2));
    console.log("📥 Raw provider payload:", JSON.stringify(rawProviderPayload, null, 2));
    console.log("📥 Response status:", providerAttempt.statusCode);

    console.log("📊 Payment status check:", {
      status: initialStatus,
      hasFailureReason: Boolean(rejectionCode || rejectionMessage),
      failureReason: rejectionMessage,
      rejectionCode,
      selectedProvider,
      selectedCorrespondent,
      fullResponse: pawaPayData,
    });

    const paymentMethodValue = selectedProvider === "MTN"
      ? "mtn_momo"
      : selectedProvider === "AIRTEL"
        ? "airtel_money"
        : "mobile_money";

    if (initialStatus === "REJECTED" || initialStatus === "FAILED") {
      console.error(`⚠️ Payment immediately ${initialStatus} by PawaPay!`);
      console.error("Full PawaPay response:", JSON.stringify(pawaPayData, null, 2));
      console.error("Correspondent:", selectedCorrespondent);
      console.error("Phone:", msisdn);
      console.error("Amount:", paymentAmount, currency);

      const failureCode = String(rejectionCode || "UNKNOWN").toUpperCase();
      const failureMsg = rejectionMessage || `Payment ${initialStatus.toLowerCase()}`;

      console.error(`Extracted Failure Code: ${failureCode}`);
      console.error(`Extracted Failure Message: ${failureMsg}`);

      // User-friendly messages for common codes
      const userMessages = {
        "PAYER_NOT_FOUND": "The phone number is not registered for mobile money. Please check the number and try again.",
        "PAYER_LIMIT_REACHED": "Transaction limit reached on your mobile money account. Please try a smaller amount or try again later.",
        "INSUFFICIENT_BALANCE": "Insufficient balance in your mobile money account.",
        "TRANSACTION_DECLINED": "The transaction was declined. Please try again or use a different payment method.",
        "DUPLICATE_TRANSACTION": "A similar transaction was recently made. Please wait a few minutes before trying again.",
        "INVALID_PAYER": "Invalid phone number format. Please enter a valid mobile number.",
        "UNKNOWN": "Payment could not be completed. Please try again or contact support."
      };

      const userMessage = userMessages[failureCode] || failureMsg;

      // Update database with actual failure reason
      await supabase
        .from("checkout_requests")
        .update({
          payment_method: paymentMethodValue,
          payment_status: "failed",
          payment_error: `${failureCode}: ${failureMsg}`,
          dpo_transaction_id: selectedDepositId,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      return json(res, 200, {
        success: false,
        error: `Payment ${initialStatus.toLowerCase()}`,
        message: userMessage,
        failureCode,
        depositId: selectedDepositId,
        status: initialStatus,
        data: {
          checkoutId: orderId,
          depositId: selectedDepositId,
          provider: selectedProvider,
          correspondent: selectedCorrespondent,
          reason: failureCode,
          details: rawProviderPayload,
        }
      });
    }

    // Update checkout request with payment details
    const { error: updateError } = await supabase
      .from("checkout_requests")
      .update({
        payment_method: paymentMethodValue,
        payment_status: "pending",
        dpo_transaction_id: selectedDepositId, // Reuse this field for PawaPay deposit ID
        metadata: {
          ...checkout.metadata,
          deposit_id: selectedDepositId,
          payment_currency: currency,
          original_currency: originalCurrency,
          payment_amount: paymentAmount,
          payment_provider: selectedProvider,
          payment_correspondent: selectedCorrespondent,
        },
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
          transaction_id: selectedDepositId,
          amount: paymentAmount,
          currency,
          status: initialStatus || "SUBMITTED",
          payment_method: paymentMethodValue,
          phone_number: msisdn,
          provider_response: rawProviderPayload,
          created_at: new Date().toISOString()
        });
    } catch (txErr) {
      console.warn("Could not create payment transaction record:", txErr);
    }

    return json(res, 200, {
      success: true,
      depositId: selectedDepositId,
      status: initialStatus || pawaPayData.status,
      message: "Payment initiated. Please complete the transaction on your phone.",
      data: {
        checkoutId: orderId,
        depositId: selectedDepositId,
        amount: paymentAmount,
        currency,
        phoneNumber: msisdn,
        provider: selectedProvider,
        correspondent: selectedCorrespondent,
        status: initialStatus || pawaPayData.status
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
