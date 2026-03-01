import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_BASE_URL = process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://merry360x.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function safeStr(x, max = 200) {
  const s = typeof x === "string" ? x.trim() : "";
  return s.length > max ? s.slice(0, max) : s;
}

function safeAmount(x) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function buildTxRef(checkoutId) {
  const clean = safeStr(checkoutId, 80) || "checkout";
  const rand = Math.random().toString(36).slice(2, 10);
  return `merry-${clean}-${Date.now()}-${rand}`;
}

export default async function handler(req, res) {
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

  if (!FLW_SECRET_KEY) {
    return json(res, 500, { error: "Flutterwave is not configured" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Server configuration error" });
  }

  try {
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

    const safeTotal = safeAmount(amount);
    if (safeTotal <= 0) {
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

    const txRef = buildTxRef(checkoutId);
    const callbackUrl =
      safeStr(redirectUrl, 500) || `${APP_BASE_URL}/payment-pending?checkoutId=${encodeURIComponent(checkoutId)}&provider=flutterwave`;

    const payload = {
      tx_ref: txRef,
      amount: String(safeTotal),
      currency: safeStr(currency, 10) || "RWF",
      redirect_url: callbackUrl,
      payment_options: "card",
      customer: {
        email,
        phonenumber: safeStr(phoneNumber, 30) || undefined,
        name: safeStr(payerName, 80) || "Customer",
      },
      customizations: {
        title: "Merry360x Booking Payment",
        description: safeStr(description, 160) || "Card payment for booking",
      },
      meta: {
        checkout_id: checkoutId,
        ...(metadata && typeof metadata === "object" ? metadata : {}),
      },
    };

    const flwRes = await fetch(`${FLW_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const flwData = await flwRes.json().catch(() => ({}));

    if (!flwRes.ok || flwData?.status !== "success" || !flwData?.data?.link) {
      console.error("Flutterwave create payment error:", flwData);
      return json(res, 502, {
        error: flwData?.message || "Failed to initialize Flutterwave payment",
        providerResponse: flwData,
      });
    }

    const nextMetadata = {
      ...(checkout.metadata || {}),
      payment_provider: "FLUTTERWAVE",
      flutterwave: {
        tx_ref: txRef,
        checkout_link: flwData.data.link,
        initialized_at: new Date().toISOString(),
      },
    };

    await supabase
      .from("checkout_requests")
      .update({ metadata: nextMetadata })
      .eq("id", checkoutId);

    return json(res, 200, {
      success: true,
      provider: "flutterwave",
      checkoutId,
      txRef,
      link: flwData.data.link,
      flutterwaveStatus: flwData.status,
      flutterwaveMessage: flwData.message,
      data: flwData.data,
    });
  } catch (error) {
    console.error("Flutterwave init error:", error);
    return json(res, 500, {
      error: "Failed to initialize payment",
      message: error?.message || "Unexpected error",
    });
  }
}
