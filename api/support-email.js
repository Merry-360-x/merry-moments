// API endpoint to send email notification when support ticket is created
import { escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

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
  const createdAt = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const detailsTable = keyValueRows([
    { label: "Category", value: escapeHtml(config.label) },
    { label: "Received", value: escapeHtml(createdAt) },
    { label: "Customer", value: escapeHtml(ticket.userName || "Not provided") },
    { label: "Email", value: `<a href="mailto:${escapeHtml(ticket.userEmail)}" style="color:#111827;text-decoration:none;">${escapeHtml(ticket.userEmail)}</a>` },
    { label: "User ID", value: `<span style="font-family:monospace;font-size:12px;">${escapeHtml(ticket.userId)}</span>` },
  ]);

  const bodyHtml = `
    <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Subject</p>
    <p style="margin:0 0 14px;color:#111827;font-size:18px;line-height:1.4;font-weight:600;">${escapeHtml(ticket.subject)}</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin:0 0 16px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(ticket.message)}</p>
    </div>
    <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Ticket Details</p>
    ${detailsTable}
  `;

  return renderMinimalEmail({
    eyebrow: "Support Inbox",
    title: "New Support Ticket",
    subtitle: "A customer sent a new support request.",
    bodyHtml,
    ctaText: "Reply to Customer",
    ctaUrl: `mailto:${ticket.userEmail}?subject=Re:%20${encodeURIComponent(ticket.subject)}`,
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
    console.log("⚠️ Brevo API key not configured, skipping support email");
    return json(res, 200, { ok: true, skipped: true, reason: "No API key" });
  }

  try {
    const { category, subject, message, userId, userEmail, userName, previewTo } = req.body;

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
            email: previewTo || "support@merry360x.com",
            name: previewTo ? "Template Preview" : "Merry360X Support",
          },
        ],
        replyTo: {
          email: userEmail,
          name: userName || "Customer",
        },
        subject: `${previewTo ? "[Preview] " : ""}[${(category || "other").toUpperCase()}] ${subject}`,
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
