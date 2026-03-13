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
  MTN_MOMO_RWA: "MTN_MOMO_RWA",
  AIRTEL_RWA: "AIRTEL_RWA",
  MPESA_KEN: "MPESA_KEN",
  MTN_MOMO_UGA: "MTN_MOMO_UGA",
  AIRTEL_OAPI_UGA: "AIRTEL_OAPI_UGA",
  MTN_MOMO_ZMB: "MTN_MOMO_ZMB",
  ZAMTEL_ZMB: "ZAMTEL_ZMB",
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

async function predictProvider(phoneNumber) {
  const endpoints = [
    `${PAWAPAY_API_URL}/predict-provider`,
    `${PAWAPAY_API_URL}/v2/predict-provider`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAWAPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const raw = await response.text();
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = { message: raw };
      }

      if (response.ok) {
        return {
          ok: true,
          phoneNumber: payload?.phoneNumber || phoneNumber,
          provider: payload?.provider || null,
          country: payload?.country || null,
        };
      }

      if (response.status >= 400 && response.status < 500) {
        return {
          ok: false,
          validationError: true,
          error:
            payload?.errorMessage ||
            payload?.message ||
            "Invalid mobile money phone number for payout",
        };
      }
    } catch (error) {
      console.warn("Predict-provider request failed", {
        endpoint,
        error: error?.message || String(error),
      });
    }
  }

  return { ok: false, validationError: false };
}

async function fetchPayoutAvailability(countryIso) {
  const endpoints = [
    `${PAWAPAY_API_URL}/availability?country=${countryIso}&operationType=PAYOUT`,
    `${PAWAPAY_API_URL}/v2/availability?country=${countryIso}&operationType=PAYOUT`,
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
      const countries = Array.isArray(payload) ? payload : [];
      const country = countries.find((entry) => String(entry?.country || "").toUpperCase() === countryIso);
      if (!country) continue;

      const providers = Array.isArray(country?.providers) ? country.providers : [];
      const byProvider = {};
      for (const provider of providers) {
        const code = String(provider?.provider || "").toUpperCase();
        const op = String(provider?.operationTypes?.PAYOUT || "").toUpperCase();
        if (code) byProvider[code] = op;
      }

      return byProvider;
    } catch (error) {
      console.warn("Failed reading payout availability", {
        endpoint,
        error: error?.message || String(error),
      });
    }
  }

  return {};
}

