export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function keyValueRows(rows = []) {
  const safeRows = rows.filter((row) => row && row.label && row.value !== undefined && row.value !== null && row.value !== "");
  if (!safeRows.length) return "";

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
  ${safeRows
    .map(
      (row) => `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">${escapeHtml(row.label)}</td>
      <td style="padding: 8px 0; color: #111827; font-size: 13px; text-align: right; font-weight: 500;">${row.value}</td>
    </tr>`
    )
    .join("")}
</table>`;
}

const DEFAULT_FROM_NAME = "Merry Moments";
const DEFAULT_FROM_EMAIL = "support@merry360x.com";
const DEFAULT_LIGHT_LOGO = "https://merry360x.com/brand/logo.png";
const DEFAULT_DARK_LOGO = "https://merry360x.com/brand/logo-dark.png";

function htmlToText(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildBrevoSmtpPayload({
  to,
  subject,
  htmlContent,
  textContent,
  senderName = DEFAULT_FROM_NAME,
  senderEmail = DEFAULT_FROM_EMAIL,
  replyTo,
  tags,
  attachment,
}) {
  const resolvedReplyTo =
    replyTo && replyTo.email
      ? { email: replyTo.email, ...(replyTo.name ? { name: replyTo.name } : {}) }
      : { email: senderEmail, name: senderName };

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to,
    replyTo: resolvedReplyTo,
    subject,
    htmlContent,
    textContent: textContent || htmlToText(htmlContent),
    headers: {
      "X-Mailer": "Merry Moments Transactional",
      "X-Entity-Ref-ID": `merry-${Date.now()}`,
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
    },
  };

  if (Array.isArray(tags) && tags.length) {
    payload.tags = tags;
  }

  if (Array.isArray(attachment) && attachment.length) {
    payload.attachment = attachment;
  }

  return payload;
}

export function renderMinimalEmail({
  title,
  subtitle,
  eyebrow,
  bodyHtml,
  ctaText,
  ctaUrl,
  footerText = "Merry Moments · Book local. Travel better.",
  footerLink = "https://merry360x.com",
  supportEmail = "support@merry360x.com",
  lightLogoUrl = process.env.EMAIL_LOGO_LIGHT_URL || DEFAULT_LIGHT_LOGO,
  darkLogoUrl = process.env.EMAIL_LOGO_DARK_URL || DEFAULT_DARK_LOGO,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(title || "Merry Moments")}</title>
  <style>
    .logo-dark {
      display: none !important;
      max-height: 0 !important;
      overflow: hidden !important;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-bg {
        background: #0f172a !important;
      }
      .email-card {
        background: #111827 !important;
        border-color: #374151 !important;
      }
      .email-divider {
        background: #374151 !important;
      }
      .email-title {
        color: #f9fafb !important;
      }
      .email-subtitle,
      .email-eyebrow {
        color: #d1d5db !important;
      }
      .logo-light {
        display: none !important;
        max-height: 0 !important;
        overflow: hidden !important;
      }
      .logo-dark {
        display: inline-block !important;
        max-height: none !important;
      }
      .email-footer {
        background: #1f2937 !important;
        border-top-color: #374151 !important;
      }
      .email-footer p,
      .email-footer a {
        color: #d1d5db !important;
      }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-bg" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-card" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;">
              <img src="${escapeHtml(lightLogoUrl)}" alt="Merry Moments" width="44" height="44" class="logo-light" style="display:inline-block;border-radius:10px;" />
              <img src="${escapeHtml(darkLogoUrl)}" alt="Merry Moments" width="44" height="44" class="logo-dark" style="border-radius:10px;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;text-align:center;">
              ${eyebrow ? `<p class="email-eyebrow" style="margin:0 0 8px;color:#6b7280;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>` : ""}
              <h1 class="email-title" style="margin:0;color:#111827;font-size:24px;line-height:1.3;">${escapeHtml(title || "Update")}</h1>
              ${subtitle ? `<p class="email-subtitle" style="margin:10px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">${escapeHtml(subtitle)}</p>` : ""}
            </td>
          </tr>
          <tr><td style="padding:16px 28px 0;"><div class="email-divider" style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr>
            <td style="padding:20px 28px;">
              ${bodyHtml || ""}
            </td>
          </tr>
          ${ctaText && ctaUrl ? `
          <tr>
            <td style="padding:4px 28px 24px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(ctaText)}</a>
            </td>
          </tr>` : ""}
          <tr>
            <td class="email-footer" style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;">${escapeHtml(footerText)}</p>
              <p style="margin:6px 0 0;font-size:11px;"><a href="${footerLink}" style="color:#6b7280;text-decoration:none;">${escapeHtml(footerLink.replace("https://", ""))}</a> · <a href="mailto:${supportEmail}" style="color:#6b7280;text-decoration:none;">${escapeHtml(supportEmail)}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
