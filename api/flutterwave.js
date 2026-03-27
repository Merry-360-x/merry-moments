import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_WEBHOOK_HASH = process.env.FLW_WEBHOOK_HASH;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://merry360x.com";

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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function makeTxRef(checkoutId) {
  const slug = String(checkoutId).replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  return `mry-${slug}-${Date.now().toString(36)}`.slice(0, 100);
}

function mapFlutterwaveStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "successful") return "paid";
  if (s === "failed" || s === "cancelled") return "failed";
  return "pending";
}

async function flwGet(path) {
  const res = await fetch(`${FLW_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return res;
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
        payment_method: "flutterwave",
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
      console.error("Flutterwave booking create error", error);
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

  const txRef = makeTxRef(checkoutId);

  const callbackUrl =
    safeStr(redirectUrl, 500) ||
    `${APP_BASE_URL}/payment-pending?checkoutId=${encodeURIComponent(checkoutId)}&provider=flutterwave`;

  const [firstName, ...rest] = safeStr(payerName, 80).split(/\s+/).filter(Boolean);
  const lastName = rest.join(" ") || "Customer";

  const payload = {
    tx_ref: txRef,
    amount: total,
    currency: safeStr(currency, 10) || "RWF",
    redirect_url: callbackUrl,
    customer: {
      email,
      name: safeStr(payerName, 80) || "Customer",
      phonenumber: safeStr(phoneNumber, 30) || undefined,
    },
    customizations: {
      title: "Merry360x",
      description: safeStr(description, 100) || "Payment for booking",
      logo: `${APP_BASE_URL}/brand/logo.png`,
    },
    meta: {
      checkout_id: checkoutId,
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    },
  };

  const initRes = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const initData = await initRes.json().catch(() => ({}));

  if (!initRes.ok || initData?.status !== "success" || !initData?.data?.link) {
    console.error("Flutterwave create payment error:", initData);
    return json(res, 502, {
      error: initData?.message || "Failed to initialize Flutterwave payment",
      providerResponse: initData,
    });
  }

  const hostedLink = initData.data.link;

  const nextMetadata = {
    ...(checkout.metadata || {}),
    payment_provider: "FLUTTERWAVE",
    flutterwave: {
      tx_ref: txRef,
      link: hostedLink,
      initialized_at: new Date().toISOString(),
    },
    ...(metadata && typeof metadata === "object" ? metadata : {}),
  };

  await supabase.from("checkout_requests").update({ metadata: nextMetadata }).eq("id", checkoutId);

  return json(res, 200, {
    success: true,
    provider: "flutterwave",
    checkoutId,
    txRef,
    link: hostedLink,
    redirectUrl: hostedLink,
    data: initData.data,
  });
}

async function handleVerifyPayment(req, res) {
  const source = req.method === "POST" ? (req.body || {}) : (req.query || {});
  const { checkoutId } = source;
  const transactionId = safeStr(source.transaction_id || source.transactionId, 80);
  const txRef = safeStr(source.tx_ref || source.txRef, 100);

  if (!checkoutId && !transactionId && !txRef) {
    return json(res, 400, { error: "checkoutId, transaction_id, or tx_ref is required" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let checkoutData = null;

  if (checkoutId) {
    const { data } = await supabase
      .from("checkout_requests")
      .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
      .eq("id", checkoutId)
      .single();
    checkoutData = data || null;
  }

  // Verify with Flutterwave
  let verifyRes, verifyData;

  if (transactionId) {
    verifyRes = await flwGet(`/transactions/${encodeURIComponent(transactionId)}/verify`);
  } else if (txRef) {
    verifyRes = await flwGet(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  } else if (checkoutData?.metadata?.flutterwave?.tx_ref) {
    verifyRes = await flwGet(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(checkoutData.metadata.flutterwave.tx_ref)}`
    );
  } else {
    return json(res, 400, { error: "Cannot determine transaction reference for verification" });
  }

  verifyData = await verifyRes.json().catch(() => ({}));

  if (!verifyRes.ok || verifyData?.status !== "success") {
    console.error("Flutterwave verify error:", verifyData);
    return json(res, 502, {
      error: "Unable to verify transaction",
      providerResponse: verifyData,
    });
  }

  const txData = verifyData.data || {};
  const mappedStatus = mapFlutterwaveStatus(txData.status);

  if (checkoutData) {
    const expectedAmount = toNumber(checkoutData.total_amount);
    const txAmount = toNumber(txData.amount);
    const expectedCurrency = String(checkoutData.currency || "RWF").toUpperCase();
    const txCurrency = String(txData.currency || "").toUpperCase();

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
      payment_provider: "FLUTTERWAVE",
      flutterwave: {
        ...((checkoutData.metadata || {}).flutterwave || {}),
        transaction_id: txData.id ?? null,
        tx_ref: txData.tx_ref ?? txRef ?? null,
        flutterwave_ref: txData.flw_ref ?? null,
        status: txData.status ?? null,
        amount: txData.amount ?? null,
        currency: txData.currency ?? null,
        payment_type: txData.payment_type ?? null,
        amount_matches: amountMatches,
        currency_matches: currencyMatches,
        verified_at: new Date().toISOString(),
      },
    };

    await supabase
      .from("checkout_requests")
      .update({
        payment_status: paymentStatus,
        payment_method: "flutterwave",
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutData.id);

    if (paymentStatus === "paid" && checkoutData.payment_status !== "paid") {
      await createBookingsForPaidCheckout(supabase, { ...checkoutData, metadata: nextMetadata });
    }

    return json(res, 200, {
      success: true,
      checkoutId: checkoutData.id,
      paymentStatus,
      flutterwaveStatus: txData.status ?? null,
      amountMatches,
      currencyMatches,
      data: txData,
    });
  }

  return json(res, 200, {
    success: true,
    paymentStatus: mappedStatus,
    flutterwaveStatus: txData.status ?? null,
    data: txData,
  });
}

