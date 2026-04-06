import { createClient } from "@supabase/supabase-js";
import {
  buildBrevoSmtpPayload,
  escapeHtml,
  keyValueRows,
  renderMinimalEmail,
  validateRecipientEmail,
} from "../lib/email-template-kit.js";
import { upsertSavedMobileMoneyMethod } from "../lib/payment-method-storage.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.pawapay.cloud";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function parsePawaPayResponse(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  return payload || null;
}

function mapPawaPayPayoutStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return "completed";
  if (normalized === "FAILED" || normalized === "REJECTED" || normalized === "CANCELLED") return "rejected";
  return "processing";
}

function buildPayoutErrorMessage(payoutData) {
  return (
    payoutData?.rejectionReason?.rejectionMessage ||
    payoutData?.failureReason?.failureMessage ||
    payoutData?.errorMessage ||
    payoutData?.message ||
    "Payout failed"
  );
}

function formatMoneyRwf(amount) {
  const num = Number(amount || 0);
  return `${Math.round(num).toLocaleString("en-US")} RWF`;
}

function buildPayoutResultEmailHtml({ status, amount, currency, method, reason }) {
  const statusLabel = status === "completed" ? "Completed" : "Rejected";
  const methodLabel = method === "mobile_money" ? "Mobile Money" : "Bank Transfer";
  const details = keyValueRows([
    { label: "Amount", value: escapeHtml(formatMoneyRwf(amount)) },
    { label: "Method", value: escapeHtml(methodLabel) },
    { label: "Status", value: escapeHtml(statusLabel) },
    { label: "Updated", value: escapeHtml(new Date().toLocaleString("en-US")) },
    { label: "Reason", value: escapeHtml(reason || "N/A") },
  ]);

  return renderMinimalEmail({
    eyebrow: "Payout Update",
    title: status === "completed" ? "Your payout is complete" : "Your payout could not be completed",
    subtitle:
      status === "completed"
        ? "Funds have been sent to your selected payout method."
        : "Your payout request was not completed. Please review details and request again if needed.",
    bodyHtml: details,
    ctaText: "Open Host Dashboard",
    ctaUrl: "https://merry360x.com/host-dashboard",
  });
}

