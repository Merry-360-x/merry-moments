import { createClient } from "@supabase/supabase-js";

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
function generateConfirmationEmail(checkout, items, bookingIds) {
  const guestName = checkout.name || "Guest";
  const totalAmount = formatMoney(checkout.total_amount, checkout.currency);
  const receiptNumber = `MRY-${Date.now().toString(36).toUpperCase()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Logo Header -->
    <tr>
      <td style="padding: 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
        <img src="https://merry360x.com/brand/logo.png" alt="Merry360" width="60" height="60" style="display: block; margin: 0 auto 12px auto;">
        <h1 style="margin: 0; color: #dc2626; font-size: 22px; font-weight: 700;">Merry360</h1>
      </td>
    </tr>
    
    <!-- Success Message -->
    <tr>
      <td style="padding: 32px 24px; text-align: center;">
        <div style="background-color: #22c55e; border-radius: 50%; width: 48px; height: 48px; line-height: 48px; margin: 0 auto 16px auto;">
          <span style="font-size: 24px; color: #fff;">✓</span>
        </div>
        <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px;">Booking Confirmed</h2>
        <p style="margin: 0; color: #6b7280; font-size: 15px;">Hi ${guestName}, your payment was successful.</p>
      </td>
    </tr>
    
    <!-- Receipt Summary -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px;">
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Receipt #</td>
              <td style="text-align: right; color: #1f2937; font-weight: 600;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Amount Paid</td>
              <td style="text-align: right; color: #dc2626; font-weight: 700; font-size: 16px;">${totalAmount}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0;">Status</td>
              <td style="text-align: right;">
                <span style="background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">PAID</span>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    
    <!-- Download Receipt Button -->
    <tr>
      <td style="padding: 0 24px 32px 24px; text-align: center;">
        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 13px;">📎 Your receipt is attached to this email</p>
        <a href="https://merry360x.com/my-bookings" style="display: inline-block; background-color: #dc2626; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Booking
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 20px 24px; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Questions? <a href="mailto:support@merry360x.com" style="color: #ef4444; text-decoration: none;">support@merry360x.com</a>
        </p>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 11px;">© 2026 Merry360 Experience</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
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
    const itemPrice = formatMoney(item.calculated_price || item.price, checkout.currency);
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
    <div class="logo">Merry360</div>
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
  
  <div class="total-row">
    <div class="row" style="border: none;">
      <span class="total-label">Total Amount</span>
      <span class="total-value">${totalAmount}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>Thank you for booking with Merry360 Experience</p>
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
async function sendConfirmationEmail(checkout, items, bookingIds) {
  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping email");
    return false;
  }

  const html = generateConfirmationEmail(checkout, items, bookingIds);
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
          name: "Merry360",
          email: "davyncidavy@gmail.com",
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
          const bookingData = {
            guest_id: checkout.user_id,
            guest_name: checkout.name || null,
            guest_email: checkout.email || null,
            guest_phone: checkout.phone || null,
            order_id: checkout.id,
            total_price: item.calculated_price || item.price,
            currency: checkout.currency || 'RWF',
            status: 'confirmed',
            payment_status: 'paid',
            payment_method: 'mobile_money',
            guests: bookingDetails?.guests || item.metadata?.guests || 1,
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
      await sendConfirmationEmail(checkout, items, createdBookingIds);
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