async function handleWebhook(req, res) {
  // Verify webhook authenticity via secret hash header
  const incomingHash = req.headers?.["verif-hash"] || req.headers?.["verif_hash"] || "";
  if (!FLW_WEBHOOK_HASH || incomingHash !== FLW_WEBHOOK_HASH) {
    return json(res, 401, { error: "Unauthorized" });
  }

  const payload = req.body || {};
  const event = safeStr(payload.event, 60);

  if (event !== "charge.completed") {
    // Acknowledge non-charge events without processing
    return json(res, 200, { success: true, acknowledged: true, skipped: `event type: ${event}` });
  }

  const txData = payload.data || {};
  const txRef = safeStr(txData.tx_ref, 100);
  const flwStatus = safeStr(txData.status, 20);
  const mappedStatus = mapFlutterwaveStatus(flwStatus);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let checkoutData = null;

  // Find checkout by tx_ref stored in metadata
  if (txRef) {
    const { data } = await supabase
      .from("checkout_requests")
      .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
      .contains("metadata", { flutterwave: { tx_ref: txRef } })
      .limit(1);

    checkoutData = Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  if (!checkoutData) {
    // Try to find by checkout_id in meta
    const metaCheckoutId = safeStr(txData.meta?.checkout_id || txData.meta?.metaCheckoutId, 80);
    if (metaCheckoutId) {
      const { data } = await supabase
        .from("checkout_requests")
        .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
        .eq("id", metaCheckoutId)
        .single();
      checkoutData = data || null;
    }
  }

  if (!checkoutData) {
    return json(res, 200, {
      success: true,
      acknowledged: true,
      skipped: "Checkout not found",
      txRef,
    });
  }

  const expectedAmount = toNumber(checkoutData.total_amount);
  const txAmount = toNumber(txData.amount);
  const expectedCurrency = String(checkoutData.currency || "RWF").toUpperCase();
  const txCurrency = String(txData.currency || "").toUpperCase();

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
    payment_provider: "FLUTTERWAVE",
    flutterwave: {
      ...((checkoutData.metadata || {}).flutterwave || {}),
      transaction_id: txData.id ?? null,
      tx_ref: txRef || null,
      flutterwave_ref: txData.flw_ref ?? null,
      status: flwStatus || null,
      amount: txData.amount ?? null,
      currency: txData.currency ?? null,
      payment_type: txData.payment_type ?? null,
      amount_matches: amountMatches,
      currency_matches: currencyMatches,
      webhook_received_at: new Date().toISOString(),
    },
  };

  await supabase
    .from("checkout_requests")
    .update({
      payment_status: paymentStatus,
      payment_method: "flutterwave",
      metadata: nextMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkoutData.id);

  if (paymentStatus === "paid" && checkoutData.payment_status !== "paid") {
    await createBookingsForPaidCheckout(supabase, { ...checkoutData, metadata: nextMetadata });
  }

  return json(res, 200, {
    success: true,
    acknowledged: true,
    checkoutId: checkoutData.id,
    paymentStatus,
    flutterwaveStatus: flwStatus || null,
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Server configuration error" });
  }

  if (!FLW_SECRET_KEY) {
    return json(res, 500, { error: "Flutterwave is not configured" });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const source = req.method === "POST" ? (req.body || {}) : (req.query || {});
    const action = safeStr(source?.action, 40);

    if (action === "webhook") {
      return await handleWebhook(req, res);
    }

    if (action === "create-payment") {
      if (req.method !== "POST") return json(res, 405, { error: "POST required" });
      return await handleCreatePayment(req, res);
    }

    if (action === "verify-payment") {
      return await handleVerifyPayment(req, res);
    }

    if (action === "health") {
      return json(res, 200, {
        success: true,
        provider: "flutterwave",
        status: "ok",
        configured: Boolean(FLW_SECRET_KEY),
        timestamp: new Date().toISOString(),
      });
    }

    return json(res, 400, { error: "Invalid action" });
  } catch (error) {
    console.error("Flutterwave handler error:", error);
    return json(res, 500, { error: "Internal server error" });
  }
}
