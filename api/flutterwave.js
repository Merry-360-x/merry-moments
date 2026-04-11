import { createClient } from "@supabase/supabase-js";
import {
  buildBrevoSmtpPayload,
  escapeHtml,
  keyValueRows,
  renderMinimalEmail,
  validateRecipientEmail,
} from "../lib/email-template-kit.js";
import { upsertSavedCardMethod } from "../lib/payment-method-storage.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FLW_WEBHOOK_HASH = (process.env.FLW_WEBHOOK_HASH || "").trim();
const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://merry360x.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, verif-hash, verif_hash");
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

function formatMoney(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(dateStr);
  }
}

async function sendFlwGuestEmail(checkout, items, bookingIds, reviewTokens) {
  if (!BREVO_API_KEY) return;
  const recipientCheck = validateRecipientEmail(checkout.email);
  if (!recipientCheck.ok) return;

  const guestName = checkout.name || "Guest";
  const totalAmount = formatMoney(checkout.total_amount, checkout.currency || "USD");
  const receiptNumber = `MRY-${Date.now().toString(36).toUpperCase()}`;
  const singleToken = Array.isArray(reviewTokens) && reviewTokens.length === 1 ? reviewTokens[0]?.review_token : null;
  const reviewUrl = singleToken ? `https://merry360x.com/review/${singleToken}` : `https://merry360x.com/my-bookings`;
  const stars = [1, 2, 3, 4, 5]
    .map((s) => `<a href="${reviewUrl}${reviewUrl.includes("?") ? "&" : "?"}rating=${s}" style="display:inline-block;text-decoration:none;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-right:6px;color:#111827;font-size:13px;">${"★".repeat(s)}</a>`)
    .join("");
  const itemsHtml = items.length > 1
    ? `<div style="margin-bottom:12px;">${items.map((it) => `<p style="margin:0 0 6px;color:#374151;font-size:14px;">• ${escapeHtml(it.title || it.name || "Item")} — ${escapeHtml(formatMoney(it.calculated_price || it.price, it.calculated_price_currency || it.currency || "USD"))}</p>`).join("")}</div>`
    : "";

  const html = renderMinimalEmail({
    eyebrow: "Payment Receipt",
    title: "Booking confirmed",
    subtitle: "Your card payment was successful and your booking is complete.",
    bodyHtml: `${itemsHtml}${keyValueRows([
      { label: "Receipt", value: escapeHtml(receiptNumber) },
      { label: "Guest", value: escapeHtml(guestName) },
      { label: "Amount Paid", value: escapeHtml(totalAmount) },
      { label: "Payment", value: "Card (Flutterwave)" },
      { label: "Status", value: "Paid" },
      { label: "Bookings", value: escapeHtml(String(bookingIds.length)) },
    ])}<div style="margin-top:14px;"><p style="margin:0 0 8px;color:#6b7280;font-size:12px;">Rate your experience:</p>${stars}</div>`,
    ctaText: "View My Bookings",
    ctaUrl: "https://merry360x.com/my-bookings",
  });

  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json" },
      body: JSON.stringify(buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: recipientCheck.email, name: guestName }],
        subject: `Booking Confirmed - ${receiptNumber}`,
        htmlContent: html,
        tags: ["booking", "payment-confirmation", "flutterwave"],
      })),
    });
    console.log(`📧 Flutterwave guest confirmation sent to ${recipientCheck.email}`);
  } catch (err) {
    console.error("❌ Flutterwave guest email failed:", err.message);
  }
}

