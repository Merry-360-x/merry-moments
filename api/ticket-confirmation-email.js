// API endpoint to send confirmation email to customer when they submit a support ticket

const BREVO_API_KEY = process.env.BREVO_API_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function generateCustomerTicketEmailHtml(ticket) {
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
  const ticketId = ticket.ticketId?.slice(0, 8).toUpperCase() || "—";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Got Your Message</title>
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

          <!-- Title -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <div style="width: 56px; height: 56px; margin: 0 auto 16px; background-color: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px; line-height: 56px;">✓</span>
              </div>
              <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 22px; font-weight: 600;">
                We Got Your Message
              </h1>
              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Our support team will get back to you within 24 hours
              </p>
            </td>
          </tr>

          <!-- Ticket Reference -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Ticket Reference
                </p>
                <p style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 600; font-family: monospace;">
                  #${ticketId}
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

          <!-- Your Request Summary -->
          <tr>
            <td style="padding: 28px 40px;">
              <p style="margin: 0 0 16px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                Your Request
              </p>
              
              <!-- Category -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: ${config.color}15; color: ${config.color}; padding: 6px 14px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                  ${config.icon} ${config.label}
                </span>
              </div>
              
              <!-- Subject -->
              <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 16px; font-weight: 600;">
                ${ticket.subject}
              </h3>
              
              <!-- Message Preview -->
              <div style="background-color: #f9fafb; border-radius: 10px; padding: 14px; border-left: 3px solid ${config.color};">
                <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">${ticket.message.length > 300 ? ticket.message.slice(0, 300) + "..." : ticket.message}</p>
              </div>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding: 0 40px 28px;">
              <div style="background-color: #fdf2f8; border-radius: 12px; padding: 20px;">
                <p style="margin: 0 0 12px; color: #1f2937; font-size: 14px; font-weight: 600;">
                  What happens next?
                </p>
                <ul style="margin: 0; padding: 0 0 0 16px; color: #4b5563; font-size: 13px; line-height: 1.8;">
                  <li>Our team will review your request</li>
                  <li>You'll receive a reply via email</li>
                  <li>Keep this ticket reference for your records</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Help Section -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                Need urgent help?
              </p>
              <p style="margin: 0; text-align: center;">
                <a href="mailto:support@merry360x.com" style="color: ${primaryColor}; text-decoration: none; font-size: 13px; font-weight: 500;">
                  support@merry360x.com
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
    console.log("⚠️ Brevo API key not configured, skipping customer confirmation email");
    return json(res, 200, { ok: true, skipped: true, reason: "No API key" });
  }

  try {
    const { ticketId, category, subject, message, userName, userEmail } = req.body;

    if (!subject || !message || !userEmail) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const ticket = { ticketId, category, subject, message, userName };
    const html = generateCustomerTicketEmailHtml(ticket);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry Moments Support",
          email: "davydushimiyimana@gmail.com",
        },
        to: [
          {
            email: userEmail,
            name: userName || "Customer",
          },
        ],
        subject: `✓ We received your message – ${subject}`,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📧 Customer ticket confirmation sent to ${userEmail}`);
      return json(res, 200, { ok: true, messageId: result.messageId });
    } else {
      console.error("❌ Brevo API error:", result);
      return json(res, 500, { error: "Failed to send email", details: result });
    }
  } catch (error) {
    console.error("❌ Customer confirmation email error:", error.message);
    return json(res, 500, { error: error.message });
  }
}
