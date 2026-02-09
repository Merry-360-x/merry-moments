// API endpoint to send review request emails on checkout day
// Called by the cron job (send-review-emails.js) or manually

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function generateReviewEmailHtml({ guestName, propertyTitle, propertyImage, location, checkIn, checkOut, reviewUrl }) {
  const logoUrl = "https://merry360x.com/brand/logo.png";
  const primaryColor = "#E64980";
  const lightPink = "#FDF2F8";
  const starColor = "#f59e0b";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your stay?</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 40px 16px; text-align: center;">
              <img src="${logoUrl}" alt="Merry Moments" width="56" height="56" style="display: inline-block; max-width: 56px; height: auto; border-radius: 12px;" />
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 24px; font-weight: 600;">
                How was your stay?
              </h1>
              <p style="margin: 0; color: #6b7280; font-size: 15px;">
                Hi ${guestName || "there"}, we hope you had a wonderful experience!
              </p>
            </td>
          </tr>

          ${propertyImage ? `
          <!-- Property Image -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <img src="${propertyImage}" alt="${propertyTitle}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px;" />
            </td>
          </tr>
          ` : ""}

          <!-- Property Info -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 6px; color: #1f2937; font-size: 18px; font-weight: 600;">
                ${propertyTitle || "Your Stay"}
              </h2>
              ${location ? `<p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">📍 ${location}</p>` : ""}
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                ${checkIn || ""} → ${checkOut || ""}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Star Rating Section -->
          <tr>
            <td style="padding: 28px 40px 8px; text-align: center;">
              <p style="margin: 0 0 4px; color: #4b5563; font-size: 15px; font-weight: 600;">
                Rate your accommodation
              </p>
              <p style="margin: 0 0 16px; color: #9ca3af; font-size: 13px;">
                Tap a star to start your review
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  ${[1,2,3,4,5].map((star) => `
                  <td style="padding: 0 4px;">
                    <a href="${reviewUrl}?rating=${star}" 
                       style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; border-radius: 12px; border: 2px solid ${star <= 3 ? '#e5e7eb' : starColor}; text-decoration: none; font-size: 24px; background-color: ${star <= 3 ? '#fefce8' : '#fffbeb'};">
                      ${'⭐'}
                    </a>
                  </td>
                  `).join('')}
                </tr>
                <tr>
                  ${[1,2,3,4,5].map((star) => `
                  <td style="padding: 4px 4px 0; text-align: center;">
                    <span style="font-size: 11px; color: #9ca3af;">${star}</span>
                  </td>
                  `).join('')}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Info text -->
          <tr>
            <td style="padding: 20px 40px 8px; text-align: center;">
              <div style="background-color: ${lightPink}; border-radius: 12px; padding: 16px 20px;">
                <p style="margin: 0 0 4px; color: ${primaryColor}; font-size: 14px; font-weight: 600;">
                  ✨ Quick & easy review
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                  Rate both the accommodation and our service on a simple page — no login required. Takes less than a minute!
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center;">
              <a href="${reviewUrl}" style="display: inline-block; padding: 14px 40px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                Leave Your Review
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                Your feedback helps other travelers and our hosts improve.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Merry Moments · Book local. Travel better.
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px;">
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

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  if (!BREVO_API_KEY) {
    return json(res, 200, { ok: true, skipped: true, reason: "No Brevo API key" });
  }

  try {
    const {
      guestName,
      guestEmail,
      propertyTitle,
      propertyImage,
      location,
      checkIn,
      checkOut,
      reviewToken,
    } = req.body;

    if (!guestEmail || !reviewToken) {
      return json(res, 400, { error: "Missing required fields (guestEmail, reviewToken)" });
    }

    const reviewUrl = `https://merry360x.com/review/${reviewToken}`;

    const html = generateReviewEmailHtml({
      guestName,
      propertyTitle,
      propertyImage,
      location,
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
      reviewUrl,
    });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Merry Moments", email: "davydushimiyimana@gmail.com" },
        to: [{ email: guestEmail, name: guestName || "Guest" }],
        subject: `⭐ How was your stay at ${propertyTitle || "your accommodation"}?`,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📧 Review email sent to ${guestEmail} (token: ${reviewToken.slice(0, 8)}...)`);
      return json(res, 200, { ok: true, messageId: result.messageId });
    } else {
      console.error("❌ Brevo API error:", result);
      return json(res, 500, { error: "Failed to send email", details: result });
    }
  } catch (error) {
    console.error("❌ Review email error:", error.message);
    return json(res, 500, { error: error.message });
  }
}