async function sendFlwHostNotification(supabase, booking, item) {
  if (!BREVO_API_KEY) return;
  try {
    const { hostId, itemTitle, itemType } = await resolveCheckoutItemHostContext(supabase, item);

    if (!hostId) return;

    const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", hostId).single();
    if (!profile) return;

    const hostCheck = validateRecipientEmail(profile.email);
    if (!hostCheck.ok) return;

    const bookingRef = `MRY-${booking.id.slice(0, 8).toUpperCase()}`;
    const html = renderMinimalEmail({
      eyebrow: "New Booking",
      title: "You received a new booking",
      subtitle: `Hi ${escapeHtml(profile.full_name || "Host")}, a guest booked your ${itemType}.`,
      bodyHtml: keyValueRows([
        { label: "Item", value: escapeHtml(itemTitle) },
        { label: "Booking Ref", value: escapeHtml(bookingRef) },
        { label: "Guest", value: escapeHtml(booking.guest_name || "Guest") },
        { label: "Guest Email", value: booking.guest_email ? `<a href="mailto:${escapeHtml(booking.guest_email)}" style="color:#111827;text-decoration:none;">${escapeHtml(booking.guest_email)}</a>` : "—" },
        { label: "Guest Phone", value: booking.guest_phone ? `<a href="tel:${escapeHtml(booking.guest_phone)}" style="color:#111827;text-decoration:none;">${escapeHtml(booking.guest_phone)}</a>` : "—" },
        { label: "Check-in", value: escapeHtml(formatDate(booking.check_in)) },
        { label: "Check-out", value: escapeHtml(formatDate(booking.check_out)) },
        { label: "Guests", value: escapeHtml(String(booking.guests || 1)) },
        { label: "Payment", value: "Card (Flutterwave)" },
      ]),
      ctaText: "Open Host Dashboard",
      ctaUrl: "https://merry360x.com/host-dashboard",
    });

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json" },
      body: JSON.stringify(buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: hostCheck.email, name: profile.full_name || "Host" }],
        subject: `New Booking: ${itemTitle} - ${bookingRef}`,
        htmlContent: html,
        tags: ["booking", "host-notification", "flutterwave"],
      })),
    });
    console.log(`📧 Flutterwave host notification sent to ${hostCheck.email}`);
  } catch (err) {
    console.error("❌ Flutterwave host notification failed:", err.message);
  }
}

async function resolveCheckoutItemHostContext(supabase, item) {
  let hostId = item?.host_id || item?.hostId || null;
  let itemTitle = item?.title || item?.name || "Your Service";
  let itemType = "service";

  if (item?.item_type === "property") {
    const { data: prop } = await supabase.from("properties").select("title, host_id").eq("id", item.reference_id).single();
    if (prop) {
      itemTitle = prop.title;
      itemType = "property";
      hostId = hostId || prop.host_id;
    }
  } else if (item?.item_type === "tour" || item?.item_type === "tour_package") {
    const table = item.item_type === "tour" ? "tours" : "tour_packages";
    const hostField = item.item_type === "tour" ? "created_by" : "host_id";
    const { data: tour } = await supabase.from(table).select(`title, ${hostField}`).eq("id", item.reference_id).single();
    if (tour) {
      itemTitle = tour.title;
      itemType = "tour";
      hostId = hostId || tour[hostField];
    }
  } else if (item?.item_type === "transport_vehicle") {
    const { data: veh } = await supabase.from("transport_vehicles").select("title, owner_id").eq("id", item.reference_id).single();
    if (veh) {
      itemTitle = veh.title;
      itemType = "transport";
      hostId = hostId || veh.owner_id;
    }
  }

  return {
    hostId,
    itemTitle,
    itemType,
  };
}

async function sendFlwPostPaymentEmails(supabase, checkoutData, items, bookingIds) {
  if (!bookingIds || bookingIds.length === 0) return;
  try {
    // Fetch review tokens
    const { data: tokenData } = await supabase.from("bookings").select("id, review_token").in("id", bookingIds);
    const reviewTokens = tokenData || [];

    // Guest confirmation
    await sendFlwGuestEmail(checkoutData, items, bookingIds, reviewTokens);

    // Host notifications
    for (let i = 0; i < bookingIds.length; i++) {
      const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingIds[i]).single();
      if (booking && items[i]) await sendFlwHostNotification(supabase, booking, items[i]);
    }
  } catch (err) {
    console.error("❌ sendFlwPostPaymentEmails error:", err.message);
  }
}

