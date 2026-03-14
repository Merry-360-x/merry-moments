// API endpoint to send email notification when a payout is requested
import {
  buildBrevoSmtpPayload,
  escapeHtml,
  getSafeRecipientEmail,
  keyValueRows,
  renderMinimalEmail,
  validateRecipientEmail,
} from "../lib/email-template-kit.js";

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

function formatMoney(amount, currency = "RWF") {
  const num = Number(amount || 0);
  const code = String(currency || "RWF").toUpperCase();
  return `${Math.round(num).toLocaleString("en-US")} ${code}`;
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
    { label: "Request ID", value: escapeHtml(payout.payoutId || "N/A") },
    { label: "Host", value: escapeHtml(payout.hostName || "N/A") },
    { label: "Host Email", value: escapeHtml(payout.hostEmail || "N/A") },
    { label: "Amount", value: escapeHtml(formatMoney(payout.amount, payout.currency)) },
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

function generateHostPayoutConfirmationHtml(payout) {
  const createdAt = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const methodDisplay = payout.method === "mobile_money" ? "Mobile Money" : "Bank Transfer";
  const detailsTable = keyValueRows([
    { label: "Request ID", value: escapeHtml(payout.payoutId || "N/A") },
    { label: "Amount", value: escapeHtml(formatMoney(payout.amount, payout.currency)) },
    { label: "Method", value: escapeHtml(methodDisplay) },
    { label: "Requested", value: escapeHtml(createdAt) },
    { label: "Status", value: "Pending review" },
  ]);

  return renderMinimalEmail({
    eyebrow: "Payout Request",
    title: "Your payout request was received",
    subtitle: "Our team will review and process it shortly.",
    bodyHtml: detailsTable,
    ctaText: "Open Host Dashboard",
    ctaUrl: "https://merry360x.com/host-dashboard",
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

    // Send email notifications
    await sendPayoutEmails(payout, payout.previewTo);

    return json(res, 200, { success: true, message: "Notification sent" });
  } catch (error) {
    console.error("❌ Payout notification error:", error);
    return json(res, 500, { error: error.message || "Failed to send notification" });
  }
}

async function sendPayoutEmails(payout, previewTo) {
  if (!BREVO_API_KEY) {
    console.log("⚠️ Brevo API key not configured, skipping email");
    return;
  }

  if (previewTo) {
    const previewRecipient = getSafeRecipientEmail({ primaryEmail: null, previewEmail: previewTo });
    if (!previewRecipient) {
      console.log("⚠️ Skipping payout preview email: invalid preview recipient");
      return;
    }

    await sendBrevoEmail({
      toEmail: previewRecipient.email,
      toName: "Template Preview",
      subject: `[Preview] Payout Request: ${formatMoney(payout.amount, payout.currency)} - ${payout.hostName || 'Host'}`,
      htmlContent: generatePayoutEmailHtml(payout),
      textContent: `Preview payout request for ${payout.hostName || 'Host'} (${formatMoney(payout.amount, payout.currency)})`,
    });
    return;
  }

  const supportHtml = generatePayoutEmailHtml(payout);
  const supportText = `
New Payout Request

Host: ${payout.hostName || 'N/A'} (${payout.hostEmail || 'N/A'})
Request ID: ${payout.payoutId || 'N/A'}
Amount: ${formatMoney(payout.amount, payout.currency)}
Method: ${payout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}
${payout.method === 'mobile_money' ? `Phone: ${payout.phone || 'N/A'}` : `Bank: ${payout.bankName || 'N/A'}\nAccount: ${payout.bankAccount || 'N/A'}`}
Account Name: ${payout.accountName || 'N/A'}

Process this payout at: https://merry360x.com/admin-dashboard
  `.trim();

  const hostHtml = generateHostPayoutConfirmationHtml(payout);
  const hostText = `
Hi ${payout.hostName || 'Host'},

Your payout request has been received.
Request ID: ${payout.payoutId || 'N/A'}
Amount: ${formatMoney(payout.amount, payout.currency)}
Method: ${payout.method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}

Current status: Pending review
You can track updates in your host dashboard: https://merry360x.com/host-dashboard
  `.trim();

  const sendTasks = [
    sendBrevoEmail({
      toEmail: ADMIN_EMAIL,
      toName: "Merry 360 Experiences Support",
      subject: `Payout Request ${payout.payoutId ? `#${payout.payoutId}` : ''}: ${formatMoney(payout.amount, payout.currency)} - ${payout.hostName || 'Host'}`,
      htmlContent: supportHtml,
      textContent: supportText,
    }),
  ];

  const hostEmailValidation = validateRecipientEmail(payout.hostEmail);
  if (hostEmailValidation.ok) {
    sendTasks.push(
      sendBrevoEmail({
        toEmail: hostEmailValidation.email,
        toName: payout.hostName || "Host",
        subject: `Payout Request Received ${payout.payoutId ? `#${payout.payoutId}` : ''}: ${formatMoney(payout.amount, payout.currency)}`,
        htmlContent: hostHtml,
        textContent: hostText,
      })
    );
  } else if (payout.hostEmail) {
    console.log("⚠️ Skipping host payout confirmation email: invalid recipient");
  }

  const results = await Promise.allSettled(sendTasks);
  const supportFailed = results[0]?.status === "rejected";
  if (supportFailed) {
    throw results[0].reason;
  }

  if (results[1]?.status === "rejected") {
    console.warn("⚠️ Host payout confirmation email failed:", results[1].reason);
  }

  console.log("✅ Payout notifications sent (support + host where available)");
}

async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const recipient = getSafeRecipientEmail({ primaryEmail: toEmail });
  if (!recipient) {
    throw new Error("Invalid recipient email");
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(
        buildBrevoSmtpPayload({
          senderName: "Merry 360 Experiences",
          senderEmail: "support@merry360x.com",
          to: [{ email: recipient.email, name: toName }],
          subject,
          htmlContent,
          textContent,
          tags: ["payout"],
        })
      ),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("❌ Brevo API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log("✅ Payout notification email sent successfully:", recipient.email);
    return result;
  } catch (error) {
    console.error("❌ Error sending payout email:", toEmail, error);
    throw error;
  }
}
