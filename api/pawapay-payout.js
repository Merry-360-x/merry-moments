import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Support both env variable names
const PAWAPAY_API_URL = process.env.PAWAPAY_BASE_URL || process.env.PAWAPAY_API_URL || "https://api.pawapay.cloud";
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;

// PawaPay correspondents by provider and country code.
const PAYOUT_CORRESPONDENTS = {
  MTN_250: "MTN_MOMO_RWA",
  AIRTEL_250: "AIRTEL_RWA",
  mtn_momo_250: "MTN_MOMO_RWA",
  airtel_money_250: "AIRTEL_RWA",
  MPESA_254: "MPESA_KEN",
  mpesa_254: "MPESA_KEN",
  MTN_256: "MTN_MOMO_UGA",
  AIRTEL_256: "AIRTEL_OAPI_UGA",
  mtn_momo_256: "MTN_MOMO_UGA",
  airtel_money_256: "AIRTEL_OAPI_UGA",
  MTN_260: "MTN_MOMO_ZMB",
  ZAMTEL_260: "ZAMTEL_ZMB",
  mtn_momo_260: "MTN_MOMO_ZMB",
  zamtel_260: "ZAMTEL_ZMB",
  MTN: "MTN_MOMO_RWA",
  AIRTEL: "AIRTEL_RWA",
  mtn_momo: "MTN_MOMO_RWA",
  airtel_money: "AIRTEL_RWA",
};

function normalizePhone(phoneNumber) {
  let normalized = String(phoneNumber || "").replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (!normalized) return "";
  if (normalized.startsWith("0")) {
    normalized = `250${normalized.substring(1)}`;
  }
  if (!["250", "254", "256", "260"].some((prefix) => normalized.startsWith(prefix))) {
    normalized = `250${normalized}`;
  }
  return normalized;
}

function detectCountryCode(phoneNumber) {
  if (phoneNumber.startsWith("254")) return "254";
  if (phoneNumber.startsWith("256")) return "256";
  if (phoneNumber.startsWith("260")) return "260";
  return "250";
}

function resolveProvider(provider, payoutDetails) {
  return (
    provider ||
    payoutDetails?.provider ||
    payoutDetails?.mobile_provider ||
    "MTN"
  );
}

function extractCountryIso(countryCode) {
  if (countryCode === "254") return "KEN";
  if (countryCode === "256") return "UGA";
  if (countryCode === "260") return "ZMB";
  return "RWA";
}

async function fetchActivePayoutProviders(countryIso) {
  const endpoints = [
    `${PAWAPAY_API_URL}/active-conf?country=${countryIso}&operationType=PAYOUT`,
    `${PAWAPAY_API_URL}/v2/active-conf?country=${countryIso}&operationType=PAYOUT`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAWAPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) continue;
      const payload = await response.json();
      const countries = Array.isArray(payload?.countries) ? payload.countries : [];
      const country = countries.find((entry) => String(entry?.country || "").toUpperCase() === countryIso);
      const providers = Array.isArray(country?.providers) ? country.providers : [];
      return providers.map((entry) => String(entry?.provider || "").trim()).filter(Boolean);
    } catch (error) {
      console.warn("Failed reading active payout configuration", { endpoint, error: error?.message || String(error) });
    }
  }

  return [];
}