function sanitizeBillingAddress(value) {
  if (!value || typeof value !== "object") return null;

  const line1 = safeStr(value.line1 || value.address1, 160);
  const city = safeStr(value.city, 120);
  const postalCode = safeStr(value.postalCode || value.postal_code || value.zip, 40);
  const country = safeStr(value.countryCode || value.country || value.country_code, 10).toUpperCase();
  const state = safeStr(value.state || value.province, 120);
  const line2 = safeStr(value.line2 || value.address2, 160);

  if (!line1 || !city || !postalCode || !country) return null;

  return {
    line1,
    line2: line2 || undefined,
    city,
    state: state || undefined,
    postal_code: postalCode,
    country,
  };
}

function summarizeFlutterwaveData(data) {
  if (!data || typeof data !== "object") return null;

  const customer = data.customer && typeof data.customer === "object" ? data.customer : null;
  const processorResponse =
    data.processor_response && typeof data.processor_response === "object"
      ? data.processor_response
      : null;

  return {
    id: data.id ?? null,
    tx_ref: data.tx_ref ?? null,
    flw_ref: data.flw_ref ?? null,
    status: data.status ?? null,
    amount: data.amount ?? null,
    currency: data.currency ?? null,
    charged_amount: data.charged_amount ?? null,
    app_fee: data.app_fee ?? null,
    merchant_fee: data.merchant_fee ?? null,
    processor_response: typeof data.processor_response === "string"
      ? data.processor_response
      : processorResponse?.type || null,
    processor_response_code: processorResponse?.code ?? null,
    auth_model: data.auth_model ?? data.payment_type ?? null,
    payment_type: data.payment_type ?? null,
    customer_email: customer?.email ?? null,
    customer_phone: customer?.phone_number ?? customer?.phonenumber ?? null,
    redirect_status: data.redirect_status ?? null,
  };
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
  const createdIds = [];

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

      const { hostId } = await resolveCheckoutItemHostContext(supabase, item);
      if (hostId) {
        bookingData.host_id = hostId;
      }

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

      const { data: inserted } = await supabase.from("bookings").insert(bookingData).select("id").single();
      if (inserted?.id) createdIds.push(inserted.id);
    } catch (error) {
      console.error("Flutterwave booking create error", error);
    }
  }
  return createdIds;
}

async function ensureHostAdjustmentForPostBookingCharge(supabase, charge) {
  if (!charge?.id || !charge?.booking_id) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, host_id")
    .eq("id", charge.booking_id)
    .maybeSingle();

  if (!booking?.host_id) return;

  const amount = safeAmount(charge.amount);
  if (amount <= 0) return;

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
  const html = renderMinimalEmail({
    eyebrow: "Payment Receipt",
    title: "Post-booking payment received",
    subtitle: "Your additional payment has been confirmed successfully.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: "Card (Flutterwave)" },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Status", value: "Paid" },
    ]),
      ctaText: "Open My Bookings",
      ctaUrl: "https://merry360x.com/my-bookings",
  });

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(
      buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: recipient.email, name: guestName }],
        subject: `Payment received - ${amountLabel}`,
        htmlContent: html,
        tags: ["post-booking", "payment-confirmation", "flutterwave"],
      }),
    ),
  }).catch(() => null);
}

