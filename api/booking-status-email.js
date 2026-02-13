const BREVO_API_KEY = process.env.BREVO_API_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const parsed = new Date(dateStr);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function decisionEmailHtml({
  action,
  guestName,
  bookingId,
  orderId,
  itemName,
  checkIn,
  checkOut,
  rejectionReason,
}) {
  const isApproved = action === "approved";
  const title = isApproved ? "Booking Approved" : "Booking Rejected";
  const subtitle = isApproved
    ? "Your host accepted your booking request."
    : "Your host was unable to accept your booking request.";
  const badgeBg = isApproved ? "#dcfce7" : "#fee2e2";
  const badgeColor = isApproved ? "#166534" : "#991b1b";
  const icon = isApproved ? "✅" : "❌";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:24px;text-align:center;border-bottom:1px solid #f3f4f6;">
        <img src="https://merry360x.com/brand/logo.png" alt="Merry360X" width="56" height="56" style="border-radius:10px;" />
        <h1 style="margin:12px 0 4px;color:#111827;font-size:22px;">${title}</h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">${subtitle}</p>
      </td>
    </tr>

    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 16px;color:#111827;font-size:14px;">Hi ${guestName || "Guest"},</p>

        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-size:12px;font-weight:700;margin-bottom:16px;">
          ${icon} ${isApproved ? "APPROVED" : "REJECTED"}
        </div>

        <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#111827;">
          <tr><td style="padding:6px 0;color:#6b7280;">Booking</td><td style="padding:6px 0;text-align:right;font-family:monospace;">${bookingId || "—"}</td></tr>
          ${orderId ? `<tr><td style="padding:6px 0;color:#6b7280;">Order</td><td style="padding:6px 0;text-align:right;font-family:monospace;">${orderId}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#6b7280;">Service</td><td style="padding:6px 0;text-align:right;">${itemName || "Your booking"}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Check-in</td><td style="padding:6px 0;text-align:right;">${formatDate(checkIn)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Check-out</td><td style="padding:6px 0;text-align:right;">${formatDate(checkOut)}</td></tr>
        </table>

        ${!isApproved && rejectionReason ? `
        <div style="margin-top:16px;padding:12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;">
          <p style="margin:0 0 6px;color:#991b1b;font-size:12px;font-weight:700;">Reason provided by host</p>
          <p style="margin:0;color:#7f1d1d;font-size:13px;">${String(rejectionReason).replace(/</g, "&lt;")}</p>
        </div>
        ` : ""}

        <div style="margin-top:20px;text-align:center;">
          <a href="https://merry360x.com/my-bookings" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">View My Bookings</a>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 24px;background:#111827;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">Need help? <a href="mailto:support@merry360x.com" style="color:#f87171;text-decoration:none;">support@merry360x.com</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!BREVO_API_KEY) {
    return json(res, 200, { ok: true, skipped: true, reason: "No API key" });
  }

  try {
    const {
      action,
      guestEmail,
      guestName,
      bookingId,
      orderId,
      itemName,
      checkIn,
      checkOut,
      rejectionReason,
    } = req.body || {};

    if (!action || !guestEmail || !bookingId) {
      return json(res, 400, { error: "Missing required fields" });
    }

    if (!["approved", "rejected"].includes(action)) {
      return json(res, 400, { error: "Invalid action" });
    }

    const htmlContent = decisionEmailHtml({
      action,
      guestName,
      bookingId,
      orderId,
      itemName,
      checkIn,
      checkOut,
      rejectionReason,
    });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Merry360X",
          email: "support@merry360x.com",
        },
        to: [
          {
            email: guestEmail,
            name: guestName || "Guest",
          },
        ],
        subject: action === "approved"
          ? "✅ Your booking has been approved"
          : "❌ Update on your booking request",
        htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return json(res, 500, {
        error: "Failed to send booking status email",
        details: result,
      });
    }

    return json(res, 200, { ok: true, messageId: result.messageId || null });
  } catch (error) {
    return json(res, 500, { error: error.message || "Unknown error" });
  }
}
