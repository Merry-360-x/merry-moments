// API endpoint to send email notification when support ticket is created

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "davyncidavy@gmail.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function generateTicketEmailHtml(ticket) {
  const categoryColors = {
    booking: "#3b82f6",
    payment: "#22c55e",
    account: "#8b5cf6",
    property: "#f59e0b",
    tour: "#ec4899",
    transport: "#06b6d4",
    other: "#6b7280",
  };

  const color = categoryColors[ticket.category] || "#6b7280";
  const createdAt = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <tr>
      <td style="padding: 24px; background-color: #dc2626; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">🎫 New Support Ticket</h1>
      </td>
    </tr>
    
    <!-- Alert Banner -->
    <tr>
      <td style="padding: 16px 24px; background-color: #fef3c7; border-bottom: 1px solid #fcd34d;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">⚡ Action Required - Customer needs help</p>
      </td>
    </tr>
    
    <!-- Category Badge -->
    <tr>
      <td style="padding: 24px 24px 16px 24px;">
        <span style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          ${ticket.category}
        </span>
        <span style="display: inline-block; margin-left: 8px; color: #6b7280; font-size: 13px;">
          ${createdAt}
        </span>
      </td>
    </tr>
    
    <!-- Subject -->
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <h2 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">${ticket.subject}</h2>
      </td>
    </tr>
    
    <!-- Message -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; border-left: 4px solid ${color};">
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${ticket.message}</p>
        </div>
      </td>
    </tr>
    
    <!-- Customer Info -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; font-weight: 600;">Customer Details</p>
          <p style="margin: 0 0 4px 0; color: #1f2937; font-size: 14px;"><strong>Name:</strong> ${ticket.userName || "Not provided"}</p>
          <p style="margin: 0 0 4px 0; color: #1f2937; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${ticket.userEmail}" style="color: #3b82f6;">${ticket.userEmail}</a></p>
          <p style="margin: 0; color: #1f2937; font-size: 14px;"><strong>User ID:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${ticket.userId}</code></p>
        </div>
      </td>
    </tr>
    
    <!-- Reply CTA -->
    <tr>
      <td style="padding: 0 24px 24px 24px; text-align: center;">
        <a href="mailto:${ticket.userEmail}?subject=Re: ${encodeURIComponent(ticket.subject)}" 
           style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Reply to Customer
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Merry360X Support System<br>
          <a href="https://merry360x.com" style="color: #dc2626;">merry360x.com</a>
        </p>
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
          email: "davyncidavy@gmail.com",
        },
        to: [
          {
            email: SUPPORT_EMAIL,
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