async function sendPostBookingHostPaidEmail(supabase, charge, checkoutData) {
  if (!BREVO_API_KEY || !charge?.booking_id) return;

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, host_id, guest_name")
    .eq("id", charge.booking_id)
    .maybeSingle();

  if (!booking?.host_id) return;

  let hostProfile = null;
  const { data: byUserId } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", booking.host_id)
    .maybeSingle();
  hostProfile = byUserId || null;

  if (!hostProfile?.email) {
    const { data: byId } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.host_id)
      .maybeSingle();
    hostProfile = byId || hostProfile;
  }

  const targetEmail = safeStr(hostProfile?.email || "", 160);
  const recipient = validateRecipientEmail(targetEmail);
  if (!recipient.ok) return;

  const amountLabel = formatMoney(charge.amount, charge.currency || "USD");
  const html = renderMinimalEmail({
    eyebrow: "Payment Notice",
    title: "Post-booking charge paid",
    subtitle: "A guest completed a post-booking payment for your booking.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: "Card (Flutterwave)" },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Guest", value: escapeHtml(safeStr(booking.guest_name || "Guest", 120) || "Guest") },
    ]),
    ctaText: "Open Host Dashboard",
    ctaUrl: "https://merry360x.com/host-dashboard",
  });

  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(
      buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: recipient.email, name: safeStr(hostProfile?.full_name || "Host", 120) || "Host" }],
        subject: `Post-booking payment received - ${amountLabel}`,
        htmlContent: html,
        tags: ["post-booking", "host-notice", "payment-confirmation", "flutterwave"],
      }),
    ),
  }).catch(() => null);
}

async function sendPostBookingAdminPaidEmail(supabase, charge) {
  if (!BREVO_API_KEY || !charge?.booking_id) return;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "financial_staff", "operations_staff", "customer_support"]);

  const adminIds = Array.from(new Set((roleRows || []).map((row) => String(row.user_id || "")).filter(Boolean)));
  if (!adminIds.length) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, email, full_name")
    .in("user_id", adminIds);

  const amountLabel = formatMoney(charge.amount, charge.currency || "USD");
  const html = renderMinimalEmail({
    eyebrow: "Post-booking Alert",
    title: "Post-booking payment completed",
    subtitle: "A post-booking charge was paid successfully.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: "Card (Flutterwave)" },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Status", value: "Paid" },
    ]),
    ctaText: "Open Post-Booking Console",
    ctaUrl: "https://merry360x.com/admin/post-booking",
  });

  for (const admin of profiles || []) {
    const targetEmail = safeStr(admin?.email || "", 160);
    const recipient = validateRecipientEmail(targetEmail);
    if (!recipient.ok) continue;

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildBrevoSmtpPayload({
          senderName: "Merry 360 Experiences",
          senderEmail: "support@merry360x.com",
          to: [{ email: recipient.email, name: safeStr(admin?.full_name || "Admin", 120) || "Admin" }],
          subject: `Post-booking payment completed - ${amountLabel}`,
          htmlContent: html,
          tags: ["post-booking", "admin-notice", "payment-confirmation", "flutterwave"],
        }),
      ),
    }).catch(() => null);
  }
}