function pickProviderFromActiveConfig({ requestedProvider, fallbackCorrespondent, activeProviders }) {
  if (!Array.isArray(activeProviders) || activeProviders.length === 0) {
    return fallbackCorrespondent;
  }

  if (activeProviders.includes(fallbackCorrespondent)) {
    return fallbackCorrespondent;
  }

  const providerHint = String(requestedProvider || "").toUpperCase();
  if (!providerHint) return activeProviders[0];

  const providerByHint = activeProviders.find((entry) => String(entry).toUpperCase().includes(providerHint));
  if (providerByHint) {
    return providerByHint;
  }

  return activeProviders[0];
}

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const {
      payoutId,
      amount,
      currency,
      phoneNumber,
      provider,
      payoutMethod,
      payoutDetails,
      description,
    } = req.body;

    const resolvedMethod = payoutMethod || payoutDetails?.method_type || "mobile_money";
    const resolvedPhone = normalizePhone(phoneNumber || payoutDetails?.phone || payoutDetails?.phone_number);
    const resolvedProvider = resolveProvider(provider, payoutDetails);

    console.log("📤 PawaPay Payout Request:", {
      payoutId,
      amount,
      currency,
      payoutMethod: resolvedMethod,
      provider: resolvedProvider,
    });

    // Validate required fields
    if (!payoutId || !amount) {
      return json(res, 400, { error: "Missing required fields: payoutId, amount" });
    }

    if (resolvedMethod !== "mobile_money") {
      return json(res, 400, {
        error: `Automatic payout is only supported for mobile money. Received method: ${resolvedMethod}`,
      });
    }

    if (!resolvedPhone) {
      return json(res, 400, { error: "Missing required mobile money recipient phone number" });
    }

    // Validate minimum amount (101 RWF)
    if (amount < 101) {
      return json(res, 400, { error: "Minimum payout amount is 101 RWF" });
    }

    // Check if PawaPay is configured
    if (!PAWAPAY_API_KEY) {
      console.error("❌ PawaPay API key not configured");
      return json(res, 500, { error: "Payment provider not configured" });
    }

    const countryCode = detectCountryCode(resolvedPhone);
    const countryIso = extractCountryIso(countryCode);
    const correspondentKey = `${resolvedProvider}_${countryCode}`;
    const configuredCorrespondent =
      PAYOUT_CORRESPONDENTS[correspondentKey] ||
      PAYOUT_CORRESPONDENTS[String(resolvedProvider)] ||
      PAYOUT_CORRESPONDENTS[String(resolvedProvider).toUpperCase()];

    if (!configuredCorrespondent) {
      return json(res, 400, {
        error: `Unsupported mobile money provider: ${resolvedProvider} for country code ${countryCode}`,
      });
    }

    const activeProviders = await fetchActivePayoutProviders(countryIso);
    const correspondent = pickProviderFromActiveConfig({
      requestedProvider: resolvedProvider,
      fallbackCorrespondent: configuredCorrespondent,
      activeProviders,
    });

    if (!correspondent) {
      return json(res, 400, {
        error: `Unsupported mobile money provider: ${resolvedProvider} for country code ${countryCode}`,
      });
    }

    if (activeProviders.length > 0 && !activeProviders.includes(correspondent)) {
      return json(res, 400, {
        error: `No active payout flow available for ${resolvedProvider} in ${countryIso}/${currency || "RWF"}.`,
        activeProviders,
      });
    }

    if (configuredCorrespondent !== correspondent) {
      console.log("🔀 Using active payout provider override", {
        requestedProvider: resolvedProvider,
        configuredCorrespondent,
        selectedCorrespondent: correspondent,
        countryIso,
      });
    }

    // Generate unique payout ID for PawaPay
    const pawapayPayoutId = crypto.randomUUID();

    // Create PawaPay payout request
    const payoutPayload = {
      payoutId: pawapayPayoutId,
      amount: String(amount),
      currency: currency || "RWF",
      correspondent,
      recipient: {
        type: "MSISDN",
        address: { value: resolvedPhone },
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "Merry360 Payout", // Max 22 chars
    };

    console.log("📤 Sending payout to PawaPay:", {
      ...payoutPayload,
      recipient: { ...payoutPayload.recipient, address: { value: "***" } }
    });

    // Call PawaPay Payout API
    const payoutResponse = await fetch(`${PAWAPAY_API_URL}/payouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAWAPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payoutPayload),
    });

    const payoutData = await payoutResponse.json();
    console.log("📥 PawaPay Payout Response:", payoutData);

    // Check for errors
    if (!payoutResponse.ok || payoutData.status === "REJECTED" || payoutData.status === "FAILED") {
      const errorMessage = payoutData.rejectionReason?.rejectionMessage || 
                          payoutData.failureReason?.failureMessage ||
                          payoutData.message || 
                          "Payout failed";
      
      // Mark the payout as rejected so staff can review/retry with corrected details.
      await supabase
        .from("host_payouts")
        .update({
          status: "rejected",
          admin_notes: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      return json(res, 400, { 
        success: false, 
        error: errorMessage,
        pawapayStatus: payoutData.status
      });
    }

    // Payout initiated successfully
    const pawapayStatus = payoutData.status || "ACCEPTED";
    let dbStatus = "processing";
    
    if (pawapayStatus === "COMPLETED") {
      dbStatus = "completed";
    } else if (pawapayStatus === "ACCEPTED" || pawapayStatus === "SUBMITTED" || pawapayStatus === "ENQUEUED") {
      dbStatus = "processing";
    }

    // Update payout record with PawaPay details
    await supabase
      .from("host_payouts")
      .update({
        status: dbStatus,
        pawapay_payout_id: pawapayPayoutId,
        admin_notes: `PawaPay Status: ${pawapayStatus}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutId);

    console.log(`✅ Payout ${payoutId} initiated: PawaPay ID ${pawapayPayoutId}, Status: ${pawapayStatus}`);

    return json(res, 200, {
      success: true,
      payoutId,
      pawapayPayoutId,
      status: dbStatus,
      pawapayStatus,
      message: dbStatus === "completed" ? "Payout completed!" : "Payout is being processed",
    });

  } catch (error) {
    console.error("❌ Payout error:", error);
    return json(res, 500, {
      error: "Payout failed",
      message: error.message,
    });
  }
}