async function sendHostPayoutStatusEmail({ toEmail, toName, status, amount, currency, method, reason }) {
  if (!BREVO_API_KEY) return { skipped: true, reason: "BREVO_API_KEY missing" };

  const recipient = validateRecipientEmail(toEmail);
  if (!recipient.ok) return { skipped: true, reason: "Invalid recipient" };

  const htmlContent = buildPayoutResultEmailHtml({ status, amount, currency, method, reason });
  const subject =
    status === "completed"
      ? `Payout Completed: ${formatMoneyRwf(amount)}`
      : `Payout Update: ${formatMoneyRwf(amount)}`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(
      buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: recipient.email, name: toName || "Host" }],
        subject,
        htmlContent,
        tags: ["payout", "payout-status"],
      })
    ),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Brevo request failed (${response.status})`);
  }

  return { sent: true };
}

async function ensureHostAdjustmentForPostBookingCharge(supabase, charge) {
  if (!charge?.id || !charge?.booking_id) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, host_id")
    .eq("id", charge.booking_id)
    .maybeSingle();

  if (!booking?.host_id) return;

  const amount = Number(charge.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return;

  await supabase
    .from("host_earnings_adjustments")
    .upsert(
      {
        host_id: booking.host_id,
        amount,
        currency: safeStr(charge.currency || "USD", 12).toUpperCase(),
        reason: `Post-booking charge paid (${String(charge.id).slice(0, 8)})`,
        reference_key: `post_booking_charge_paid_${charge.id}`,
        created_by: null,
      },
      { onConflict: "reference_key", ignoreDuplicates: true },
    );
}

async function sendPostBookingGuestPaidEmail(supabase, charge, checkoutData) {
  if (!BREVO_API_KEY || !charge?.booking_id) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, guest_email, guest_name")
    .eq("id", charge.booking_id)
    .maybeSingle();

  const fallbackEmail = safeStr(checkoutData?.email || "", 160);
  const targetEmail = safeStr(booking?.guest_email || fallbackEmail, 160);
  const recipient = validateRecipientEmail(targetEmail);
  if (!recipient.ok) return;

  const guestName = safeStr(booking?.guest_name || checkoutData?.name || "Guest", 120) || "Guest";
  const amountLabel = formatMoney(charge.amount, charge.currency || "USD");
  const htmlContent = renderMinimalEmail({
    eyebrow: "Payment Receipt",
    title: "Post-booking payment received",
    subtitle: "Your additional mobile-money payment has been confirmed.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: "Mobile Money (PawaPay)" },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Status", value: "Paid" },
    ]),
    ctaText: "Open Post-Booking Center",
    ctaUrl: "https://merry360x.com/post-booking",
  });

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(
      buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: recipient.email, name: guestName }],
        subject: `Payment received - ${amountLabel}`,
        htmlContent,
        tags: ["post-booking", "payment-confirmation", "pawapay"],
      })
    ),
  }).catch(() => null);
}

async function syncPostBookingChargeFromCheckout(supabase, checkoutData, paymentStatus) {
  const chargeId = checkoutData?.metadata?.post_booking_charge_id;
  if (!chargeId) return { handled: false };

  const nowIso = new Date().toISOString();

  const { data: charge } = await supabase
    .from("charges")
    .select("id, user_id, booking_id, status, amount, currency")
    .eq("id", chargeId)
    .maybeSingle();

  if (!charge) return { handled: true, updated: false, reason: "charge_not_found" };

  if (paymentStatus === "paid") {
    await supabase
      .from("charges")
      .update({
        status: "paid",
        payment_method: "mobile_money",
        payment_provider: "pawapay",
        payment_reference: checkoutData.id,
        paid_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", charge.id);

    const { data: mods } = await supabase
      .from("booking_modifications")
      .select("*")
      .eq("charge_id", charge.id)
      .eq("status", "accepted")
      .limit(1);

    const linkedModification = Array.isArray(mods) && mods.length ? mods[0] : null;

    if (linkedModification) {
      await supabase
        .from("bookings")
        .update({
          check_in: linkedModification.new_check_in || linkedModification.old_check_in,
          check_out: linkedModification.new_check_out || linkedModification.old_check_out,
          total_price: linkedModification.new_price,
          ...(linkedModification.new_property_id ? { property_id: linkedModification.new_property_id } : {}),
        })
        .eq("id", linkedModification.booking_id);

      await supabase
        .from("booking_modifications")
        .update({ payment_status: "paid", updated_at: nowIso })
        .eq("id", linkedModification.id);
    }

    try {
      await supabase.from("notifications").insert({
        user_id: charge.user_id,
        title: "Payment successful",
        body: "Your post-booking mobile money payment was successful.",
        notification_type: "payment_success",
        channel: "in_app",
        data: {
          charge_id: charge.id,
          booking_id: charge.booking_id,
          checkout_id: checkoutData.id,
        },
      });
    } catch (_) {
      // Notification is best effort.
    }

    try {
      await ensureHostAdjustmentForPostBookingCharge(supabase, charge);
    } catch (_) {
      // Host adjustment is best effort.
    }

    try {
      await sendPostBookingGuestPaidEmail(supabase, charge, checkoutData);
    } catch (_) {
      // Guest email is best effort.
    }

    return { handled: true, updated: true, chargeId: charge.id, bookingModificationId: linkedModification?.id || null };
  }

  if (paymentStatus === "failed") {
    await supabase
      .from("charges")
      .update({
        status: "failed",
        payment_method: "mobile_money",
        payment_provider: "pawapay",
        payment_reference: checkoutData.id,
        failed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", charge.id);

    try {
      await supabase.from("notifications").insert({
        user_id: charge.user_id,
        title: "Payment failed",
        body: "Your post-booking mobile money payment failed. Please retry.",
        notification_type: "payment_failed",
        channel: "in_app",
        data: {
          charge_id: charge.id,
          booking_id: charge.booking_id,
          checkout_id: checkoutData.id,
        },
      });
    } catch (_) {
      // Notification is best effort.
    }
  }

  return { handled: true, updated: false };
}

async function fetchPawaPayPayout(pawapayPayoutId) {
  const url = `${PAWAPAY_BASE_URL}/payouts/${pawapayPayoutId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAWAPAY_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { message: text };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: parsed?.errorMessage || parsed?.message || `PawaPay request failed (${response.status})`,
      payload: parsed,
    };
  }

  return {
    ok: true,
    payload: parsePawaPayResponse(parsed),
  };
}

