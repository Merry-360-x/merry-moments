import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || "https://pay.pesapal.com/v3";
const PESAPAL_IPN_ID = process.env.PESAPAL_IPN_ID;
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://merry360x.com";

let resolvedPesapalIpnId = safeStr(PESAPAL_IPN_ID, 120) || null;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function safeStr(value, max = 200) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function safeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function sanitizeMerchantReference(value) {
  // Pesapal allows: alphanumeric, dash, underscore, dot, colon. Max 50.
  const raw = safeStr(value, 120);
  const cleaned = raw.replace(/[^A-Za-z0-9\-_.:]/g, "-");
  return cleaned.length > 50 ? cleaned.slice(0, 50) : cleaned;
}

async function getPesapalToken() {
  const authRes = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  });

  const authData = await authRes.json().catch(() => ({}));
  if (!authRes.ok || !authData?.token) {
    const message = authData?.message || "Unable to authenticate with Pesapal";
    const err = new Error(message);
    err.providerResponse = authData;
    throw err;
  }

  return authData.token;
}

function extractIpnId(payload) {
  return (
    safeStr(payload?.ipn_id, 120) ||
    safeStr(payload?.notification_id, 120) ||
    safeStr(payload?.ipnId, 120) ||
    safeStr(payload?.id, 120) ||
    null
  );
}

async function registerPesapalIpn(token) {
  const listenerUrl = `${APP_BASE_URL}/api/pesapal-ipn`;
  const registerRes = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: listenerUrl,
      ipn_notification_type: "POST",
    }),
  });

  const registerData = await registerRes.json().catch(() => ({}));
  if (!registerRes.ok) {
    const message = registerData?.message || "Unable to register Pesapal IPN URL";
    const err = new Error(message);
    err.providerResponse = registerData;
    throw err;
  }

  const ipnId = extractIpnId(registerData);
  if (!ipnId) {
    const err = new Error("Pesapal IPN registration succeeded but no IPN ID was returned");
    err.providerResponse = registerData;
    throw err;
  }

  return {
    ipnId,
    listenerUrl,
    providerResponse: registerData,
  };
}

async function ensurePesapalIpnId(token) {
  if (resolvedPesapalIpnId) return resolvedPesapalIpnId;
  const registration = await registerPesapalIpn(token);
  resolvedPesapalIpnId = registration.ipnId;
  return resolvedPesapalIpnId;
}

