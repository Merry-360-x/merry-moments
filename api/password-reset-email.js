import { createClient } from "@supabase/supabase-js";
import { escapeHtml, renderMinimalEmail } from "../lib/email-template-kit.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function buildResetHtml(actionLink, email) {
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
  if (req.method === "OPTIONS") {
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

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

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      return json(res, 200, { ok: true });
    }

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
            email,
          },
        ],
        subject: "Reset your Merry360X password",
        htmlContent: buildResetHtml(actionLink, email),
      }),
    });

    if (!response.ok) {
      return json(res, 200, { ok: true, skipped: true });
    }

    return json(res, 200, { ok: true });
  } catch {
    return json(res, 200, { ok: true, skipped: true });
  }
}