async function fetchActivePayoutProviders(countryIso, requestedCurrency = "RWF") {
  const endpoints = [
    `${PAWAPAY_API_URL}/active-conf?country=${countryIso}&operationType=PAYOUT`,
    `${PAWAPAY_API_URL}/v2/active-conf?country=${countryIso}&operationType=PAYOUT`,
    `${PAWAPAY_API_URL}/active-conf?country=${countryIso}`,
    `${PAWAPAY_API_URL}/v2/active-conf?country=${countryIso}`,
  ];

  let diagnostics = null;

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
      if (!country) continue;

      // Newer shape: countries[].providers[].currencies[].operationTypes.PAYOUT
      const providers = Array.isArray(country?.providers) ? country.providers : [];
      const providersWithPayout = providers
        .filter((providerEntry) => {
          const currencies = Array.isArray(providerEntry?.currencies) ? providerEntry.currencies : [];
          return currencies.some((currencyEntry) => {
            const currencyCode = String(currencyEntry?.currency || "").toUpperCase();
            const operationTypes = currencyEntry?.operationTypes || {};
            return (
              currencyCode === String(requestedCurrency || "RWF").toUpperCase() &&
              Object.prototype.hasOwnProperty.call(operationTypes, "PAYOUT")
            );
          });
        })
        .map((providerEntry) => String(providerEntry?.provider || "").trim())
        .filter(Boolean);

      if (providersWithPayout.length > 0) {
        return { providers: providersWithPayout, diagnostics: null };
      }

      // Legacy shape: countries[].correspondents[].operationTypes[]
      const correspondents = Array.isArray(country?.correspondents) ? country.correspondents : [];
      const correspondentsWithPayout = correspondents
        .filter((entry) => {
          const currencyCode = String(entry?.currency || "").toUpperCase();
          const operationTypes = Array.isArray(entry?.operationTypes) ? entry.operationTypes : [];
          const hasPayout = operationTypes.some(
            (operation) => String(operation?.operationType || "").toUpperCase() === "PAYOUT"
          );
          return currencyCode === String(requestedCurrency || "RWF").toUpperCase() && hasPayout;
        })
        .map((entry) => String(entry?.correspondent || "").trim())
        .filter(Boolean);

      if (correspondentsWithPayout.length > 0) {
        return { providers: correspondentsWithPayout, diagnostics: null };
      }

      diagnostics = {
        country: countryIso,
        currency: String(requestedCurrency || "RWF").toUpperCase(),
        correspondents: correspondents.map((entry) => ({
          correspondent: entry?.correspondent,
          currency: entry?.currency,
          operationTypes: Array.isArray(entry?.operationTypes)
            ? entry.operationTypes.map((operation) => operation?.operationType)
            : [],
        })),
        providers: providers.map((entry) => ({
          provider: entry?.provider,
          currencies: Array.isArray(entry?.currencies)
            ? entry.currencies.map((currencyEntry) => ({
                currency: currencyEntry?.currency,
                operationTypes: Object.keys(currencyEntry?.operationTypes || {}),
              }))
            : [],
        })),
      };
    } catch (error) {
      console.warn("Failed reading active payout configuration", { endpoint, error: error?.message || String(error) });
    }
  }

  return { providers: [], diagnostics };
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

    const predicted = await predictProvider(resolvedPhone);
    if (predicted.validationError) {
      return json(res, 400, {
        success: false,
        error: predicted.error,
      });
    }

    const normalizedPredictedPhone = predicted.ok
      ? normalizePhone(predicted.phoneNumber || resolvedPhone)
      : resolvedPhone;

    const shouldPreferPredictedProvider = ["MTN", "AIRTEL", "mtn_momo", "airtel_money"].includes(
      String(resolvedProvider)
    );
    const providerForRouting =
      shouldPreferPredictedProvider && predicted.ok && predicted.provider
        ? predicted.provider
        : resolvedProvider;

    const countryCode = detectCountryCode(normalizedPredictedPhone);
    const countryIso = extractCountryIso(countryCode);
    const correspondentKey = `${providerForRouting}_${countryCode}`;
    const configuredCorrespondent =
      PAYOUT_CORRESPONDENTS[correspondentKey] ||
      PAYOUT_CORRESPONDENTS[String(providerForRouting)] ||
      PAYOUT_CORRESPONDENTS[String(providerForRouting).toUpperCase()];

    if (!configuredCorrespondent) {
      return json(res, 400, {
        error: `Unsupported mobile money provider: ${providerForRouting} for country code ${countryCode}`,
      });
    }

    const { providers: activeProviders, diagnostics } = await fetchActivePayoutProviders(
      countryIso,
      currency || "RWF"
    );

    if (activeProviders.length === 0) {
      console.warn("PawaPay active payout providers could not be resolved; falling back to configured correspondent", {
        countryIso,
        currency: String(currency || "RWF").toUpperCase(),
        diagnostics,
      });
    }

    const correspondent = pickProviderFromActiveConfig({
      requestedProvider: providerForRouting,
      fallbackCorrespondent: configuredCorrespondent,
      activeProviders,
    });

    if (!correspondent) {
      return json(res, 400, {
        error: `Unsupported mobile money provider: ${providerForRouting} for country code ${countryCode}`,
      });
    }

    if (activeProviders.length > 0 && !activeProviders.includes(correspondent)) {
      return json(res, 400, {
        error: `No active payout flow available for ${providerForRouting} in ${countryIso}/${currency || "RWF"}.`,
        activeProviders,
      });
    }

    const availabilityByProvider = await fetchPayoutAvailability(countryIso);
    const providerAvailability = availabilityByProvider[String(correspondent).toUpperCase()] || "UNKNOWN";
    if (providerAvailability === "CLOSED") {
      return json(res, 409, {
        success: false,
        error: `Payout provider ${correspondent} is currently unavailable (CLOSED). Please retry later or use another provider.`,
        providerAvailability,
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
        address: { value: normalizedPredictedPhone },
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
    const isEnqueued = pawapayStatus === "ENQUEUED" || providerAvailability === "DELAYED";
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
        admin_notes: isEnqueued
          ? `PawaPay Status: ${pawapayStatus}. Provider availability: ${providerAvailability}. Payout queued and will complete once provider resumes.`
          : `PawaPay Status: ${pawapayStatus}. Provider availability: ${providerAvailability}`,
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
      providerAvailability,
      isEnqueued,
      message: dbStatus === "completed"
        ? "Payout completed!"
        : isEnqueued
          ? "Payout accepted and queued due to temporary provider delay"
          : "Payout is being processed",
    });

  } catch (error) {
    console.error("❌ Payout error:", error);
    return json(res, 500, {
      error: "Payout failed",
      message: error.message,
    });
  }
}