function mapPesapalStatus(statusDescription) {
  const normalized = String(statusDescription || "").toUpperCase();
  if (normalized === "COMPLETED") return "paid";
  if (normalized === "FAILED" || normalized === "INVALID" || normalized === "REVERSED") return "failed";
  return "pending";
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function createBookingsForPaidCheckout(supabase, checkoutData) {
  const items = checkoutData?.metadata?.items || [];
  const bookingDetails = checkoutData?.metadata?.booking_details;

  for (const item of items) {
    try {
      const relationField =
        item.item_type === "property"
          ? "property_id"
          : item.item_type === "transport_vehicle"
            ? "transport_id"
            : "tour_id";

      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("order_id", checkoutData.id)
        .eq(relationField, item.reference_id)
        .limit(1);

      if (existingBooking && existingBooking.length > 0) continue;

      const bookingData = {
        guest_id: checkoutData.user_id,
        guest_name: checkoutData.metadata?.guest_info?.name || checkoutData.name || null,
        guest_email: checkoutData.email || checkoutData.metadata?.guest_info?.email || null,
        guest_phone: checkoutData.metadata?.guest_info?.phone || checkoutData.phone || null,
        order_id: checkoutData.id,
        total_price: item.calculated_price || item.price,
        currency: item.calculated_price_currency || item.currency || checkoutData.currency || "RWF",
        status: "pending",
        confirmation_status: "pending",
        payment_status: "paid",
        payment_method: "pesapal",
        guests: bookingDetails?.guests || item.metadata?.guests || 1,
        review_token: crypto.randomUUID(),
      };

      if (item.item_type === "property") {
        bookingData.booking_type = "property";
        bookingData.property_id = item.reference_id;
        bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in;
        bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out;
      } else if (item.item_type === "tour" || item.item_type === "tour_package") {
        bookingData.booking_type = "tour";
        bookingData.tour_id = item.reference_id;
        bookingData.check_in =
          bookingDetails?.check_in ||
          item.metadata?.check_in ||
          new Date().toISOString().split("T")[0];
        bookingData.check_out =
          bookingDetails?.check_out ||
          item.metadata?.check_out ||
          new Date().toISOString().split("T")[0];
      } else if (item.item_type === "transport_vehicle") {
        bookingData.booking_type = "transport";
        bookingData.transport_id = item.reference_id;
        bookingData.check_in =
          bookingDetails?.check_in ||
          item.metadata?.check_in ||
          new Date().toISOString().split("T")[0];
        bookingData.check_out =
          bookingDetails?.check_out ||
          item.metadata?.check_out ||
          new Date().toISOString().split("T")[0];
      } else {
        continue;
      }

      await supabase.from("bookings").insert(bookingData);
    } catch (error) {
      console.error("Pesapal booking create error", error);
    }
  }
}

async function handleCreatePayment(req, res) {
  const {
    checkoutId,
    amount,
    currency,
    payerName,
    payerEmail,
    phoneNumber,
    billingAddress,
    description,
    redirectUrl,
    metadata,
  } = req.body || {};

  if (!checkoutId) {
    return json(res, 400, { error: "Checkout ID is required" });
  }

  const total = safeAmount(amount);
  if (total <= 0) {
    return json(res, 400, { error: "Invalid amount" });
  }

  const email = safeStr(payerEmail, 120);
  if (!email) {
    return json(res, 400, { error: "Payer email is required" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: checkout, error: checkoutError } = await supabase
    .from("checkout_requests")
    .select("id, metadata")
    .eq("id", checkoutId)
    .single();

  if (checkoutError || !checkout) {
    return json(res, 404, { error: "Checkout not found" });
  }

  const merchantReference = sanitizeMerchantReference(
    `mry:${String(checkoutId).slice(0, 12)}:${Date.now().toString(36)}`
  );

  const callbackUrl =
    safeStr(redirectUrl, 500) ||
    `${APP_BASE_URL}/payment-pending?checkoutId=${encodeURIComponent(checkoutId)}&provider=pesapal`;

  const token = await getPesapalToken();
  const notificationId = await ensurePesapalIpnId(token);

  const [firstName, ...rest] = safeStr(payerName, 80).split(/\s+/).filter(Boolean);
  const lastName = rest.join(" ") || "Customer";
  const sourceBilling =
    (billingAddress && typeof billingAddress === "object" ? billingAddress : null) ||
    (checkout?.metadata?.billing_address && typeof checkout.metadata.billing_address === "object"
      ? checkout.metadata.billing_address
      : null) ||
    (checkout?.metadata?.guest_info?.billing_address && typeof checkout.metadata.guest_info.billing_address === "object"
      ? checkout.metadata.guest_info.billing_address
      : null) ||
    {};

  const billingCountry = safeStr(sourceBilling.countryCode || sourceBilling.country_code, 3).toUpperCase();
  const billingAddressLine1 = safeStr(sourceBilling.line1 || sourceBilling.address_line_1 || sourceBilling.addressLine1, 120);
  const billingAddressLine2 = safeStr(sourceBilling.line2 || sourceBilling.address_line_2 || sourceBilling.addressLine2, 120);
  const billingCity = safeStr(sourceBilling.city, 80);
  const billingPostalCode = safeStr(sourceBilling.postalCode || sourceBilling.postal_code, 40);
  const billingPhone = safeStr(sourceBilling.phoneNumber || sourceBilling.phone_number, 30);
  const billingFirstName = safeStr(sourceBilling.firstName || sourceBilling.first_name, 80);
  const billingLastName = safeStr(sourceBilling.lastName || sourceBilling.last_name, 80);

  const orderPayload = {
    id: merchantReference,
    currency: safeStr(currency, 10) || "RWF",
    amount: total,
    description: safeStr(description, 100) || "Payment for booking",
    callback_url: callbackUrl,
    notification_id: notificationId,
    billing_address: {
      email_address: email,
      phone_number: billingPhone || safeStr(phoneNumber, 30) || undefined,
      first_name: billingFirstName || firstName || "Customer",
      last_name: billingLastName || lastName,
      country_code: billingCountry || undefined,
      address_line_1: billingAddressLine1 || undefined,
      address_line_2: billingAddressLine2 || undefined,
      city: billingCity || undefined,
      postal_code: billingPostalCode || undefined,
    },
  };

  const submitRes = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderPayload),
  });

  const submitData = await submitRes.json().catch(() => ({}));
  if (!submitRes.ok || !submitData?.redirect_url || !submitData?.order_tracking_id) {
    console.error("Pesapal submit order error:", submitData);
    return json(res, 502, {
      error: submitData?.message || "Failed to initialize Pesapal payment",
      providerResponse: submitData,
    });
  }

  const nextMetadata = {
    ...(checkout.metadata || {}),
    payment_provider: "PESAPAL",
    pesapal: {
      merchant_reference: merchantReference,
      order_tracking_id: submitData.order_tracking_id,
      redirect_url: submitData.redirect_url,
      initialized_at: new Date().toISOString(),
    },
    ...(metadata && typeof metadata === "object" ? metadata : {}),
  };

  await supabase.from("checkout_requests").update({ metadata: nextMetadata }).eq("id", checkoutId);

  return json(res, 200, {
    success: true,
    provider: "pesapal",
    checkoutId,
    merchantReference,
    orderTrackingId: submitData.order_tracking_id,
    redirectUrl: submitData.redirect_url,
    data: submitData,
  });
}

