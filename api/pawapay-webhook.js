import { createClient } from "@supabase/supabase-js";
import { escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Brevo API Configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Format currency
function formatMoney(amount, currency = "RWF") {
  const num = Number(amount) || 0;
  if (currency === "RWF") {
    return `${num.toLocaleString()} RWF`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(num);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Generate booking confirmation email HTML (minimalistic)
function generateConfirmationEmail(checkout, items, bookingIds, reviewTokens) {
  const guestName = checkout.name || "Guest";
  const totalAmount = formatMoney(checkout.total_amount, checkout.currency);
  const receiptNumber = `MRY-${Date.now().toString(36).toUpperCase()}`;
  const isMultiItem = items && items.length > 1;
  // Use token-based review URL (no login required)
  const singleToken = Array.isArray(reviewTokens) && reviewTokens.length === 1 ? reviewTokens[0]?.review_token : null;
  const reviewUrl = singleToken
    ? `https://merry360x.com/review/${singleToken}`
    : `https://merry360x.com/my-bookings`;

  const itemsHtml = isMultiItem
    ? `<div style="margin-bottom:12px;">${items
        .map((item) => {
          const itemPrice = formatMoney(item.calculated_price || item.price, item.calculated_price_currency || item.currency || "USD");
          const itemTitle = item.title || item.name || "Item";
          return `<p style="margin:0 0 6px;color:#374151;font-size:14px;">• ${escapeHtml(itemTitle)} — ${escapeHtml(itemPrice)}</p>`;
        })
        .join("")}</div>`
    : "";

  const stars = [1, 2, 3, 4, 5]
    .map((star) => `<a href="${reviewUrl}${reviewUrl.includes("?") ? "&" : "?"}rating=${star}" style="display:inline-block;text-decoration:none;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-right:6px;color:#111827;font-size:13px;">${"★".repeat(star)}</a>`)
    .join("");

  const details = keyValueRows([
    { label: "Receipt", value: escapeHtml(receiptNumber) },
    { label: "Guest", value: escapeHtml(guestName) },
    { label: "Amount Paid", value: escapeHtml(totalAmount) },
    { label: "Status", value: "Paid" },
    { label: "Bookings", value: escapeHtml(String(Array.isArray(bookingIds) ? bookingIds.length : 1)) },
  ]);

  return renderMinimalEmail({
    eyebrow: "Payment Receipt",
    title: "Booking confirmed",
    subtitle: "Your payment was successful and your booking is complete.",
    bodyHtml: `${itemsHtml}${details}<div style="margin-top:14px;"><p style="margin:0 0 8px;color:#6b7280;font-size:12px;">Rate your experience:</p>${stars}</div>`,
    ctaText: "View My Bookings",
    ctaUrl: "https://merry360x.com/my-bookings",
  });
}

// Generate PDF receipt as base64
function generateReceiptPDF(checkout, items, bookingIds) {
  const guestName = checkout.name || "Guest";
  const guestEmail = checkout.email || "";
  const guestPhone = checkout.phone || checkout.phone_number || "";
  const totalAmount = formatMoney(checkout.total_amount, checkout.currency);
  const bookingDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const receiptNumber = `MRY-${Date.now().toString(36).toUpperCase()}`;
  const bookingDetails = checkout.metadata?.booking_details || {};
  
  const itemsList = items.map(item => {
    const itemName = item.title || item.name || "Booking";
    const itemPrice = formatMoney(item.calculated_price || item.price, item.calculated_price_currency || item.currency || 'USD');
    const checkIn = formatDate(bookingDetails.check_in || item.metadata?.check_in);
    const checkOut = formatDate(bookingDetails.check_out || item.metadata?.check_out);
    return `${itemName} | ${checkIn} to ${checkOut} | ${itemPrice}`;
  }).join('\n');

  // HTML receipt that can be printed as PDF
  const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; padding: 40px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: bold; color: #dc2626; }
    .receipt-title { font-size: 12px; color: #6b7280; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px; }
    .receipt-number { font-size: 16px; font-weight: 600; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 500; text-align: right; }
    .total-row { background: #f9fafb; padding: 12px; border-radius: 8px; margin-top: 16px; }
    .total-label { font-size: 14px; color: #1f2937; }
    .total-value { font-size: 20px; font-weight: 700; color: #dc2626; }
    .paid-badge { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 11px; color: #9ca3af; margin: 4px 0; }
    .order-ref { font-family: monospace; font-size: 10px; color: #9ca3af; word-break: break-all; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Merry360X</div>
    <div class="receipt-title">Payment Receipt</div>
    <div class="receipt-number">${receiptNumber}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Customer Details</div>
    <div class="row"><span class="label">Name</span><span class="value">${guestName}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${guestEmail}</span></div>
    ${guestPhone ? `<div class="row"><span class="label">Phone</span><span class="value">${guestPhone}</span></div>` : ''}
  </div>
  
  <div class="section">
    <div class="section-title">Payment Details</div>
    <div class="row"><span class="label">Date</span><span class="value">${bookingDate}</span></div>
    <div class="row"><span class="label">Method</span><span class="value">Mobile Money</span></div>
    <div class="row"><span class="label">Status</span><span class="value"><span class="paid-badge">PAID</span></span></div>
  </div>
  
  ${items.length > 1 ? `
  <div class="section">
    <div class="section-title">Booking Items</div>
    ${items.map((item, idx) => {
      const itemName = item.title || item.name || "Item";
      const itemPrice = formatMoney(item.calculated_price || item.price, item.calculated_price_currency || item.currency || 'USD');
      const itemIcon = item.metadata?.type === 'tour' ? '🗺️' : item.metadata?.type === 'transport' ? '🚗' : '🏠';
      return `<div class="row"><span class="label">${itemIcon} ${itemName}</span><span class="value">${itemPrice}</span></div>`;
    }).join('')}
  </div>
  ` : ''}
  
  ${checkout.base_price_amount || checkout.service_fee_amount ? `
  <div class="section">
    <div class="section-title">Price Breakdown</div>
    ${checkout.base_price_amount ? `<div class="row"><span class="label">Subtotal</span><span class="value">${formatMoney(checkout.base_price_amount, checkout.currency)}</span></div>` : ''}
    ${checkout.service_fee_amount ? `<div class="row"><span class="label">Service Fee</span><span class="value">+${formatMoney(checkout.service_fee_amount, checkout.currency)}</span></div>` : ''}
    ${checkout.host_earnings_amount ? `<div class="row"><span class="label">Host Receives</span><span class="value" style="color: #059669;">${formatMoney(checkout.host_earnings_amount, checkout.currency)}</span></div>` : ''}
  </div>
  ` : ''}
  
  <div class="total-row">
    <div class="row" style="border: none;">
      <span class="total-label">Total Amount</span>
      <span class="total-value">${totalAmount}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>Thank you for booking with Merry360X</p>
    <p>support@merry360x.com | merry360x.com</p>
    <div class="order-ref">Order: ${checkout.id}</div>
  </div>
</body>
</html>
  `;

  // Return as base64 for email attachment
  return Buffer.from(receiptHtml).toString('base64');
}

// Send confirmation email using Brevo API
async function sendConfirmationEmail(checkout, items, bookingIds, reviewTokens) {
  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping email");
    return false;
  }

  const html = generateConfirmationEmail(checkout, items, bookingIds, reviewTokens);
  const receiptBase64 = generateReceiptPDF(checkout, items, bookingIds);
  const guestName = checkout.name || "Guest";
  const receiptNumber = `MRY-${Date.now().toString(36).toUpperCase()}`;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry360X",
          email: "support@merry360x.com",
        },
        to: [
          {
            email: checkout.email,
            name: guestName,
          },
        ],
        subject: `Booking Confirmed - ${receiptNumber}`,
        htmlContent: html,
        attachment: [
          {
            content: receiptBase64,
            name: `Receipt-${receiptNumber}.html`,
          },
        ],
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`📧 Confirmation email sent to ${checkout.email}: ${result.messageId}`);
      return true;
    } else {
      console.error("❌ Brevo API error:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to send confirmation email:", error.message);
    return false;
  }
}

// Send host notification email
async function sendHostNotification(supabase, booking, item) {
  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping host notification");
    return false;
  }

  try {
    console.log(`🔔 Attempting to send host notification for item:`, { item_type: item.item_type, reference_id: item.reference_id });
    
    // Fetch host information based on item type
    let hostEmail = null;
    let hostName = null;
    let hostId = null;
    let itemTitle = item.title || item.name || "Your Service";
    let itemType = "service";

    if (item.item_type === 'property') {
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('title, host_id')
        .eq('id', item.reference_id)
        .single();
      
      if (propError) {
        console.error("❌ Error fetching property:", propError);
        return false;
      }
      
      if (property) {
        itemTitle = property.title;
        itemType = "property";
        hostId = property.host_id;
      }
    } else if (item.item_type === 'tour' || item.item_type === 'tour_package') {
      const table = item.item_type === 'tour' ? 'tours' : 'tour_packages';
      const hostField = item.item_type === 'tour' ? 'created_by' : 'host_id';
      
      const { data: tour, error: tourError } = await supabase
        .from(table)
        .select(`title, ${hostField}`)
        .eq('id', item.reference_id)
        .single();
      
      if (tourError) {
        console.error(`❌ Error fetching ${table}:`, tourError);
        return false;
      }
      
      if (tour) {
        itemTitle = tour.title;
        itemType = "tour";
        hostId = tour[hostField];
      }
    } else if (item.item_type === 'transport_vehicle') {
      const { data: vehicle, error: vehError } = await supabase
        .from('transport_vehicles')
        .select('title, owner_id')
        .eq('id', item.reference_id)
        .single();
      
      if (vehError) {
        console.error("❌ Error fetching vehicle:", vehError);
        return false;
      }
      
      if (vehicle) {
        itemTitle = vehicle.title;
        itemType = "transport";
        hostId = vehicle.owner_id;
      }
    }

    if (!hostId) {
      console.log("⚠️ No host ID found for item:", item.reference_id);
      return false;
    }

    // Now fetch the host profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', hostId)
      .single();
    
    if (profileError || !profile) {
      console.error("❌ Error fetching host profile:", profileError);
      return false;
    }
    
    hostEmail = profile.email;
    hostName = profile.full_name;

    if (!hostEmail) {
      console.log("⚠️ No host email found for host ID:", hostId);
      return false;
    }

    console.log(`✅ Found host email: ${hostEmail} for ${itemType}: ${itemTitle}`);

    const guestName = booking.guest_name || "A guest";
    const guestEmail = booking.guest_email || "";
    const guestPhone = booking.guest_phone || "";
    const checkIn = formatDate(booking.check_in);
    const checkOut = formatDate(booking.check_out);
    const totalAmount = formatMoney(booking.total_price, booking.currency);
    const bookingRef = `MRY-${booking.id.slice(0, 8).toUpperCase()}`;

    const hostHtml = renderMinimalEmail({
      eyebrow: "New Booking",
      title: "You received a new booking",
      subtitle: `Hi ${hostName || "Host"}, a guest booked your ${itemType}.`,
      bodyHtml: keyValueRows([
        { label: "Item", value: escapeHtml(itemTitle) },
        { label: "Booking Ref", value: escapeHtml(bookingRef) },
        { label: "Guest", value: escapeHtml(guestName) },
        { label: "Guest Email", value: guestEmail ? `<a href="mailto:${escapeHtml(guestEmail)}" style="color:#111827;text-decoration:none;">${escapeHtml(guestEmail)}</a>` : "—" },
        { label: "Guest Phone", value: guestPhone ? `<a href="tel:${escapeHtml(guestPhone)}" style="color:#111827;text-decoration:none;">${escapeHtml(guestPhone)}</a>` : "—" },
        { label: "Check-in", value: escapeHtml(checkIn) },
        { label: "Check-out", value: escapeHtml(checkOut) },
        { label: "Guests", value: escapeHtml(`${booking.guests || 1}`) },
        { label: "Total Amount", value: escapeHtml(totalAmount) },
      ]),
      ctaText: "Open Host Dashboard",
      ctaUrl: "https://merry360x.com/host-dashboard",
    });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry360X Bookings",
          email: "support@merry360x.com",
        },
        to: [
          {
            email: hostEmail,
            name: hostName || "Host",
          },
        ],
        subject: `🔔 New Booking: ${itemTitle} - ${bookingRef}`,
        htmlContent: hostHtml,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`📧 Host notification sent to ${hostEmail}: ${result.messageId}`);
      return true;
    } else {
      console.error("❌ Brevo API error for host notification:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to send host notification:", error.message);
    return false;
  }
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

/**
 * PawaPay Webhook Handler
 * 
 * CRITICAL: This handles asynchronous payment status updates from PawaPay
 * 
 * Webhook URL: https://merry360x.com/api/pawapay-webhook
 * 
 * PawaPay will POST here when payment status changes:
 * - SUBMITTED: Payment initiated
 * - ACCEPTED: Payment processing
 * - COMPLETED: Payment successful ✅
 * - FAILED: Payment failed (insufficient funds, etc) ❌
 * - REJECTED: Payment rejected
 * - CANCELLED: Payment cancelled
 */
export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const event = req.body;
    
    console.log("📥 PawaPay webhook received:", JSON.stringify(event, null, 2));

    // Extract payment details from webhook
    const depositId = event.depositId;
    const status = event.status; // COMPLETED, FAILED, SUBMITTED, ACCEPTED, REJECTED, CANCELLED
    const failureReason = event.failureReason;
    const created = event.created;
    const lastUpdated = event.lastUpdatedAt;

    if (!depositId) {
      console.error("❌ No depositId in webhook");
      return json(res, 400, { error: "Missing depositId" });
    }

    // Initialize Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing Supabase credentials");
      return json(res, 500, { error: "Server configuration error" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the checkout request by depositId (stored in dpo_transaction_id field)
    const { data: checkouts, error: fetchError } = await supabase
      .from("checkout_requests")
      .select("id, user_id, payment_status, email, name, phone, total_amount, currency, metadata")
      .eq("dpo_transaction_id", depositId)
      .limit(1);

    if (fetchError) {
      console.error("❌ Database error:", fetchError);
      return json(res, 500, { error: "Database error" });
    }

    if (!checkouts || checkouts.length === 0) {
      console.warn(`⚠️ No checkout found for depositId: ${depositId}`);
      // Still return 200 to acknowledge webhook
      return json(res, 200, { ok: true, message: "Checkout not found" });
    }

    const checkout = checkouts[0];
    let newPaymentStatus = checkout.payment_status;
    let shouldNotify = false;
    let shouldCreateBookings = false;

    // Map PawaPay status to our system
    switch (status) {
      case "COMPLETED":
        newPaymentStatus = "paid";
        shouldCreateBookings = true;
        shouldNotify = true;
        console.log(`✅ Payment COMPLETED for checkout ${checkout.id}`);
        break;
      
      case "FAILED":
      case "REJECTED":
      case "CANCELLED":
        newPaymentStatus = "failed";
        shouldNotify = true;
        console.log(`❌ Payment ${status} for checkout ${checkout.id}${failureReason ? ` - ${failureReason}` : ''}`);
        break;
      
      case "SUBMITTED":
      case "ACCEPTED":
        newPaymentStatus = "pending";
        console.log(`⏳ Payment ${status} for checkout ${checkout.id}`);
        break;
      
      default:
        console.warn(`⚠️ Unknown status: ${status}`);
    }

    // Prepare update payload
    const currentMetadata = checkout.metadata || {};
    const updateData = {
      payment_status: newPaymentStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...currentMetadata,
        pawapay_webhook: {
          status,
          depositId,
          failureReason: failureReason || null,
          received_at: new Date().toISOString(),
          created,
          lastUpdated
        }
      }
    };

    // If failed, also store the failure reason in a dedicated field
    if (newPaymentStatus === "failed" && failureReason) {
      updateData.payment_error = failureReason;
    }

    // Atomic update with optimistic locking
    const { data: updated, error: updateError } = await supabase
      .from("checkout_requests")
      .update(updateData)
      .eq("id", checkout.id)
      .eq("payment_status", checkout.payment_status) // Only update if status hasn't changed
      .select("id, payment_status")
      .single();

    if (updateError) {
      console.error("❌ Failed to update checkout:", updateError);
      // Check if it was a concurrent update
      if (updateError.code === 'PGRST116') {
        console.log("⚠️ Payment status already updated by another process");
        return json(res, 200, { ok: true, message: "Already processed" });
      }
      return json(res, 500, { error: "Update failed" });
    }

    if (!updated) {
      console.log("⚠️ Payment status already changed, skipping update");
      return json(res, 200, { ok: true, message: "Already processed" });
    }

    console.log(`✅ Checkout ${checkout.id} updated: ${checkout.payment_status} → ${newPaymentStatus}`);

    // Create bookings when payment is completed
    let createdBookingIds = [];
    if (shouldCreateBookings && checkout.metadata?.items) {
      console.log("📦 Creating bookings from checkout items...");
      const items = checkout.metadata.items;
      const bookingDetails = checkout.metadata.booking_details;
      
      for (const item of items) {
        try {
          // Check if booking already exists for this order and item
          const { data: existingBooking } = await supabase
            .from("bookings")
            .select("id")
            .eq("order_id", checkout.id)
            .eq(item.item_type === 'property' ? "property_id" : item.item_type === 'transport_vehicle' ? "transport_id" : "tour_id", item.reference_id)
            .limit(1);

          if (existingBooking && existingBooking.length > 0) {
            console.log(`⏭️ Booking already exists for item ${item.reference_id}, skipping...`);
            createdBookingIds.push(existingBooking[0].id);
            continue;
          }

          // Host must confirm new bookings before they become confirmed.
          const requiresConfirmation = true;

          const bookingData = {
            guest_id: checkout.user_id,
            guest_name: checkout.name || null,
            guest_email: checkout.email || null,
            guest_phone: checkout.phone || null,
            order_id: checkout.id,
            total_price: item.calculated_price || item.price,
            // Use the item's original currency (matches the listing), not the checkout currency
            currency: item.calculated_price_currency || item.currency || 'USD',
            status: requiresConfirmation ? 'pending' : 'confirmed',
            confirmation_status: requiresConfirmation ? 'pending' : null,
            payment_status: 'paid',
            payment_method: 'mobile_money',
            guests: bookingDetails?.guests || item.metadata?.guests || 1,
            review_token: crypto.randomUUID(),
          };

          // Handle different item types and set booking_type
          if (item.item_type === 'property') {
            bookingData.booking_type = 'property';
            bookingData.property_id = item.reference_id;
            bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in;
            bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out;
          } else if (item.item_type === 'tour' || item.item_type === 'tour_package') {
            bookingData.booking_type = 'tour';
            bookingData.tour_id = item.reference_id;
            // For tours, use check_in date as the tour date
            bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
            bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
          } else if (item.item_type === 'transport_vehicle') {
            bookingData.booking_type = 'transport';
            bookingData.transport_id = item.reference_id;
            bookingData.check_in = bookingDetails?.check_in || item.metadata?.check_in || new Date().toISOString().split('T')[0];
            bookingData.check_out = bookingDetails?.check_out || item.metadata?.check_out || new Date().toISOString().split('T')[0];
          }

          console.log("📝 Creating booking:", bookingData);

          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .insert(bookingData)
            .select("id")
            .single();

          if (bookingError) {
            console.error("❌ Failed to create booking:", bookingError);
          } else {
            console.log(`✅ Booking created: ${booking.id}`);
            createdBookingIds.push(booking.id);
          }
        } catch (bookingErr) {
          console.error("❌ Booking creation error:", bookingErr);
        }
      }
    }

    // Send email notification if payment completed
    if (shouldNotify && checkout.email && newPaymentStatus === "paid") {
      console.log(`📧 Sending confirmation email to ${checkout.email}...`);
      const items = checkout.metadata?.items || [];

      // Fetch review_tokens for created bookings
      let reviewTokens = [];
      if (createdBookingIds.length > 0) {
        const { data: tokenData } = await supabase
          .from("bookings")
          .select("id, review_token")
          .in("id", createdBookingIds);
        reviewTokens = tokenData || [];
      }

      await sendConfirmationEmail(checkout, items, createdBookingIds, reviewTokens);
      
      // Send host notifications for each booking created
      if (createdBookingIds.length > 0 && items.length > 0) {
        console.log(`📧 Sending host notifications for ${createdBookingIds.length} bookings...`);
        for (let i = 0; i < createdBookingIds.length; i++) {
          const bookingId = createdBookingIds[i];
          const item = items[i];
          
          if (bookingId && item) {
            console.log(`Processing host notification for booking ${i + 1}/${createdBookingIds.length}:`, { bookingId, item_type: item.item_type });
            
            // Fetch the created booking details
            const { data: booking, error: bookingError } = await supabase
              .from("bookings")
              .select("*")
              .eq("id", bookingId)
              .single();
            
            if (bookingError) {
              console.error(`❌ Error fetching booking ${bookingId}:`, bookingError);
              continue;
            }
            
            if (booking) {
              console.log(`📦 Fetched booking details for ${bookingId}`);
              const notificationSent = await sendHostNotification(supabase, booking, item);
              if (notificationSent) {
                console.log(`✅ Host notification sent successfully for booking ${bookingId}`);
              } else {
                console.log(`⚠️ Host notification failed for booking ${bookingId}`);
              }
            } else {
              console.log(`⚠️ No booking found for ID ${bookingId}`);
            }
          }
        }
        console.log(`✅ Completed processing all ${createdBookingIds.length} host notifications`);
      }
    }

    // Acknowledge webhook (VERY IMPORTANT - always return 200)
    return json(res, 200, { 
      ok: true, 
      checkoutId: checkout.id,
      status: newPaymentStatus,
      bookingsCreated: shouldCreateBookings
    });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    // Still return 200 to prevent PawaPay from retrying
    return json(res, 200, { ok: true, error: error.message });
  }
}
