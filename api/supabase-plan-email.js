import {
  buildBrevoSmtpPayload,
  escapeHtml,
  getSafeRecipientEmail,
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

function renderPlanEmailHtml({ recipientName, planName, monthlyPriceUsd, includedApiCalls, includedApiRequests, additionalStorageGb }) {
  const safeName = escapeHtml(recipientName || "there");
  const safePlanName = escapeHtml(planName || "Spartan");
  const safeMonthlyPrice = Number(monthlyPriceUsd || 30);
  const safeApiCalls = Number(includedApiCalls || 30);
  const safeApiRequests = Number(includedApiRequests || 1000000);
  const safeAdditionalStorageGb = Number(additionalStorageGb || 5);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Supabase Plan Update</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
    <tr>
      <td style="padding:28px 28px 10px;text-align:center;">
        <img src="https://supabase.com/favicon/favicon-32x32.png" alt="Supabase" width="44" height="44" style="display:inline-block;border-radius:10px;background:#111827;padding:6px;" />
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 8px;text-align:center;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Billing Update</p>
        <h1 style="margin:0;color:#111827;font-size:28px;line-height:1.3;">Your New Supabase Plan: ${safePlanName}</h1>
        <p style="margin:10px 0 0;color:#4b5563;font-size:15px;line-height:1.6;">Plan activation confirmation and included capacity overview.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 0;"><div style="height:1px;background:#e5e7eb;"></div></td>
    </tr>
    <tr>
      <td style="padding:22px 28px 12px;">
        <p style="margin:0 0 14px;color:#111827;font-size:16px;line-height:1.7;">Hi ${safeName},</p>
        <p style="margin:0 0 14px;color:#111827;font-size:15px;line-height:1.7;">This message confirms that your Supabase subscription has been updated to the <strong>${safePlanName}</strong> plan.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:14px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Monthly Price</td>
            <td style="padding:14px 16px;color:#111827;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">$${safeMonthlyPrice.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Included API Calls</td>
            <td style="padding:14px 16px;color:#111827;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">${safeApiCalls.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Included API Requests</td>
            <td style="padding:14px 16px;color:#111827;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb;">${safeApiRequests.toLocaleString('en-US')}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;color:#6b7280;font-size:13px;">Additional Storage</td>
            <td style="padding:14px 16px;color:#111827;font-size:13px;text-align:right;font-weight:600;">${safeAdditionalStorageGb.toLocaleString('en-US')} GB</td>
          </tr>
        </table>

        <p style="margin:16px 0 0;color:#111827;font-size:14px;line-height:1.7;">You can review usage, billing history, and limits from your Supabase dashboard at any time.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 24px;text-align:center;">
        <a href="https://supabase.com/dashboard" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Open Supabase Dashboard</a>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#6b7280;font-size:12px;">Supabase Inc, 3500 S. DuPont Highway, Kent 19901, Dover, Delaware, USA</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendPlanEmail({ toEmail, toName, planName, monthlyPriceUsd, includedApiCalls, includedApiRequests, additionalStorageGb }) {
  if (!BREVO_API_KEY) {
    return { skipped: true, reason: "missing_brevo_api_key" };
  }

  const recipient = getSafeRecipientEmail({ primaryEmail: toEmail });
  if (!recipient) {
    throw new Error("Invalid recipient email");
  }

  const htmlContent = renderPlanEmailHtml({
    recipientName: toName,
    planName,
    monthlyPriceUsd,
    includedApiCalls,
    includedApiRequests,
    additionalStorageGb,
  });

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(
      buildBrevoSmtpPayload({
        to: [{ email: recipient.email, name: toName || "there" }],
        subject: `Supabase Plan Update: ${planName || "Spartan"}`,
        htmlContent,
        tags: ["supabase", "billing", "plan-update"],
      })
    ),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.message || "Failed to send plan email");
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
    const name = String(body?.name || "there").trim();

    const emailValidation = validateRecipientEmail(email);
    if (!emailValidation.ok) {
      return json(res, 400, { error: "Valid email is required" });
    }

    const result = await sendPlanEmail({
      toEmail: emailValidation.email,
      toName: name || "there",
      planName: String(body?.planName || "Spartan"),
      monthlyPriceUsd: Number(body?.monthlyPriceUsd || 30),
      includedApiCalls: Number(body?.includedApiCalls || 30),
      includedApiRequests: Number(body?.includedApiRequests || 1000000),
      additionalStorageGb: Number(body?.additionalStorageGb || 5),
    });

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("[supabase-plan-email] failed:", error);
    return json(res, 500, { error: error?.message || "Failed to send plan email" });
  }
}
