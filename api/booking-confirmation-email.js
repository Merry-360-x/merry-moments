// API endpoint to send booking confirmation email to guests
import { createClient } from "@supabase/supabase-js";
import { buildBrevoSmtpPayload, escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(amount, currency = "RWF") {
  if (!amount) return "—";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function paymentLabel(paymentStatus) {
  const normalized = String(paymentStatus || "").toLowerCase();
  return normalized === "paid" ? "Paid" : "Not Paid";
}

function paymentBadgeColor(paymentStatus) {
  const normalized = String(paymentStatus || "").toLowerCase();
  return normalized === "paid"
    ? { bg: "#dcfce7", text: "#166534" }
    : { bg: "#fee2e2", text: "#991b1b" };
}

async function resolveHostAndItem(supabase, booking) {
  let hostId = null;
  let itemTitle = "Booking";

  if (booking.booking_type === "property" && booking.property_id) {
    const { data } = await supabase
      .from("properties")
      .select("title, host_id")
      .eq("id", booking.property_id)
      .single();
    if (data) {
      hostId = data.host_id;
      itemTitle = data.title || itemTitle;
    }
  } else if (booking.booking_type === "tour" && booking.tour_id) {
    const { data: pkg } = await supabase
      .from("tour_packages")
      .select("title, host_id")
      .eq("id", booking.tour_id)
      .single();

    if (pkg?.host_id) {
      hostId = pkg.host_id;
      itemTitle = pkg.title || itemTitle;
    } else {
      const { data: tour } = await supabase
        .from("tours")
        .select("title, created_by")
        .eq("id", booking.tour_id)
        .single();
      if (tour) {
        hostId = tour.created_by;
        itemTitle = tour.title || itemTitle;
      }
    }
  } else if (booking.booking_type === "transport" && booking.transport_id) {
    const { data } = await supabase
      .from("transport_vehicles")
      .select("title, owner_id, created_by")
      .eq("id", booking.transport_id)
      .single();
    if (data) {
      hostId = data.owner_id || data.created_by;
      itemTitle = data.title || itemTitle;
    }
  }

  if (!hostId) return null;

  let profile = null;

  const profileById = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", hostId)
    .single();

  profile = profileById.data;

  if (profileById.error || !profile?.email) {
    const profileByUserId = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", hostId)
      .single();
    profile = profileByUserId.data || profile;
  }

  if (!profile?.email) return null;

  return {
    hostEmail: profile.email,
    hostName: profile.full_name || "Host",
    itemTitle,
  };
}

function generateHostPaymentStatusHtml({ resolved, booking, source, effectivePaymentStatus }) {
  const statusLabel = paymentLabel(effectivePaymentStatus);
  const statusColors = paymentBadgeColor(effectivePaymentStatus);
  const bodyHtml = `
    <p style="margin:0 0 12px;color:#374151;font-size:14px;">Hi ${escapeHtml(resolved.hostName)}, the payment state of a booking has changed.</p>
    ${keyValueRows([
      { label: "Item", value: escapeHtml(resolved.itemTitle) },
      { label: "Booking ID", value: escapeHtml(booking.id) },
      { label: "Order ID", value: escapeHtml(booking.order_id || "—") },
      { label: "Guest", value: escapeHtml(booking.guest_name || "Guest") },
      { label: "Amount", value: escapeHtml(formatMoney(booking.total_price, booking.currency || "RWF")) },
      { label: "Dates", value: `${escapeHtml(booking.check_in || "-")} → ${escapeHtml(booking.check_out || "-")}` },
      { label: "Status", value: `<span style="display:inline-block;background:${statusColors.bg};color:${statusColors.text};padding:4px 10px;border-radius:999px;font-weight:600;">${escapeHtml(statusLabel)}</span>` },
      { label: "Source", value: escapeHtml(source || "system") },
    ])}
    <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">Raw payment state: ${escapeHtml(String(effectivePaymentStatus).toUpperCase())}</p>
  `;

  return renderMinimalEmail({
    eyebrow: "Payments",
    title: "Payment status update",
    subtitle: "A booking payment state has been updated.",
    bodyHtml,
    ctaText: "Open Host Dashboard",
    ctaUrl: "https://merry360x.com/host-dashboard",
  });
}

function generateBookingConfirmationHtml(booking) {
  const reviewUrl = booking.reviewToken
    ? `https://merry360x.com/review/${booking.reviewToken}`
    : `https://merry360x.com/my-bookings`;

  const isMultiItem = booking.items && Array.isArray(booking.items) && booking.items.length > 1;
  const itemsHtml = isMultiItem
    ? `<div style="margin:0 0 14px;">${booking.items
        .map(
          (item) => `<p style="margin:0 0 6px;color:#374151;font-size:14px;">• ${escapeHtml(item.title || "Item")} — ${escapeHtml(formatMoney(item.price, item.currency || booking.currency))}</p>`
        )
        .join("")}</div>`
    : "";

  const details = keyValueRows([
    { label: isMultiItem ? "Order" : "Booking", value: escapeHtml(booking.bookingId?.slice(0, 8).toUpperCase() || "—") },
    { label: "Service", value: escapeHtml(booking.propertyTitle || "Booking") },
    { label: "Location", value: escapeHtml(booking.location || "—") },
    { label: "Check-in", value: escapeHtml(formatDate(booking.checkIn)) },
    { label: "Check-out", value: escapeHtml(formatDate(booking.checkOut)) },
    { label: "Guests", value: escapeHtml(`${booking.guests || 1}`) },
    { label: "Nights", value: escapeHtml(`${booking.nights || 1}`) },
    { label: "Total Paid", value: escapeHtml(formatMoney(booking.totalPrice, booking.currency)) },
  ]);

  const stars = [1, 2, 3, 4, 5]
    .map((star) => `<a href="${reviewUrl}?rating=${star}" style="display:inline-block;text-decoration:none;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-right:6px;color:#111827;font-size:13px;">${"★".repeat(star)}</a>`)
    .join("");

  return renderMinimalEmail({
    eyebrow: "Booking Confirmation",
    title: "Your booking is confirmed",
    subtitle: "Thank you for booking with Merry Moments.",
    bodyHtml: `${itemsHtml}${details}<div style="margin-top:14px;"><p style="margin:0 0 8px;color:#6b7280;font-size:12px;">Rate your experience:</p>${stars}</div>`,
    ctaText: "View My Bookings",
    ctaUrl: "https://merry360x.com/my-bookings",
  });
}

function generateBookingDecisionHtml(payload) {
  const isApproved = payload.action === "approved";
  const title = isApproved ? "Booking approved" : "Booking update";
  const subtitle = isApproved
    ? "Your host accepted your booking request."
    : "Your host could not accept this booking request.";

  const bodyHtml = `
    <p style="margin:0 0 12px;color:#374151;font-size:14px;">Hi ${escapeHtml(payload.guestName || "Guest")},</p>
    ${keyValueRows([
      { label: "Booking", value: escapeHtml(payload.bookingId || "—") },
      { label: "Order", value: escapeHtml(payload.orderId || "—") },
      { label: "Service", value: escapeHtml(payload.itemName || "Booking") },
      { label: "Check-in", value: escapeHtml(formatDate(payload.checkIn)) },
      { label: "Check-out", value: escapeHtml(formatDate(payload.checkOut)) },
      { label: "Status", value: isApproved ? "Approved" : "Rejected" },
    ])}
    ${!isApproved && payload.rejectionReason ? `<div style="margin-top:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px;"><p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Reason</p><p style="margin:0;color:#111827;font-size:14px;">${escapeHtml(payload.rejectionReason)}</p></div>` : ""}
  `;

  return renderMinimalEmail({
    eyebrow: "Booking Request",
    title,
    subtitle,
    bodyHtml,
    ctaText: "View My Bookings",
    ctaUrl: "https://merry360x.com/my-bookings",
  });
}

function normalizeRefundStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["in_progress", "processing", "requested", "pending"].includes(value)) {
    return { label: "Processing", tone: "#92400e", bg: "#fef3c7" };
  }
  if (["resolved", "confirmed", "approved", "processed", "completed", "refunded"].includes(value)) {
    return { label: "Confirmed", tone: "#166534", bg: "#dcfce7" };
  }
  if (["declined", "rejected", "failed", "closed", "cancelled"].includes(value)) {
    return { label: "Declined", tone: "#991b1b", bg: "#fee2e2" };
  }
  return { label: "Received", tone: "#1f2937", bg: "#e5e7eb" };
}