async function settlePostBookingChargeIfPresent(supabase, checkoutData) {
  const chargeId = safeStr(checkoutData?.metadata?.post_booking_charge_id, 80);
  if (!chargeId) return { handled: false };

  const nowIso = new Date().toISOString();

  const { data: charge, error: chargeErr } = await supabase
    .from("charges")
    .select("id, user_id, booking_id, status, amount, currency")
    .eq("id", chargeId)
    .maybeSingle();

  if (chargeErr || !charge) {
    return {
      handled: true,
      updated: false,
      error: chargeErr?.message || "charge_not_found",
    };
  }

  const wasAlreadyPaid = charge.status === "paid";

  if (charge.status !== "paid") {
    await supabase
      .from("charges")
      .update({
        status: "paid",
        payment_method: "card",
        payment_provider: "flutterwave",
        payment_reference: checkoutData.id,
        paid_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", charge.id);
  }

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
      .update({
        payment_status: "paid",
        updated_at: nowIso,
      })
      .eq("id", linkedModification.id);
  }

  if (!wasAlreadyPaid) {
    try {
      await supabase.from("notifications").insert({
        user_id: charge.user_id,
        title: "Payment successful",
        body: "Your post-booking charge payment was successful.",
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

    try {
      await sendPostBookingHostPaidEmail(supabase, charge, checkoutData);
    } catch (_) {
      // Host email is best effort.
    }

    try {
      await sendPostBookingAdminPaidEmail(supabase, charge);
    } catch (_) {
      // Admin email is best effort.
    }
  }

  return {
    handled: true,
    updated: !wasAlreadyPaid,
    chargeId: charge.id,
    bookingModificationId: linkedModification?.id || null,
  };
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
    billingAddress,
    metadata,
    inline, // true = web inline SDK (skip Flutterwave pre-registration)
  } = req.body || {};

  if (!checkoutId) {
    return json(res, 400, { error: "Checkout ID is required" });
  }

  const total = safeAmount(amount);
  if (total <= 0) {
    return json(res, 400, { error: "Invalid amount" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: checkout, error: checkoutError } = await supabase
    .from("checkout_requests")
    .select("id, name, email, phone, metadata")
    .eq("id", checkoutId)
    .single();

  if (checkoutError || !checkout) {
    return json(res, 404, { error: "Checkout not found" });
  }

  const email = safeStr(payerEmail || checkout?.email, 120);
  if (!email) {
    return json(res, 400, { error: "Payer email is required" });
  }

  const resolvedName = safeStr(payerName || checkout?.name, 80) || "Customer";
  const resolvedPhone =
    safeStr(
      phoneNumber ||
      checkout?.phone ||
      checkout?.metadata?.guest_info?.phone_number ||
      checkout?.metadata?.guest_info?.phone ||
      "",
      30,
    ) || "";

  const txRef = makeTxRef(checkoutId);
  const isInline = inline === true;
  const storedBillingAddress =
    sanitizeBillingAddress(billingAddress) ||
    sanitizeBillingAddress(checkout?.metadata?.billing_address) ||
    sanitizeBillingAddress(checkout?.metadata?.guest_info?.billing_address);

  if (isInline) {
    // Web inline SDK flow: skip Flutterwave API — the SDK handles it directly.
    // Just register the txRef and expected charge details so verify-payment can check them.
    const chargeCurrency = (safeStr(currency, 10) || "USD").toUpperCase();
    const nextMetadata = {
      ...(checkout.metadata || {}),
      payment_provider: "FLUTTERWAVE",
      flutterwave: {
        tx_ref: txRef,
        inline: true,
        charge_amount: total,
        charge_currency: chargeCurrency,
        initialized_at: new Date().toISOString(),
      },
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    };
    await supabase.from("checkout_requests").update({ metadata: nextMetadata }).eq("id", checkoutId);
    return json(res, 200, { success: true, provider: "flutterwave", checkoutId, txRef });
  }

  // Hosted payment flow (Flutter app): call Flutterwave to get a hosted payment link.
  // Flutterwave card payments require a supported currency — RWF is not supported for cards,
  // so convert RWF to USD using Flutterwave's own rates endpoint.
  let chargeAmount = total;
  let chargeCurrency = (safeStr(currency, 10) || "USD").toUpperCase();

  if (chargeCurrency === "RWF") {
    try {
      const rateRes = await fetch(
        `${FLW_BASE_URL}/rates?from=RWF&to=USD&amount=${total}`,
        { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}`, "Content-Type": "application/json" } }
      );
      const rateData = await rateRes.json().catch(() => ({}));
      if (rateData?.status === "success" && rateData?.data?.converted_amount > 0) {
        chargeAmount = Math.round(rateData.data.converted_amount * 100) / 100;
      } else {
        chargeAmount = Math.round((total / 1300) * 100) / 100; // fallback ~1300 RWF/USD
      }
    } catch {
      chargeAmount = Math.round((total / 1300) * 100) / 100;
    }
    chargeCurrency = "USD";
  }

  const callbackUrl =
    safeStr(redirectUrl, 500) ||
    `${APP_BASE_URL}/payment-pending?checkoutId=${encodeURIComponent(checkoutId)}&provider=flutterwave`;

  const payload = {
    tx_ref: txRef,
    amount: chargeAmount,
    currency: chargeCurrency,
    redirect_url: callbackUrl,
    payment_options: "card",
    customer: {
      email,
      name: resolvedName,
      phonenumber: resolvedPhone || undefined,
      phone_number: resolvedPhone || undefined,
      address: storedBillingAddress || undefined,
    },
    customizations: {
      title: "Merry360x",
      description: safeStr(description, 100) || "Payment for booking",
      logo: `${APP_BASE_URL}/brand/logo.png`,
    },
    meta: {
      checkout_id: checkoutId,
      billing_country: storedBillingAddress?.country || undefined,
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
      charge_amount: chargeAmount,
      charge_currency: chargeCurrency,
      init_status: initData?.status ?? null,
      init_message: initData?.message ?? null,
      init_data: summarizeFlutterwaveData(initData?.data),
      billing_address_supplied: Boolean(storedBillingAddress),
      billing_country: storedBillingAddress?.country || null,
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
    // If Flutterwave says the transaction doesn't exist yet (e.g. called too early after
    // redirect), return pending so the client keeps polling rather than treating it as an error.
    const msg = String(verifyData?.message || "").toLowerCase();
    const notFound =
      verifyRes.status === 404 ||
      msg.includes("no transaction") ||
      msg.includes("not found") ||
      msg.includes("invalid id");
    if (notFound) {
      if (checkoutData?.id) {
        const nextMetadata = {
          ...(checkoutData.metadata || {}),
          payment_provider: "FLUTTERWAVE",
          flutterwave: {
            ...((checkoutData.metadata || {}).flutterwave || {}),
            verify_status: "not_found_yet",
            verify_message: verifyData?.message || null,
            verify_http_status: verifyRes.status,
            verify_checked_at: new Date().toISOString(),
          },
        };
        await supabase.from("checkout_requests").update({ metadata: nextMetadata }).eq("id", checkoutData.id);
      }
      return json(res, 200, {
        success: true,
        paymentStatus: "pending",
        checkoutId: checkoutData?.id ?? null,
      });
    }
    if (checkoutData?.id) {
      const nextMetadata = {
        ...(checkoutData.metadata || {}),
        payment_provider: "FLUTTERWAVE",
        flutterwave: {
          ...((checkoutData.metadata || {}).flutterwave || {}),
          verify_status: "error",
          verify_message: verifyData?.message || null,
          verify_http_status: verifyRes.status,
          verify_error: summarizeFlutterwaveData(verifyData?.data),
          verify_checked_at: new Date().toISOString(),
        },
      };
      await supabase.from("checkout_requests").update({ metadata: nextMetadata }).eq("id", checkoutData.id);
    }
    console.error("Flutterwave verify error:", verifyData);
    return json(res, 502, {
      error: "Unable to verify transaction",
      providerResponse: verifyData,
    });
  }

  const txData = verifyData.data || {};
  const mappedStatus = mapFlutterwaveStatus(txData.status);

  if (checkoutData) {
    const txAmount = toNumber(txData.amount);
    const txCurrency = String(txData.currency || "").toUpperCase();

    // Prefer the charge amount/currency stored at initialization (may differ from display
    // currency, e.g. RWF display → USD charge for card payments).
    const storedChargeAmount = toNumber(checkoutData?.metadata?.flutterwave?.charge_amount);
    const storedChargeCurrency = checkoutData?.metadata?.flutterwave?.charge_currency
      ? String(checkoutData.metadata.flutterwave.charge_currency).toUpperCase()
      : null;
    const expectedAmount = storedChargeAmount ?? toNumber(checkoutData.total_amount);
    const expectedCurrency = storedChargeCurrency ?? String(checkoutData.currency || "RWF").toUpperCase();

    const amountMatches =
      expectedAmount !== null &&
      txAmount !== null &&
      Math.abs(expectedAmount - txAmount) < 1; // allow ±1 unit for rounding
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
        auth_model: txData.auth_model ?? null,
        processor_response: txData.processor_response ?? null,
        customer: txData.customer ?? null,
        card: txData.card ?? null,
        redirect_status: txData.redirect_status ?? null,
        amount_matches: amountMatches,
        currency_matches: currencyMatches,
        verify_status: "success",
        verify_message: verifyData?.message ?? null,
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
      const mergedCheckout = { ...checkoutData, metadata: nextMetadata };
      await upsertSavedCardMethod({
        supabase,
        checkoutData: mergedCheckout,
        txData,
        source: "flutterwave_verify",
      });
      await settlePostBookingChargeIfPresent(supabase, mergedCheckout);
      const createdIds = await createBookingsForPaidCheckout(supabase, mergedCheckout);
      const items = nextMetadata?.items || [];
      await sendFlwPostPaymentEmails(supabase, mergedCheckout, items, createdIds);
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
  if (req.method === "GET" || req.method === "HEAD") {
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, verif-hash, verif_hash");
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    return json(res, 200, {
      success: true,
      provider: "flutterwave",
      route: "webhook",
      status: "ready",
    });
  }

  // Verify webhook authenticity via secret hash header
  const incomingHash = req.headers?.["verif-hash"] || req.headers?.["verif_hash"] || "";
  if (!FLW_WEBHOOK_HASH || incomingHash !== FLW_WEBHOOK_HASH) {
    return json(res, 200, {
      success: true,
      acknowledged: true,
      skipped: "Invalid or missing webhook signature",
    });
  }

  const payload = req.body || {};
  const event = safeStr(payload.event, 60);

  // Process both charge.completed and charge.failed/charge.cancelled so failed
  // transactions (e.g. 3DS timeouts, declines) update the checkout status immediately.
  const isChargeEvent = event === "charge.completed" || event === "charge.failed" || event === "charge.cancelled";
  if (!isChargeEvent) {
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

  const txAmount = toNumber(txData.amount);
  const txCurrency = String(txData.currency || "").toUpperCase();

  // Prefer the charge amount/currency stored at initialization (may differ from the
  // display currency, e.g. RWF display → USD charge for card payments).
  const storedChargeAmount = toNumber(checkoutData?.metadata?.flutterwave?.charge_amount);
  const storedChargeCurrency = checkoutData?.metadata?.flutterwave?.charge_currency
    ? String(checkoutData.metadata.flutterwave.charge_currency).toUpperCase()
    : null;
  const expectedAmount = storedChargeAmount ?? toNumber(checkoutData.total_amount);
  const expectedCurrency = storedChargeCurrency ?? String(checkoutData.currency || "RWF").toUpperCase();

  const amountMatches =
    expectedAmount !== null &&
    txAmount !== null &&
    Math.abs(expectedAmount - txAmount) < 1; // allow ±1 unit for rounding
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
      auth_model: txData.auth_model ?? null,
      processor_response: txData.processor_response ?? null,
      customer: txData.customer ?? null,
      card: txData.card ?? null,
      redirect_status: txData.redirect_status ?? null,
      amount_matches: amountMatches,
      currency_matches: currencyMatches,
      webhook_event: event,
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
    const mergedCheckout = { ...checkoutData, metadata: nextMetadata };
    await upsertSavedCardMethod({
      supabase,
      checkoutData: mergedCheckout,
      txData,
      source: "flutterwave_webhook",
    });
    await settlePostBookingChargeIfPresent(supabase, mergedCheckout);
    const createdIds = await createBookingsForPaidCheckout(supabase, mergedCheckout);
    const items = nextMetadata?.items || [];
    await sendFlwPostPaymentEmails(supabase, mergedCheckout, items, createdIds);
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

  if (req.method !== "POST" && req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    // Always check both body and query string for `action`.
    // The vercel.json rewrite adds ?action=webhook to incoming Flutterwave webhook calls,
    // but Flutterwave's POST body contains only event/data — never an `action` field.
    // Without checking req.query the webhook route silently returned 400 "Invalid action".
    const bodySource = req.method === "POST" ? (req.body || {}) : {};
    const querySource = req.query || {};
    const action = safeStr(bodySource?.action || querySource?.action, 40);

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
