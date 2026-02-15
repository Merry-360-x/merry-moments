// API endpoint to send email notification when a payout is requested
import { escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = "support@merry360x.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function generatePayoutEmailHtml(payout) {
  const createdAt = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const methodDisplay = payout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer';
  const detailsTable = keyValueRows([
    { label: "Host", value: escapeHtml(payout.hostName || "N/A") },
    { label: "Host Email", value: escapeHtml(payout.hostEmail || "N/A") },
    { label: "Amount", value: `${escapeHtml(payout.currency || "")}&nbsp;${escapeHtml(Number(payout.amount || 0).toLocaleString())}` },
    { label: "Method", value: escapeHtml(methodDisplay) },
    { label: payout.method === "mobile_money" ? "Phone" : "Bank", value: escapeHtml(payout.method === "mobile_money" ? (payout.phone || "N/A") : (payout.bankName || "N/A")) },
    { label: payout.method === "mobile_money" ? "Account Name" : "Account", value: escapeHtml(payout.method === "mobile_money" ? (payout.accountName || "N/A") : (payout.bankAccount || "N/A")) },
    { label: "Requested", value: escapeHtml(createdAt) },
  ]);

  return renderMinimalEmail({
    eyebrow: "Payout Request",
    title: "New payout request",
    subtitle: "A host has requested a payout and needs review.",
    bodyHtml: detailsTable,
    ctaText: "Open Admin Dashboard",
    ctaUrl: "https://merry360x.com/admin-dashboard",
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

  try {
    const payout = req.body;
    
    if (!payout || !payout.amount) {
      return json(res, 400, { error: "Missing payout data" });
    }

    console.log("📧 Sending payout notification email for:", payout.amount, payout.currency);

    // Send email notification
    await sendPayoutEmail(payout, payout.previewTo);

    return json(res, 200, { success: true, message: "Notification sent" });
  } catch (error) {
    console.error("❌ Payout notification error:", error);
    return json(res, 500, { error: error.message || "Failed to send notification" });
  }
}

async function sendPayoutEmail(payout, previewTo) {
  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping email");
    return;
  }

  const htmlContent = generatePayoutEmailHtml(payout);
  const textContent = `
New Payout Request

Host: ${payout.hostName || 'N/A'} (${payout.hostEmail || 'N/A'})
Amount: ${payout.currency} ${Number(payout.amount).toLocaleString()}
Method: ${payout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}
${payout.method === 'mobile_money' ? `Phone: ${payout.phone || 'N/A'}` : `Bank: ${payout.bankName || 'N/A'}\nAccount: ${payout.bankAccount || 'N/A'}`}
Account Name: ${payout.accountName || 'N/A'}

Process this payout at: https://merry360x.com/admin-dashboard
  `.trim();

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: "Merry Moments", email: "support@merry360x.com" },
        to: [{ email: previewTo || ADMIN_EMAIL, name: previewTo ? "Template Preview" : "Merry Moments Admin" }],
        subject: `${previewTo ? "[Preview] " : ""}Payout Request: ${payout.currency} ${Number(payout.amount).toLocaleString()} - ${payout.hostName || 'Host'}`,
        htmlContent,
        textContent,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("❌ Brevo API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("✅ Payout notification email sent successfully");
    return result;
  } catch (error) {
    console.error("❌ Error sending payout email:", error);
    throw error;
  }
}