async function handleCheckStatus(req, res) {
  const { checkoutId, orderTrackingId } = req.body || {};

  if (!checkoutId && !orderTrackingId) {
    return json(res, 400, { error: "checkoutId or orderTrackingId is required" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let checkoutData = null;
  let trackingId = safeStr(orderTrackingId, 80);

  if (checkoutId) {
    const { data } = await supabase
      .from("checkout_requests")
      .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
      .eq("id", checkoutId)
      .single();

    checkoutData = data || null;
    trackingId = trackingId || safeStr(data?.metadata?.pesapal?.order_tracking_id, 80);
  }

  if (!trackingId) {
    return json(res, 400, { error: "Missing orderTrackingId" });
  }

  const token = await getPesapalToken();

  const statusRes = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const statusData = await statusRes.json().catch(() => ({}));
  if (!statusRes.ok) {
    console.error("Pesapal status error:", statusData);
    return json(res, 502, { error: "Unable to fetch transaction status", providerResponse: statusData });
  }

  const mappedStatus = mapPesapalStatus(statusData?.payment_status_description);

  if (checkoutData) {
    const expectedAmount = toNumber(checkoutData.total_amount);
    const txAmount = toNumber(statusData.amount);
    const expectedCurrency = String(checkoutData.currency || "RWF").toUpperCase();
    const txCurrency = String(statusData.currency || "").toUpperCase();

    const amountMatches =
      expectedAmount !== null &&
      txAmount !== null &&
      Math.round(expectedAmount) === Math.round(txAmount);
    const currencyMatches = expectedCurrency === txCurrency;

    const paymentStatus =
      mappedStatus === "paid" && amountMatches && currencyMatches
        ? "paid"
        : mappedStatus === "paid"
          ? "failed"
          : mappedStatus;

    const nextMetadata = {
      ...(checkoutData.metadata || {}),
      payment_provider: "PESAPAL",
      pesapal: {
        ...((checkoutData.metadata || {}).pesapal || {}),
        order_tracking_id: trackingId,
        payment_status_description: statusData.payment_status_description || null,
        status_code: statusData.status_code ?? null,
        amount: statusData.amount ?? null,
        currency: statusData.currency ?? null,
        confirmation_code: statusData.confirmation_code ?? null,
        payment_method: statusData.payment_method ?? null,
        amount_matches: amountMatches,
        currency_matches: currencyMatches,
        checked_at: new Date().toISOString(),
      },
    };

    await supabase
      .from("checkout_requests")
      .update({
        payment_status: paymentStatus,
        payment_method: "pesapal",
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutData.id);

    if (paymentStatus === "paid" && checkoutData.payment_status !== "paid") {
      await createBookingsForPaidCheckout(supabase, checkoutData);
    }

    return json(res, 200, {
      success: true,
      checkoutId: checkoutData.id,
      paymentStatus,
      orderTrackingId: trackingId,
      providerStatus: statusData.payment_status_description || null,
      amountMatches,
      currencyMatches,
      data: statusData,
    });
  }

  return json(res, 200, {
    success: true,
    orderTrackingId: trackingId,
    paymentStatus: mappedStatus,
    providerStatus: statusData.payment_status_description || null,
    data: statusData,
  });
}

async function handleIpn(req, res) {
  const payload = req.method === "POST" ? (req.body || {}) : (req.query || {});

  const trackingId = safeStr(payload?.OrderTrackingId || payload?.orderTrackingId, 80);
  const merchantRef = safeStr(payload?.OrderMerchantReference || payload?.orderMerchantReference, 80);

  if (!trackingId && !merchantRef) {
    return json(res, 400, { error: "Missing OrderTrackingId/OrderMerchantReference" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let checkoutData = null;

  if (merchantRef) {
    const { data } = await supabase
      .from("checkout_requests")
      .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
      .contains("metadata", { pesapal: { merchant_reference: merchantRef } })
      .limit(1);

    checkoutData = Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  if (!checkoutData && trackingId) {
    const { data } = await supabase
      .from("checkout_requests")
      .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
      .contains("metadata", { pesapal: { order_tracking_id: trackingId } })
      .limit(1);

    checkoutData = Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  const token = await getPesapalToken();
  const statusRes = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const statusData = await statusRes.json().catch(() => ({}));
  if (!statusRes.ok) {
    return json(res, 502, { error: "Unable to fetch transaction status", providerResponse: statusData });
  }

  const mappedStatus = mapPesapalStatus(statusData?.payment_status_description);

  if (!checkoutData) {
    return json(res, 200, {
      success: true,
      acknowledged: true,
      skipped: "Checkout not found",
      orderTrackingId: trackingId,
      merchantReference: merchantRef || null,
      paymentStatus: mappedStatus,
    });
  }

  const expectedAmount = toNumber(checkoutData.total_amount);
  const txAmount = toNumber(statusData.amount);
  const expectedCurrency = String(checkoutData.currency || "RWF").toUpperCase();
  const txCurrency = String(statusData.currency || "").toUpperCase();

  const amountMatches = expectedAmount !== null && txAmount !== null && Math.round(expectedAmount) === Math.round(txAmount);
  const currencyMatches = expectedCurrency === txCurrency;

  const paymentStatus = mappedStatus === "paid" && amountMatches && currencyMatches ? "paid" : (mappedStatus === "paid" ? "failed" : mappedStatus);

  const nextMetadata = {
    ...(checkoutData.metadata || {}),
    payment_provider: "PESAPAL",
    pesapal: {
      ...((checkoutData.metadata || {}).pesapal || {}),
      order_tracking_id: trackingId,
      merchant_reference: merchantRef || (checkoutData.metadata || {})?.pesapal?.merchant_reference || null,
      payment_status_description: statusData.payment_status_description || null,
      status_code: statusData.status_code ?? null,
      amount: statusData.amount ?? null,
      currency: statusData.currency ?? null,
      confirmation_code: statusData.confirmation_code ?? null,
      payment_method: statusData.payment_method ?? null,
      amount_matches: amountMatches,
      currency_matches: currencyMatches,
      ipn_received_at: new Date().toISOString(),
    },
  };

  await supabase
    .from("checkout_requests")
    .update({
      payment_status: paymentStatus,
      payment_method: "pesapal",
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkoutData.id);

  if (paymentStatus === "paid" && checkoutData.payment_status !== "paid") {
    await createBookingsForPaidCheckout(supabase, checkoutData);
  }

  return json(res, 200, {
    success: true,
    acknowledged: true,
    checkoutId: checkoutData.id,
    orderTrackingId: trackingId,
    paymentStatus,
    providerStatus: statusData.payment_status_description || null,
    amountMatches,
    currencyMatches,
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Server configuration error" });
  }

  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    return json(res, 500, { error: "Pesapal is not configured" });
  }

  try {
    const source = req.method === "POST" ? req.body : req.query;
    const action = safeStr(source?.action, 40);

    if (action === "ipn") {
      return await handleIpn(req, res);
    }

    if (action === "health") {
      const token = await getPesapalToken();
      let ipnStatus = "configured";
      let ipnId = resolvedPesapalIpnId;
      if (!ipnId) {
        try {
          ipnId = await ensurePesapalIpnId(token);
          ipnStatus = "auto-registered";
        } catch (ipnError) {
          ipnStatus = "missing";
          console.warn("Pesapal IPN check warning", ipnError?.providerResponse || ipnError);
        }
      }

      return json(res, 200, {
        success: true,
        provider: "pesapal",
        status: "ok",
        baseUrl: PESAPAL_BASE_URL,
        ipnStatus,
        ipnId,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "register-ipn") {
      const token = await getPesapalToken();
      const registration = await registerPesapalIpn(token);
      resolvedPesapalIpnId = registration.ipnId;
      return json(res, 200, {
        success: true,
        provider: "pesapal",
        status: "ipn-registered",
        ipnId: registration.ipnId,
        listenerUrl: registration.listenerUrl,
        providerResponse: registration.providerResponse,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "create-payment") {
      return await handleCreatePayment(req, res);
    }

    if (action === "check-status") {
      return await handleCheckStatus(req, res);
    }

    return json(res, 400, { error: "Invalid action" });
  } catch (error) {
    console.error("Pesapal handler error", error?.providerResponse || error);
    return json(res, 500, { error: "Request failed", message: error?.message || "Unexpected error" });
  }
}