function generateRefundStatusHtml({
  guestName,
  bookingId,
  orderId,
  itemName,
  amount,
  currency,
  refundStatus,
  note,
  source,
}) {
  const normalized = normalizeRefundStatus(refundStatus);
  const bodyHtml = `
    <p style="margin:0 0 12px;color:#374151;font-size:14px;">Hi ${escapeHtml(guestName || "Guest")}, here is an update on your refund request.</p>
    ${keyValueRows([
      { label: "Booking", value: escapeHtml(bookingId || "—") },
      { label: "Order", value: escapeHtml(orderId || "—") },
      { label: "Service", value: escapeHtml(itemName || "Booking") },
      { label: "Refund Status", value: `<span style="display:inline-block;background:${normalized.bg};color:${normalized.tone};padding:4px 10px;border-radius:999px;font-weight:600;">${escapeHtml(normalized.label)}</span>` },
      { label: "Amount", value: amount ? escapeHtml(formatMoney(amount, currency || "RWF")) : "TBD" },
      { label: "Source", value: escapeHtml(source || "support") },
    ])}
    ${note ? `<div style="margin-top:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px;"><p style="margin:0 0 4px;color:#6b7280;font-size:12px;">Update note</p><p style="margin:0;color:#111827;font-size:14px;">${escapeHtml(note)}</p></div>` : ""}
  `;

  return renderMinimalEmail({
    eyebrow: "Refund Update",
    title: "Your refund request update",
    subtitle: "We are keeping you informed at each stage of the refund process.",
    bodyHtml,
    ctaText: "Open My Bookings",
    ctaUrl: "https://merry360x.com/my-bookings",
  });
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping booking confirmation email");
    return json(res, 200, { ok: true, skipped: true, reason: "No API key" });
  }

  try {
    const { action, previewTo } = req.body || {};

    if (action === "host_payment_status") {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return json(res, 500, { error: "Supabase configuration missing" });
      }

      const { bookingId, paymentStatus, source } = req.body || {};
      if (!bookingId) {
        return json(res, 400, { error: "Missing bookingId" });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, order_id, booking_type, property_id, tour_id, transport_id, guest_name, guest_email, check_in, check_out, total_price, currency, payment_status")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        return json(res, 404, { error: "Booking not found" });
      }

      const resolved = await resolveHostAndItem(supabase, booking);
      if (!resolved) {
        return json(res, 404, { error: "Host email not found for booking" });
      }

      const effectivePaymentStatus = paymentStatus || booking.payment_status || "pending";
      const htmlContent = generateHostPaymentStatusHtml({
        resolved,
        booking,
        source,
        effectivePaymentStatus,
      });

      const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildBrevoSmtpPayload({
            senderName: "Merry Moments",
            senderEmail: "support@merry360x.com",
            to: [{ email: previewTo || resolved.hostEmail, name: previewTo ? "Template Preview" : resolved.hostName }],
            subject: `${previewTo ? "[Preview] " : ""}Payment Update: ${paymentLabel(effectivePaymentStatus)} • ${resolved.itemTitle}`,
            htmlContent,
            tags: ["payments", "host-update"],
          })
        ),
      });

      const emailResult = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        return json(res, 502, { error: "Failed to send host email", details: emailResult });
      }

      return json(res, 200, { ok: true, messageId: emailResult.messageId || null });
    }

    if (action === "refund_status") {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return json(res, 500, { error: "Supabase configuration missing" });
      }

      const {
        ticketId,
        bookingId,
        orderId,
        guestEmail,
        guestName,
        itemName,
        amount,
        currency,
        refundStatus,
        note,
        source,
      } = req.body || {};

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      let resolvedBookingId = bookingId || null;
      let resolvedOrderId = orderId || null;
      let resolvedGuestEmail = guestEmail || null;
      let resolvedGuestName = guestName || null;
      let resolvedItemName = itemName || "Booking";
      let resolvedAmount = amount || null;
      let resolvedCurrency = currency || null;
      let resolvedRefundStatus = refundStatus || "processing";

      if (ticketId) {
        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("id, user_id, subject, status, category, response")
          .eq("id", ticketId)
          .single();

        if (ticket) {
          resolvedRefundStatus = refundStatus || ticket.status || "processing";
          const subjectText = String(ticket.subject || "");
          const isRefundTicket = /refund request/i.test(subjectText) || String(ticket.category || "").toLowerCase() === "payment";
          if (!isRefundTicket) {
            return json(res, 200, { ok: true, skipped: true, reason: "Not a refund ticket" });
          }

          const refMatch = subjectText.match(/refund request for booking\s+(.+)$/i);
          const ref = refMatch?.[1]?.trim();
          if (ref && !resolvedBookingId && !resolvedOrderId) {
            const { data: booking } = await supabase
              .from("bookings")
              .select("id, order_id, guest_email, guest_name, total_price, currency, booking_type, check_in, check_out")
              .or(`id.eq.${ref},order_id.eq.${ref}`)
              .limit(1)
              .maybeSingle();

            if (booking) {
              resolvedBookingId = booking.id;
              resolvedOrderId = booking.order_id || null;
              resolvedGuestEmail = resolvedGuestEmail || booking.guest_email || null;
              resolvedGuestName = resolvedGuestName || booking.guest_name || "Guest";
              resolvedAmount = resolvedAmount || booking.total_price || null;
              resolvedCurrency = resolvedCurrency || booking.currency || null;
            }
          }

          if (!resolvedGuestEmail && ticket.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", ticket.user_id)
              .single();
            resolvedGuestEmail = profile?.email || null;
            resolvedGuestName = resolvedGuestName || profile?.full_name || "Guest";
          }
        }
      }

      const targetEmail = previewTo || resolvedGuestEmail;
      if (!targetEmail) {
        return json(res, 400, { error: "Missing recipient email for refund status update" });
      }

      const htmlContent = generateRefundStatusHtml({
        guestName: resolvedGuestName,
        bookingId: resolvedBookingId,
        orderId: resolvedOrderId,
        itemName: resolvedItemName,
        amount: resolvedAmount,
        currency: resolvedCurrency,
        refundStatus: resolvedRefundStatus,
        note,
        source,
      });

      const normalized = normalizeRefundStatus(resolvedRefundStatus);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildBrevoSmtpPayload({
            senderName: "Merry Moments",
            senderEmail: "support@merry360x.com",
            to: [{ email: targetEmail, name: previewTo ? "Template Preview" : (resolvedGuestName || "Guest") }],
            subject: `${previewTo ? "[Preview] " : ""}Refund Update: ${normalized.label}${resolvedBookingId ? ` • ${resolvedBookingId.slice(0, 8).toUpperCase()}` : ""}`,
            htmlContent,
            tags: ["refund", "guest-update"],
          })
        ),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        return json(res, 500, { error: "Failed to send refund status email", details: result });
      }
      return json(res, 200, { ok: true, messageId: result.messageId || null });
    }

    if (action === "approved" || action === "rejected") {
      const {
        bookingId,
        orderId,
        guestName,
        guestEmail,
        itemName,
        checkIn,
        checkOut,
        rejectionReason,
      } = req.body;

      if (!bookingId || !guestEmail) {
        return json(res, 400, { error: "Missing required fields" });
      }

      const htmlContent = generateBookingDecisionHtml({
        action,
        bookingId,
        orderId,
        guestName,
        itemName,
        checkIn,
        checkOut,
        rejectionReason,
      });

      const decisionResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildBrevoSmtpPayload({
            senderName: "Merry Moments",
            senderEmail: "support@merry360x.com",
            to: [
              {
                email: previewTo || guestEmail,
                name: previewTo ? "Template Preview" : (guestName || "Guest"),
              },
            ],
            subject: action === "approved"
              ? `${previewTo ? "[Preview] " : ""}Your booking has been approved`
              : `${previewTo ? "[Preview] " : ""}Update on your booking request`,
            htmlContent,
            tags: ["booking", action],
          })
        ),
      });

      const decisionResult = await decisionResponse.json();
      if (!decisionResponse.ok) {
        return json(res, 500, { error: "Failed to send email", details: decisionResult });
      }

      return json(res, 200, { ok: true, messageId: decisionResult.messageId || null });
    }

    const {
      bookingId,
      guestName,
      guestEmail,
      propertyTitle,
      propertyImage,
      location,
      checkIn,
      checkOut,
      guests,
      nights,
      totalPrice,
      currency,
      // Fee breakdown fields
      basePriceAmount,
      serviceFeeAmount,
      hostEarningsAmount,
    } = req.body;

    if (!bookingId || !guestEmail) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const booking = {
      bookingId,
      guestName,
      propertyTitle,
      propertyImage,
      location,
      checkIn,
      checkOut,
      guests,
      nights,
      totalPrice,
      currency,
      basePriceAmount,
      serviceFeeAmount,
      hostEarningsAmount,
    };

    const html = generateBookingConfirmationHtml(booking);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(
        buildBrevoSmtpPayload({
          senderName: "Merry Moments",
          senderEmail: "support@merry360x.com",
          to: [
            {
              email: previewTo || guestEmail,
              name: previewTo ? "Template Preview" : (guestName || "Guest"),
            },
          ],
          subject: `${previewTo ? "[Preview] " : ""}Booking Confirmed – ${propertyTitle || "Your Stay"}`,
          htmlContent: html,
          tags: ["booking", "confirmation"],
        })
      ),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📧 Booking confirmation sent to ${guestEmail} for booking ${bookingId}`);
      return json(res, 200, { ok: true, messageId: result.messageId });
    } else {
      console.error("❌ Brevo API error:", result);
      return json(res, 500, { error: "Failed to send email", details: result });
    }
  } catch (error) {
    console.error("❌ Booking confirmation email error:", error.message);
    return json(res, 500, { error: error.message });
  }
}
