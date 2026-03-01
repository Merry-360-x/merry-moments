import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_BASE_URL = process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

      if (existingBooking && existingBooking.length > 0) {
        continue;
      }

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
      console.error("Failed creating booking item after Flutterwave success", error);
    }
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!FLW_SECRET_KEY) {
    return json(res, 500, { error: "Flutterwave is not configured" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Server configuration error" });
  }

  const transactionId = req.query?.transaction_id;
  const txRef = req.query?.tx_ref || req.query?.txRef;
  const checkoutId = req.query?.checkoutId;

  if (!transactionId && !txRef) {
    return json(res, 400, { error: "transaction_id or tx_ref is required" });
  }

  try {
    const verifyUrl = transactionId
      ? `${FLW_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`
      : `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;

    const flwRes = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
      },
    });

    const flwData = await flwRes.json().catch(() => ({}));
    if (!flwRes.ok) {
      return json(res, 502, {
        error: flwData?.message || "Unable to verify Flutterwave payment",
        providerResponse: flwData,
      });
    }

    const txData = flwData?.data || {};
    const paymentStatus = mapFlutterwaveStatus(txData?.status);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resolvedCheckoutId = checkoutId || txData?.meta?.checkout_id || txData?.meta?.checkoutId;

    let checkoutData = null;
    if (resolvedCheckoutId) {
      const { data: existingCheckout } = await supabase
        .from("checkout_requests")
        .select("id, user_id, name, email, phone, payment_status, total_amount, currency, metadata")
        .eq("id", resolvedCheckoutId)
        .single();

      checkoutData = existingCheckout;

      if (checkoutData) {
        const expectedAmount = toNumber(checkoutData.total_amount);
        const txAmount = toNumber(txData?.amount);
        const expectedCurrency = String(checkoutData.currency || "RWF").toUpperCase();
        const txCurrency = String(txData?.currency || "").toUpperCase();

        const amountMatches = expectedAmount !== null && txAmount !== null && Math.round(expectedAmount) === Math.round(txAmount);
        const currencyMatches = expectedCurrency === txCurrency;
        const safePaymentStatus = paymentStatus === "paid" && amountMatches && currencyMatches ? "paid" : (paymentStatus === "paid" ? "failed" : paymentStatus);

        const nextMetadata = {
          ...(checkoutData.metadata || {}),
          payment_provider: "FLUTTERWAVE",
          flutterwave: {
            ...((checkoutData.metadata || {}).flutterwave || {}),
            tx_ref: txData?.tx_ref || txRef || null,
            transaction_id: txData?.id || transactionId || null,
            status: txData?.status || null,
            amount: txData?.amount ?? null,
            currency: txData?.currency ?? null,
            amount_matches: amountMatches,
            currency_matches: currencyMatches,
            verified_at: new Date().toISOString(),
          },
        };

        await supabase
          .from("checkout_requests")
          .update({
            payment_status: safePaymentStatus,
            payment_method: "card",
            metadata: nextMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", resolvedCheckoutId);

        if (safePaymentStatus === "paid" && checkoutData.payment_status !== "paid") {
          await createBookingsForPaidCheckout(supabase, checkoutData);
        }

        return json(res, 200, {
          success: true,
          provider: "flutterwave",
          checkoutId: resolvedCheckoutId || null,
          txRef: txData?.tx_ref || txRef || null,
          transactionId: txData?.id || transactionId || null,
          flutterwaveStatus: txData?.status || null,
          paymentStatus: safePaymentStatus,
          amount: txData?.amount || null,
          currency: txData?.currency || null,
          amountMatches,
          currencyMatches,
          raw: txData,
        });
      }
    }

    return json(res, 200, {
      success: true,
      provider: "flutterwave",
      checkoutId: resolvedCheckoutId || null,
      txRef: txData?.tx_ref || txRef || null,
      transactionId: txData?.id || transactionId || null,
      flutterwaveStatus: txData?.status || null,
      paymentStatus,
      amount: txData?.amount || null,
      currency: txData?.currency || null,
      raw: txData,
    });
  } catch (error) {
    console.error("Flutterwave verify error", error);
    return json(res, 500, {
      error: "Failed to verify payment",
      message: error?.message || "Unexpected error",
    });
  }
}
