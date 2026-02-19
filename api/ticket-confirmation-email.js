// API endpoint to send confirmation email to customer when they submit a support ticket
import { buildBrevoSmtpPayload, escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

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
  const categoryConfig = {
    booking: { label: "Booking" },
    payment: { label: "Payment" },
    account: { label: "Account" },
    property: { label: "Property" },
    tour: { label: "Tour" },
    transport: { label: "Transport" },
    other: { label: "General" },
  };

  const config = categoryConfig[ticket.category] || categoryConfig.other;
  const ticketId = ticket.ticketId?.slice(0, 8).toUpperCase() || "—";
  const bodyHtml = `
    <div style="display:inline-block;padding:6px 10px;border:1px solid #e5e7eb;border-radius:999px;font-size:12px;color:#374151;margin-bottom:10px;">Ticket #${escapeHtml(ticketId)} · ${escapeHtml(config.label)}</div>
    <p style="margin:0 0 10px;color:#111827;font-size:16px;font-weight:600;">${escapeHtml(ticket.subject)}</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:16px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(ticket.message.length > 300 ? `${ticket.message.slice(0, 300)}...` : ticket.message)}</p>
    </div>
    ${keyValueRows([
      { label: "Reference", value: `#${escapeHtml(ticketId)}` },
      { label: "Response Time", value: "Within 24 hours" },
      { label: "Channel", value: "Email reply" },
    ])}
  `;

  return renderMinimalEmail({
    eyebrow: "Support Confirmation",
    title: "We received your request",
    subtitle: "Our team is reviewing your message and will follow up shortly.",
    bodyHtml,
    ctaText: "Contact Support",
    ctaUrl: "mailto:support@merry360x.com",
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
    console.log("⚠️ Brevo API key not configured, skipping customer confirmation email");
    return json(res, 200, { ok: true, skipped: true, reason: "No API key" });
  }

  try {
    const { ticketId, category, subject, message, userName, userEmail, previewTo } = req.body;

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
      body: JSON.stringify(
        buildBrevoSmtpPayload({
          senderName: "Merry 360 Experiences",
          senderEmail: "support@merry360x.com",
          to: [
            {
              email: previewTo || userEmail,
              name: previewTo ? "Template Preview" : (userName || "Customer"),
            },
          ],
          subject: `${previewTo ? "[Preview] " : ""}We received your message – ${subject}`,
          htmlContent: html,
          tags: ["support", "ticket-confirmation"],
        })
      ),
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
