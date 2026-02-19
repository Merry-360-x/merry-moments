// API endpoint to send email notification when support ticket is created
import { createClient } from "@supabase/supabase-js";
import { buildBrevoSmtpPayload, escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@merry360x.com";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_HEALTHCHECK_KEY = process.env.ADMIN_HEALTHCHECK_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Health-Key");
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

function generatePasswordResetHtml(actionLink, email) {
  return renderMinimalEmail({
    eyebrow: "Account Security",
    title: "Reset your password",
    subtitle: "Use the button below to create a new password.",
    bodyHtml: `
      <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.7;">A password reset was requested for <strong>${escapeHtml(email)}</strong>.</p>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
    `,
    ctaText: "Reset Password",
    ctaUrl: actionLink,
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

  if (req.body?.action === "password_reset_health") {
    const providedKey =
      req.headers["x-admin-health-key"] ||
      req.body?.adminKey ||
      "";

    if (!ADMIN_HEALTHCHECK_KEY || providedKey !== ADMIN_HEALTHCHECK_KEY) {
      return json(res, 404, { error: "Not found" });
    }

    return json(res, 200, {
      ok: true,
      service: "password_reset",
      configured: {
        brevoApiKey: Boolean(BREVO_API_KEY),
        supabaseUrl: Boolean(SUPABASE_URL),
        supabaseServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
        adminHealthcheckKey: Boolean(ADMIN_HEALTHCHECK_KEY),
      },
      ready: Boolean(BREVO_API_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      checkedAt: new Date().toISOString(),
    });
  }

  if (req.body?.action === "password_reset") {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const redirectTo = String(req.body?.redirectTo || "").trim() || "https://merry360x.com/reset-password";

    if (!email) {
      return json(res, 400, { error: "Email is required" });
    }

    if (!BREVO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 200, { ok: true, skipped: true });
    }

    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (error) {
        return json(res, 200, { ok: true });
      }

      const tokenHash = data?.properties?.hashed_token;
      const actionLink = data?.properties?.action_link;
      const resetUrl = tokenHash
        ? `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
        : actionLink;

      if (!resetUrl) {
        return json(res, 200, { ok: true });
      }

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
            to: [{ email }],
            subject: "Reset your Merry360X password",
            htmlContent: generatePasswordResetHtml(resetUrl, email),
            tags: ["security", "password-reset"],
          })
        ),
      });

      if (!response.ok) {
        return json(res, 200, { ok: true, skipped: true });
      }

      return json(res, 200, { ok: true });
    } catch {
      return json(res, 200, { ok: true, skipped: true });
    }
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
      body: JSON.stringify(
        buildBrevoSmtpPayload({
          senderName: "Merry 360 Experiences",
          senderEmail: "support@merry360x.com",
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
          tags: ["support", "ticket"],
        })
      ),
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
