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

// Generate booking confirmation email HTML
function generateConfirmationEmail(checkout, items, bookingIds) {
  const guestName = checkout.name || "Guest";
  const totalAmount = formatMoney(checkout.total_amount, checkout.currency);
  const bookingDetails = checkout.metadata?.booking_details || {};
  
  const itemsHtml = items.map((item, index) => {
    const itemName = item.title || item.name || "Booking Item";
    const itemPrice = formatMoney(item.calculated_price || item.price, checkout.currency);
    const checkIn = formatDate(bookingDetails.check_in || item.metadata?.check_in);
    const checkOut = formatDate(bookingDetails.check_out || item.metadata?.check_out);
    const guests = bookingDetails.guests || item.metadata?.guests || 1;
    
    let itemType = "Booking";
    if (item.item_type === "property") itemType = "Accommodation";
    else if (item.item_type === "tour" || item.item_type === "tour_package") itemType = "Tour";
    else if (item.item_type === "transport_vehicle") itemType = "Transport";
    
    return `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #1f2937;">${itemName}</strong>
          <br><span style="color: #6b7280; font-size: 14px;">${itemType}</span>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
          ${checkIn} → ${checkOut}
          <br><span style="font-size: 14px;">${guests} guest${guests > 1 ? "s" : ""}</span>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">
          ${itemPrice}
        </td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Merry Moments</h1>
        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your booking is confirmed!</p>
      </td>
    </tr>
    
    <!-- Confirmation Badge -->
    <tr>
      <td style="padding: 32px 24px 16px 24px; text-align: center;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px;">
          <span style="font-size: 32px;">✓</span>
        </div>
        <h2 style="margin: 16px 0 8px 0; color: #1f2937; font-size: 24px;">Payment Successful!</h2>
        <p style="margin: 0; color: #6b7280;">Thank you for your booking, ${guestName}!</p>
      </td>
    </tr>
    
    <!-- Order Summary -->
    <tr>
      <td style="padding: 24px;">
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
            📋 Booking Details
          </h3>
          
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 15px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-weight: 600;">Item</th>
                <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-weight: 600;">Dates</th>
                <th style="padding: 12px 16px; text-align: right; color: #6b7280; font-weight: 600;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 16px; font-weight: 700; color: #1f2937; font-size: 16px;">Total Paid</td>
                <td style="padding: 16px; text-align: right; font-weight: 700; color: #ef4444; font-size: 18px;">${totalAmount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
    
    <!-- Payment Receipt -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">🧾 Payment Receipt</h4>
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #78350f;">
            <tr>
              <td style="padding: 4px 0;">Payment Method:</td>
              <td style="text-align: right; font-weight: 600;">Mobile Money</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">Amount Paid:</td>
              <td style="text-align: right; font-weight: 600;">${totalAmount}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">Status:</td>
              <td style="text-align: right;"><span style="background-color: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">PAID</span></td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">Order ID:</td>
              <td style="text-align: right; font-family: monospace; font-size: 12px;">${checkout.id?.slice(0, 8)}...</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    
    <!-- CTA Button -->
    <tr>
      <td style="padding: 0 24px 32px 24px; text-align: center;">
        <a href="https://merry360x.com/my-bookings" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View My Bookings
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #1f2937; padding: 24px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 14px;">Questions? Contact us at</p>
        <a href="mailto:support@merry360x.com" style="color: #ef4444; text-decoration: none; font-weight: 600;">support@merry360x.com</a>
        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 12px;">
          © 2026 Merry Moments. All rights reserved.<br>
          Discover the warmth of African hospitality.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Send confirmation email using Brevo API
async function sendConfirmationEmail(checkout, items, bookingIds) {
  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping email");
    return false;
  }

  const html = generateConfirmationEmail(checkout, items, bookingIds);
  const guestName = checkout.name || "Guest";

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
          name: "Merry Moments",
          email: "davyncidavy@gmail.com",
        },
        to: [
          {
            email: checkout.email,
            name: guestName,
          },
        ],
        subject: `Booking Confirmed - Thank you, ${guestName}!`,
        htmlContent: html,
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
