// API endpoint to send email notification when a payout is requested

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = process.env.SUPPORT_EMAIL || "davyncidavy@gmail.com";

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
  const detailsHtml = payout.method === 'mobile_money' 
    ? `<p style="margin: 4px 0;"><strong>Phone:</strong> ${payout.phone || 'N/A'}</p>`
    : `
      <p style="margin: 4px 0;"><strong>Bank:</strong> ${payout.bankName || 'N/A'}</p>
      <p style="margin: 4px 0;"><strong>Account:</strong> ${payout.bankAccount || 'N/A'}</p>
    `;

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
      <td style="padding: 24px; background-color: #16a34a; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">💰 New Payout Request</h1>
      </td>
    </tr>
    
    <!-- Alert Banner -->
    <tr>
      <td style="padding: 16px 24px; background-color: #fef3c7; border-bottom: 1px solid #fcd34d;">
        <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">⚡ Action Required - Host requests payout</p>
      </td>
    </tr>
    
    <!-- Host Info -->
    <tr>
      <td style="padding: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Host Details</h3>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${payout.hostName || 'N/A'}</p>
          <p style="margin: 0;"><strong>Email:</strong> ${payout.hostEmail || 'N/A'}</p>
        </div>
      </td>
    </tr>
    
    <!-- Amount -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Payout Amount</h3>
        <div style="background-color: #dcfce7; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #16a34a; font-size: 32px; font-weight: 700;">${payout.currency} ${Number(payout.amount).toLocaleString()}</p>
        </div>
      </td>
    </tr>
    
    <!-- Payment Method -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</h3>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>Method:</strong> ${methodDisplay}</p>
          ${detailsHtml}
          <p style="margin: 4px 0;"><strong>Account Name:</strong> ${payout.accountName || 'N/A'}</p>
        </div>
      </td>
    </tr>
    
    <!-- Timestamp -->
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <p style="margin: 0; color: #6b7280; font-size: 13px;">Requested: ${createdAt}</p>
      </td>
    </tr>
    
    <!-- Action Button -->
    <tr>
      <td style="padding: 0 24px 24px 24px; text-align: center;">
        <a href="https://merry360x.com/admin-dashboard" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Process in Admin Dashboard →
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 24px; background-color: #f3f4f6; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">Merry Moments - Host Payout System</p>
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

  try {
    const payout = req.body;
    
    if (!payout || !payout.amount) {
      return json(res, 400, { error: "Missing payout data" });
    }

    console.log("📧 Sending payout notification email for:", payout.amount, payout.currency);

    // Send email notification
    await sendPayoutEmail(payout);

    return json(res, 200, { success: true, message: "Notification sent" });
  } catch (error) {
    console.error("❌ Payout notification error:", error);
    return json(res, 500, { error: error.message || "Failed to send notification" });
  }
}

async function sendPayoutEmail(payout) {
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
        to: [{ email: ADMIN_EMAIL, name: "Merry Moments Admin" }],
        subject: `💰 Payout Request: ${payout.currency} ${Number(payout.amount).toLocaleString()} - ${payout.hostName || 'Host'}`,
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
