import {
  buildBrevoSmtpPayload,
  escapeHtml,
  getSafeRecipientEmail,
  renderMinimalEmail,
  validateRecipientEmail,
} from "../lib/email-template-kit.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (!req?.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function welcomeBodyHtml(name) {
  const safeName = escapeHtml(name || "there");
  return `
    <p style="margin:0 0 12px;color:#111827;font-size:14px;line-height:1.7;">Hi ${safeName},</p>
    <p style="margin:0 0 12px;color:#111827;font-size:14px;line-height:1.7;">Welcome to Merry360X, where travel across Africa becomes seamless and unforgettable.</p>
    <p style="margin:0 0 16px;color:#111827;font-size:14px;line-height:1.7;">Whether you are looking for a luxury stay in Kigali, a curated safari experience, or reliable private transport, you are now part of a platform designed to make every journey exceptional.</p>

    <h2 style="margin:0 0 8px;color:#111827;font-size:16px;">What You Can Do with Merry360X</h2>
    <p style="margin:0 0 8px;color:#111827;font-size:14px;line-height:1.7;"><strong>Book Premium Accommodations</strong><br/>Discover apartments, villas, and hotels tailored for comfort, style and convenience.</p>
    <p style="margin:0 0 8px;color:#111827;font-size:14px;line-height:1.7;"><strong>Explore Curated Experiences</strong><br/>From gorilla trekking to city escapes, access unique tours crafted for memorable moments.</p>
    <p style="margin:0 0 16px;color:#111827;font-size:14px;line-height:1.7;"><strong>Move Effortlessly</strong><br/>Enjoy trusted transport services, from airport pickups to private drivers.</p>

    <h2 style="margin:0 0 8px;color:#111827;font-size:16px;">Why Travelers Choose Us</h2>
    <ul style="margin:0 0 16px;padding-left:18px;color:#111827;font-size:14px;line-height:1.7;">
      <li>Carefully vetted listings and experiences</li>
      <li>Seamless booking and secure payments</li>
      <li>Personalized, local support</li>
      <li>Designed for both business and leisure travelers</li>
    </ul>

    <p style="margin:0 0 8px;color:#111827;font-size:14px;line-height:1.7;"><strong>For Property Owners, Tour and Transportation Service Providers</strong></p>
    <p style="margin:0 0 16px;color:#111827;font-size:14px;line-height:1.7;">List your property or service on Merry360X and start earning from a growing network of premium travelers.</p>

    <p style="margin:0 0 8px;color:#111827;font-size:14px;line-height:1.7;"><strong>Need Help Planning?</strong></p>
    <p style="margin:0;color:#111827;font-size:14px;line-height:1.7;">Our team is ready to assist you with custom travel planning. Simply reply to this email or reach us anytime.</p>
  `;
}

function generateWelcomeEmailHtml({ name }) {
  return renderMinimalEmail({
    eyebrow: "Welcome",
    title: "Welcome to Merry360X",
    subtitle: "Redefining travel and hospitality in Africa.",
    bodyHtml: welcomeBodyHtml(name),
    ctaText: "Start Exploring",
    ctaUrl: "https://merry360x.com",
    footerText: "One Platform, Endless Experiences.",
    footerLink: "https://merry360x.com",
    supportEmail: "support@merry360x.com",
  });
}

async function sendWelcomeEmail({ toEmail, toName }) {
  if (!BREVO_API_KEY) {
    return { skipped: true, reason: "missing_brevo_api_key" };
  }

  const recipient = getSafeRecipientEmail({ primaryEmail: toEmail });
  if (!recipient) {
    throw new Error("Invalid recipient email");
  }

  const htmlContent = generateWelcomeEmailHtml({ name: toName });

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(
      buildBrevoSmtpPayload({
        to: [{ email: recipient.email, name: toName || "Traveler" }],
        subject: "Welcome to Merry360X - Your journey starts here",
        htmlContent,
        tags: ["welcome", "signup", "customer"],
      })
    ),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.message || "Failed to send welcome email");
    error.details = result;
    throw error;
  }

  return { messageId: result?.messageId || null };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = parseBody(req);
    const email = String(body?.email || "").trim();
    const fullName = String(body?.fullName || body?.name || "").trim();
    const firstName = String(body?.firstName || "").trim();

    const emailValidation = validateRecipientEmail(email);
    if (!emailValidation.ok) {
      return json(res, 400, { error: "Valid email is required" });
    }

    const name = firstName || fullName || "there";
    const result = await sendWelcomeEmail({ toEmail: emailValidation.email, toName: name });
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("[welcome-email] failed:", error);
    return json(res, 500, { error: "Failed to send welcome email" });
  }
}