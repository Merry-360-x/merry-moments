import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_BASE_URL = process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";
const FLW_WEBHOOK_SECRET_HASH = process.env.FLW_WEBHOOK_SECRET_HASH || process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, verif-hash, x-flutterwave-signature");
  res.end(JSON.stringify(body));
}

function mapFlutterwaveStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "successful") return "paid";
  if (normalized === "failed" || normalized === "cancelled") return "failed";
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
        payment_method: "card",
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
        bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split("T")[0];
        bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split("T")[0];
      } else if (item.item_type === "transport_vehicle") {
        bookingData.booking_type = "transport";
        bookingData.transport_id = item.reference_id;
        bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split("T")[0];
        bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split("T")[0];
      } else {
        continue;
      }

      await supabase.from("bookings").insert(bookingData);
    } catch (error) {
      console.error("Flutterwave webhook booking create error", error);
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, verif-hash, x-flutterwave-signature");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FLW_SECRET_KEY) {
    return json(res, 500, { error: "Server configuration error" });
  }

  try {
    const receivedHash = req.headers["verif-hash"] || req.headers["x-flutterwave-signature"];
    if (FLW_WEBHOOK_SECRET_HASH && receivedHash !== FLW_WEBHOOK_SECRET_HASH) {
      return json(res, 401, { error: "Invalid webhook signature" });
    }

    const event = req.body || {};
    const eventData = event.data || {};
    const txRef = eventData.tx_ref || event.tx_ref;
    const transactionId = eventData.id || event.id;

    if (!txRef && !transactionId) {
      return json(res, 400, { error: "Missing transaction reference" });
    }

    const verifyUrl = transactionId
      ? `${FLW_BASE_URL}/transactions/${encodeURIComponent(String(transactionId))}/verify`
      : `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(String(txRef))}`;

    const verifyRes = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok) {
      console.error("Flutterwave webhook verify failed", verifyData);
      return json(res, 502, { error: "Unable to verify transaction", providerResponse: verifyData });
    }

    const tx = verifyData?.data || {};
    const checkoutId = tx?.meta?.checkout_id || tx?.meta?.checkoutId || null;
    if (!checkoutId) {
      return json(res, 200, { success: true, acknowledged: true, skipped: "No checkout_id in metadata" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: checkoutData } = await supabase
      .from("checkout_requests")
      .select("id, user_id, name, email, phone, total_amount, currency, payment_status, metadata")
      .eq("id", checkoutId)
      .single();

    if (!checkoutData) {
      return json(res, 200, { success: true, acknowledged: true, skipped: "Checkout not found" });
    }

    const expectedAmount = toNumber(checkoutData.total_amount);
    const txAmount = toNumber(tx.amount);
    const expectedCurrency = String(checkoutData.currency || "RWF").toUpperCase();
    const txCurrency = String(tx.currency || "").toUpperCase();

    const amountMatches = expectedAmount !== null && txAmount !== null && Math.round(expectedAmount) === Math.round(txAmount);
    const currencyMatches = expectedCurrency === txCurrency;

    const mappedStatus = mapFlutterwaveStatus(tx.status);
    const paymentStatus = mappedStatus === "paid" && amountMatches && currencyMatches ? "paid" : (mappedStatus === "paid" ? "failed" : mappedStatus);

    const nextMetadata = {
      ...(checkoutData.metadata || {}),
      payment_provider: "FLUTTERWAVE",
      flutterwave: {
        ...((checkoutData.metadata || {}).flutterwave || {}),
        tx_ref: tx.tx_ref || txRef || null,
        transaction_id: tx.id || transactionId || null,
        status: tx.status || null,
        amount: tx.amount ?? null,
        currency: tx.currency ?? null,
        amount_matches: amountMatches,
        currency_matches: currencyMatches,
        webhook_received_at: new Date().toISOString(),
      },
    };

    await supabase
      .from("checkout_requests")
      .update({
        payment_status: paymentStatus,
        payment_method: "card",
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutId);

    if (paymentStatus === "paid" && checkoutData.payment_status !== "paid") {
      await createBookingsForPaidCheckout(supabase, checkoutData);
    }

    return json(res, 200, {
      success: true,
      acknowledged: true,
      checkoutId,
      paymentStatus,
      flutterwaveStatus: tx.status || null,
      amountMatches,
      currencyMatches,
    });
  } catch (error) {
    console.error("Flutterwave webhook error", error);
    return json(res, 500, { error: "Webhook processing failed", message: error?.message || "Unexpected error" });
  }
}
