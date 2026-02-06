// API endpoint to send booking confirmation email to guests

const BREVO_API_KEY = process.env.BREVO_API_KEY;

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

function generateBookingConfirmationHtml(booking) {
  const logoUrl = "https://merry360x.com/brand/logo.png";
  const primaryColor = "#E64980";
  const lightPink = "#FDF2F8";
  
  // Check if this is a multi-item booking (items array exists)
  const isMultiItem = booking.items && Array.isArray(booking.items) && booking.items.length > 1;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <img src="${logoUrl}" alt="Merry Moments" width="56" height="56" style="display: inline-block; max-width: 56px; height: auto; border-radius: 12px;" />
            </td>
          </tr>

          <!-- Success Icon & Title -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <div style="width: 64px; height: 64px; margin: 0 auto 20px; background-color: ${lightPink}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; line-height: 64px;">✓</span>
              </div>
              <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Booking Confirmed!
              </h1>
              <p style="margin: 0; color: #6b7280; font-size: 15px;">
                Thank you for booking with Merry Moments
              </p>
            </td>
          </tr>

          <!-- Booking Reference -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${isMultiItem ? 'Order Number' : 'Confirmation Number'}
                </p>
                <p style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600; font-family: monospace;">
                  ${booking.bookingId?.slice(0, 8).toUpperCase() || "—"}
                </p>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Booking Items -->
          <tr>
            <td style="padding: 32px 40px;">
              ${isMultiItem ? `
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">
                Your Booking
              </h2>
              
              <!-- Items Breakdown -->
              ${booking.items.map((item, idx) => `
              <div style="padding: 16px 0; ${idx > 0 ? 'border-top: 1px dashed #e5e7eb;' : ''}">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                  <span style="font-size: 28px; line-height: 1;">${item.icon || (item.type === 'tour' ? '🗺️' : item.type === 'transport' ? '🚗' : '🏠')}</span>
                  <div style="flex: 1;">
                    <h3 style="margin: 0 0 4px; color: #1f2937; font-size: 15px; font-weight: 600;">${item.title || 'Item'}</h3>
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">${item.location || ''}</p>
                    <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">${item.type === 'tour' ? 'Tour' : item.type === 'transport' ? 'Transport' : 'Accommodation'}</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 600;">${formatMoney(item.price, item.currency || booking.currency)}</p>
                  </div>
                </div>
              </div>
              `).join('')}
              ` : `
              ${booking.propertyImage ? `
              <img src="${booking.propertyImage}" alt="${booking.propertyTitle}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 20px;" />
              ` : ""}
              
              <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 18px; font-weight: 600;">
                ${booking.propertyTitle || "Your Booking"}
              </h2>
              `}
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 20px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Check-in</p>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px; font-weight: 500;">${formatDate(booking.checkIn)}</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Check-out</p>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px; font-weight: 500;">${formatDate(booking.checkOut)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Guests</p>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px; font-weight: 500;">${booking.guests || 1} guest${(booking.guests || 1) > 1 ? "s" : ""}</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Nights</p>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px; font-weight: 500;">${booking.nights || 1}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 16px 0 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Location</p>
                    <p style="margin: 4px 0 0; color: #1f2937; font-size: 15px;">${booking.location || "—"}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${isMultiItem ? `
                <tr>
                  <td colspan="2" style="padding-bottom: 8px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 500;">Booking Summary</p>
                  </td>
                </tr>
                ${booking.items?.map(item => `
                <tr>
                  <td style="padding: 4px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">${item.title}</p>
                  </td>
                  <td style="text-align: right; padding: 4px 0;">
                    <p style="margin: 0; color: #1f2937; font-size: 14px;">${formatMoney(item.price, item.currency || booking.currency)}</p>
                  </td>
                </tr>
                `).join('') || ''}
                <tr>
                  <td colspan="2" style="padding: 12px 0 0; border-top: 2px solid #e5e7eb;"></td>
                </tr>
                ` : ''}
                <tr>
                  <td>
                    <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600;">Total Paid</p>
                  </td>
                  <td style="text-align: right;">
                    <p style="margin: 0; color: ${primaryColor}; font-size: 20px; font-weight: 700;">
                      ${formatMoney(booking.totalPrice, booking.currency)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="https://merry360x.com/bookings" style="display: inline-block; padding: 14px 32px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
                View My Bookings
              </a>
            </td>
          </tr>

          <!-- Help Section -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                Questions about your booking?
              </p>
              <p style="margin: 0; text-align: center;">
                <a href="mailto:support@merry360x.com" style="color: ${primaryColor}; text-decoration: none; font-size: 13px; font-weight: 500;">
                  Contact Support
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 12px;">
                Merry Moments · Book local. Travel better.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                <a href="https://merry360x.com" style="color: #9ca3af; text-decoration: none;">merry360x.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
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
    };

    const html = generateBookingConfirmationHtml(booking);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry Moments",
          email: "davydushimiyimana@gmail.com",
        },
        to: [
          {
            email: guestEmail,
            name: guestName || "Guest",
          },
        ],
        subject: `✓ Booking Confirmed – ${propertyTitle || "Your Stay"}`,
        htmlContent: html,
      }),
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