async function syncPayoutStatuses(req, res, supabase) {
  const syncAll = String(req.query.syncAll || "").toLowerCase() === "1" || String(req.query.syncAll || "").toLowerCase() === "true";
  const limit = Number(req.query.limit || 25);
  const payoutId = req.query.payoutId || null;

  let payoutsToCheck = [];

  if (syncAll) {
    const { data, error } = await supabase
      .from("host_payouts")
      .select("id, host_id, amount, currency, payout_method, status, pawapay_payout_id")
      .eq("status", "processing")
      .not("pawapay_payout_id", "is", null)
      .order("updated_at", { ascending: true })
      .limit(Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 25);

    if (error) throw error;
    payoutsToCheck = data || [];
  } else if (payoutId) {
    const { data, error } = await supabase
      .from("host_payouts")
      .select("id, host_id, amount, currency, payout_method, status, pawapay_payout_id")
      .eq("id", payoutId)
      .single();

    if (error) throw error;
    payoutsToCheck = data ? [data] : [];
  } else {
    return json(res, 400, { error: "Provide payoutId or syncAll=1" });
  }

  const results = [];
  let updatedCount = 0;

  for (const payout of payoutsToCheck) {
    if (!payout?.pawapay_payout_id) {
      results.push({ id: payout?.id, updated: false, reason: "Missing pawapay_payout_id" });
      continue;
    }

    const providerResult = await fetchPawaPayPayout(payout.pawapay_payout_id);
    if (!providerResult.ok) {
      results.push({
        id: payout.id,
        updated: false,
        status: payout.status,
        pawapayPayoutId: payout.pawapay_payout_id,
        error: providerResult.error,
      });
      continue;
    }

    const providerPayload = providerResult.payload || {};
    const pawapayStatus = String(providerPayload.status || "").toUpperCase();
    const nextStatus = mapPawaPayPayoutStatus(pawapayStatus);
    const shouldUpdate = payout.status !== nextStatus;

    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from("host_payouts")
        .update({
          status: nextStatus,
          admin_notes:
            nextStatus === "rejected"
              ? `PawaPay Status: ${pawapayStatus}. ${buildPayoutErrorMessage(providerPayload)}`
              : pawapayStatus === "ENQUEUED"
                ? "PawaPay Status: ENQUEUED. Payout is queued and will complete once provider resumes."
                : `PawaPay Status: ${pawapayStatus || "UNKNOWN"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payout.id);

      if (updateError) {
        results.push({
          id: payout.id,
          updated: false,
          status: payout.status,
          pawapayStatus,
          error: updateError.message,
        });
        continue;
      }

      updatedCount += 1;

      if (payout.status === "processing" && (nextStatus === "completed" || nextStatus === "rejected")) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", payout.host_id)
            .single();

          const reason = nextStatus === "rejected" ? buildPayoutErrorMessage(providerPayload) : null;
          await sendHostPayoutStatusEmail({
            toEmail: profile?.email,
            toName: profile?.full_name,
            status: nextStatus,
            amount: payout.amount,
            currency: payout.currency,
            method: payout.payout_method,
            reason,
          });
        } catch (emailError) {
          console.warn("Host payout status email failed", {
            payoutId: payout.id,
            error: emailError?.message || String(emailError),
          });
        }
      }
    }

    results.push({
      id: payout.id,
      updated: shouldUpdate,
      previousStatus: payout.status,
      status: nextStatus,
      pawapayStatus,
    });
  }

  return json(res, 200, {
    success: true,
    checkedCount: payoutsToCheck.length,
    updatedCount,
    results,
  });
}

/**
 * Vercel serverless function to check payment status from PawaPay
 * This provides an alternative to callbacks - directly querying PawaPay
 * 
 * GET /api/pawapay-check-status?depositId=xxx&checkoutId=xxx
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const { action, depositId, checkoutId, bookingId } = req.query;
  const orderId = checkoutId || bookingId; // Support both

  if (!PAWAPAY_API_KEY) {
    console.error("Missing PawaPay API token");
    return json(res, 500, { error: "Server configuration error" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Supabase configuration missing" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (action === "sync-payouts") {
    return syncPayoutStatuses(req, res, supabase);
  }

  if (!depositId) {
    return json(res, 400, { error: "Missing depositId parameter" });
  }

  try {
    // Query PawaPay for payment status
    const pawapayUrl = `${PAWAPAY_BASE_URL}/deposits/${depositId}`;
    
    console.log(`Checking payment status at: ${pawapayUrl}`);
    
    const response = await fetch(pawapayUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${PAWAPAY_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const responseText = await response.text();
    console.log("PawaPay status response:", responseText);

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

    if (!response.ok) {
      console.error("PawaPay API error:", pawaPayData);
      return json(res, response.status, { 
        error: pawaPayData.errorMessage || "Failed to check payment status",
        code: pawaPayData.errorCode
      });
    }

    // Get the payment status from PawaPay
    // PawaPay returns an array for deposits endpoint
    const depositData = Array.isArray(pawaPayData) ? pawaPayData[0] : pawaPayData;
    const pawapayStatus = depositData?.status;
    const failureReason = depositData?.failureReason;

    console.log(`📊 PawaPay raw response for ${depositId}:`, JSON.stringify(depositData, null, 2));
    console.log(`📊 Extracted status: ${pawapayStatus}, failureReason:`, failureReason || 'none');

    // Extract human-readable failure message
    let failureMessage = null;
    if (failureReason) {
      const code = failureReason.failureCode || failureReason.code;
      const message = failureReason.failureMessage || failureReason.errorMessage;
      
      console.log(`Failure detected - Code: ${code}, Message: ${message}`);
      
      // Map common failure codes to user-friendly messages
      if (code === 'INSUFFICIENT_BALANCE' || code === 'PAYER_LIMIT_REACHED' || code === 'INSUFFICIENT_FUNDS') {
        failureMessage = 'Insufficient balance. Please recharge your mobile money account and try again.';
      } else if (code === 'PAYER_NOT_FOUND' || code === 'INVALID_PAYER') {
        failureMessage = 'Mobile money account not found. Please check your phone number.';
      } else if (code === 'TRANSACTION_DECLINED' || code === 'USER_DECLINED' || code === 'DECLINED') {
        failureMessage = 'Payment was declined. Please try again or use a different payment method.';
      } else if (code === 'TIMEOUT' || code === 'EXPIRED') {
        failureMessage = 'Payment request expired. Please try again.';
      } else if (code === 'DUPLICATE_TRANSACTION') {
        failureMessage = 'Duplicate transaction detected. Please wait or contact support.';
      } else if (code === 'CANCELLED' || code === 'USER_CANCELLED') {
        failureMessage = 'Payment was cancelled. Please try again if you wish to complete the booking.';
      } else if (message) {
        failureMessage = message;
      } else {
        failureMessage = 'Payment could not be completed. Please try again or use a different payment method.';
      }
    }
    
    // Also check if status itself indicates failure
    if (!failureMessage) {
      if (pawapayStatus === 'FAILED' || pawapayStatus === 'REJECTED') {
        failureMessage = 'Payment could not be completed. Please try again or use a different payment method.';
      } else if (pawapayStatus === 'CANCELLED') {
        failureMessage = 'Payment was cancelled. Please try again if you wish to complete the booking.';
      }
    }

    // If we have an order ID and Supabase credentials, update the checkout
    if (orderId) {

      // Map PawaPay status to our system
      let paymentStatus = "pending";

      if (pawapayStatus === "COMPLETED") {
        paymentStatus = "paid";
      } else if (pawapayStatus === "FAILED" || pawapayStatus === "REJECTED" || pawapayStatus === "CANCELLED") {
        paymentStatus = "failed";
      } else if (pawapayStatus === "SUBMITTED" || pawapayStatus === "ACCEPTED") {
        paymentStatus = "pending";
      }

      // Fetch full checkout to get items for booking creation
      const { data: checkoutData, error: checkoutFetchError } = await supabase
        .from("checkout_requests")
        .select("id, user_id, email, phone, payment_status, metadata, currency")
        .eq("id", orderId)
        .single();

      // Update the checkout request
      const { error: updateError } = await supabase
        .from("checkout_requests")
        .update({
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to update checkout:", updateError);
      } else {
        console.log(`Checkout ${orderId} updated: payment=${paymentStatus}`);
      }

      if (checkoutData) {
        try {
          await syncPostBookingChargeFromCheckout(supabase, checkoutData, paymentStatus);
        } catch (syncErr) {
          console.warn("Post-booking charge sync failed", {
            checkoutId: checkoutData.id,
            error: syncErr?.message || String(syncErr),
          });
        }
      }

      // Create bookings if payment completed and not already created
      if (paymentStatus === "paid" && checkoutData && checkoutData.payment_status !== "paid") {
        await upsertSavedMobileMoneyMethod({
          supabase,
          checkoutData,
          providerHint: checkoutData?.metadata?.payment_provider || depositData?.correspondent || null,
          phoneNumberHint: depositData?.payer?.address?.value || checkoutData?.phone || null,
          depositId,
          correspondent: depositData?.correspondent || null,
          source: "pawapay_status_check",
        });

        console.log("📦 Creating bookings from checkout items (via status check)...");
        const items = checkoutData.metadata?.items || [];
        const bookingDetails = checkoutData.metadata?.booking_details;
        
        for (const item of items) {
          try {
            // Check if booking already exists
            const { data: existingBooking } = await supabase
              .from("bookings")
              .select("id")
              .eq("order_id", orderId)
              .eq(item.item_type === 'property' ? "property_id" : item.item_type === 'transport_vehicle' ? "transport_id" : "tour_id", item.reference_id)
              .limit(1);

            if (existingBooking && existingBooking.length > 0) {
              console.log(`⏭️ Booking already exists for item ${item.reference_id}`);
              continue;
            }

            const bookingData = {
              guest_id: checkoutData.user_id,
              guest_name: checkoutData.metadata?.guest_info?.name || null,
              guest_email: checkoutData.email,
              guest_phone: checkoutData.metadata?.guest_info?.phone || null,
              order_id: checkoutData.id,
              total_price: item.calculated_price || item.price,
              currency: item.calculated_price_currency || item.currency || checkoutData.currency || 'RWF',
              status: 'pending',
              confirmation_status: 'pending',
              payment_status: 'paid',
              payment_method: 'mobile_money',
              guests: bookingDetails?.guests || item.metadata?.guests || 1,
              review_token: crypto.randomUUID(),
            };

            // Set booking_type for proper dashboard filtering
            if (item.item_type === 'property') {
              bookingData.booking_type = 'property';
              bookingData.property_id = item.reference_id;
              bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in;
              bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out;
            } else if (item.item_type === 'tour' || item.item_type === 'tour_package') {
              bookingData.booking_type = 'tour';
              bookingData.tour_id = item.reference_id;
              bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
              bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
            } else if (item.item_type === 'transport_vehicle') {
              bookingData.booking_type = 'transport';
              bookingData.transport_id = item.reference_id;
              bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
              bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
            }

            const { data: booking, error: bookingError } = await supabase
              .from("bookings")
              .insert(bookingData)
              .select("id")
              .single();

            if (bookingError) {
              console.error("❌ Failed to create booking:", bookingError);
            } else {
              console.log(`✅ Booking created: ${booking.id}`);
            }
          } catch (bookingErr) {
            console.error("❌ Booking creation error:", bookingErr);
          }
        }
      }

      return json(res, 200, {
        success: true,
        depositId,
        pawapayStatus,
        paymentStatus,
        failureMessage,
        depositData
      });
    }

    // Just return the PawaPay status if no booking update needed
    return json(res, 200, {
      success: true,
      depositId,
      pawapayStatus,
      depositData
    });

  } catch (error) {
    console.error("Status check error:", error);
    return json(res, 500, {
      error: "Status check failed",
      message: error.message
    });
  }
}
