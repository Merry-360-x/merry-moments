// API endpoint to send email notification when support ticket is created

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@merry360x.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function generateTicketEmailHtml(ticket) {
  const logoUrl = "https://merry360x.com/brand/logo.png";
  const primaryColor = "#E64980";
  
  const categoryConfig = {
    booking: { color: "#3b82f6", icon: "📅", label: "Booking" },
    payment: { color: "#22c55e", icon: "💳", label: "Payment" },
    account: { color: "#8b5cf6", icon: "👤", label: "Account" },
    property: { color: "#f59e0b", icon: "🏠", label: "Property" },
    tour: { color: "#ec4899", icon: "🗺️", label: "Tour" },
    transport: { color: "#06b6d4", icon: "🚗", label: "Transport" },
    other: { color: "#6b7280", icon: "💬", label: "General" },
  };

  const config = categoryConfig[ticket.category] || categoryConfig.other;
  const createdAt = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Support Ticket</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 40px 20px; text-align: center;">
              <img src="${logoUrl}" alt="Merry Moments" width="48" height="48" style="display: inline-block; max-width: 48px; height: auto; border-radius: 10px;" />
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 20px; font-weight: 600;">
                New Support Ticket
              </h1>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                ${createdAt}
              </p>
            </td>
          </tr>

          <!-- Category Badge -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <span style="display: inline-block; background-color: ${config.color}15; color: ${config.color}; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                ${config.icon} ${config.label}
              </span>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Subject -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject
              </p>
              <h2 style="margin: 0; color: #1f2937; font-size: 17px; font-weight: 600; line-height: 1.4;">
                ${ticket.subject}
              </h2>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                Message
              </p>
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px; border-left: 3px solid ${config.color};">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${ticket.message}</p>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding: 24px 40px;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                Customer Details
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">Name</p>
                    <p style="margin: 2px 0 0; color: #1f2937; font-size: 14px; font-weight: 500;">${ticket.userName || "Not provided"}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">Email</p>
                    <p style="margin: 2px 0 0; color: #1f2937; font-size: 14px;">
                      <a href="mailto:${ticket.userEmail}" style="color: ${primaryColor}; text-decoration: none;">${ticket.userEmail}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">User ID</p>
                    <p style="margin: 2px 0 0;">
                      <code style="background: #f3f4f6; color: #6b7280; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace;">${ticket.userId}</code>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reply Button -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <a href="mailto:${ticket.userEmail}?subject=Re: ${encodeURIComponent(ticket.subject)}" 
                 style="display: inline-block; padding: 14px 32px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                Reply to Customer
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0 0 4px; color: #9ca3af; font-size: 12px;">
                Merry Moments Support System
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
    console.log("⚠️ Brevo API key not configured, skipping support email");
    return json(res, 200, { ok: true, skipped: true, reason: "No API key" });
  }

  try {
    const { category, subject, message, userId, userEmail, userName } = req.body;

    if (!subject || !message || !userId || !userEmail) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const ticket = { category, subject, message, userId, userEmail, userName };
    const html = generateTicketEmailHtml(ticket);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry360X Support",
          email: "support@merry360x.com",
        },
        to: [
          {
            email: "support@merry360x.com",
            name: "Merry360X Support",
          },
        ],
        replyTo: {
          email: userEmail,
          name: userName || "Customer",
        },
        subject: `🎫 [${category.toUpperCase()}] ${subject}`,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📧 Support notification sent for ticket: ${subject}`);
      return json(res, 200, { ok: true, messageId: result.messageId });
    } else {
      console.error("❌ Brevo API error:", result);
      return json(res, 500, { error: "Failed to send email", details: result });
    }
  } catch (error) {
    console.error("❌ Support email error:", error.message);
    return json(res, 500, { error: error.message });
  }
}
