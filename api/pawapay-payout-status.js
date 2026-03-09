import { createClient } from "@supabase/supabase-js";
import {
  buildBrevoSmtpPayload,
  escapeHtml,
  keyValueRows,
  renderMinimalEmail,
  validateRecipientEmail,
} from "../lib/email-template-kit.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.pawapay.cloud";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function mapPawaPayPayoutStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return "completed";
  if (normalized === "FAILED" || normalized === "REJECTED" || normalized === "CANCELLED") return "rejected";
  return "processing";
}

function parsePawaPayResponse(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  return payload || null;
}

function buildErrorMessage(payoutData) {
  return (
    payoutData?.rejectionReason?.rejectionMessage ||
    payoutData?.failureReason?.failureMessage ||
    payoutData?.errorMessage ||
    payoutData?.message ||
    "Payout failed"
  );
}

function buildPayoutResultEmailHtml({ status, amount, currency, method, reason }) {
  const statusLabel = status === "completed" ? "Completed" : "Rejected";
  const methodLabel = method === "mobile_money" ? "Mobile Money" : "Bank Transfer";
  const details = keyValueRows([
    { label: "Amount", value: `${escapeHtml(currency || "")}&nbsp;${escapeHtml(Number(amount || 0).toLocaleString())}` },
    { label: "Method", value: escapeHtml(methodLabel) },
    { label: "Status", value: escapeHtml(statusLabel) },
    { label: "Updated", value: escapeHtml(new Date().toLocaleString("en-US")) },
    { label: "Reason", value: escapeHtml(reason || "N/A") },
  ]);

  return renderMinimalEmail({
    eyebrow: "Payout Update",
    title: status === "completed" ? "Your payout is complete" : "Your payout could not be completed",
    subtitle:
      status === "completed"
        ? "Funds have been sent to your selected payout method."
        : "Your payout request was not completed. Please review details and request again if needed.",
    bodyHtml: details,
    ctaText: "Open Host Dashboard",
    ctaUrl: "https://merry360x.com/host-dashboard",
  });
}

async function sendHostPayoutStatusEmail({ toEmail, toName, status, amount, currency, method, reason }) {
  if (!BREVO_API_KEY) return { skipped: true, reason: "BREVO_API_KEY missing" };

  const recipient = validateRecipientEmail(toEmail);
  if (!recipient.ok) return { skipped: true, reason: "Invalid recipient" };

  const htmlContent = buildPayoutResultEmailHtml({ status, amount, currency, method, reason });
  const subject =
    status === "completed"
      ? `Payout Completed: ${currency} ${Number(amount || 0).toLocaleString()}`
      : `Payout Update: ${currency} ${Number(amount || 0).toLocaleString()}`;

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
        to: [{ email: recipient.email, name: toName || "Host" }],
        subject,
        htmlContent,
        tags: ["payout", "payout-status"],
      })
    ),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Brevo request failed (${response.status})`);
  }

  return { sent: true };
}

async function fetchPawaPayPayout(pawapayPayoutId) {
  const url = `${PAWAPAY_BASE_URL}/payouts/${pawapayPayoutId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAWAPAY_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { message: text };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: parsed?.errorMessage || parsed?.message || `PawaPay request failed (${response.status})`,
      payload: parsed,
    };
  }

  return {
    ok: true,
    payload: parsePawaPayResponse(parsed),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Supabase server configuration is missing" });
  }

  if (!PAWAPAY_API_KEY) {
    return json(res, 500, { error: "PawaPay server configuration is missing" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const isGet = req.method === "GET";
    const query = isGet ? req.query : {};
    const body = !isGet ? (req.body || {}) : {};

    const syncAll = String(query.syncAll || body.syncAll || "").toLowerCase() === "1" || String(query.syncAll || body.syncAll || "").toLowerCase() === "true";
    const limit = Number(query.limit || body.limit || 25);
    const payoutId = query.payoutId || body.payoutId || null;
    const payoutIds = Array.isArray(body.payoutIds) ? body.payoutIds.filter(Boolean) : [];

    let payoutsToCheck = [];

    if (syncAll) {
      const { data, error } = await supabase
        .from("host_payouts")
        .select("id, host_id, amount, currency, payout_method, status, pawapay_payout_id")
        .eq("status", "processing")
        .not("pawapay_payout_id", "is", null)
        .order("updated_at", { ascending: true })
        .limit(Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 25);

      if (error) throw error;
      payoutsToCheck = data || [];
    } else if (payoutId) {
      const { data, error } = await supabase
        .from("host_payouts")
        .select("id, host_id, amount, currency, payout_method, status, pawapay_payout_id")
        .eq("id", payoutId)
        .single();

      if (error) throw error;
      payoutsToCheck = data ? [data] : [];
    } else if (payoutIds.length > 0) {
      const { data, error } = await supabase
        .from("host_payouts")
        .select("id, host_id, amount, currency, payout_method, status, pawapay_payout_id")
        .in("id", payoutIds);

      if (error) throw error;
      payoutsToCheck = data || [];
    } else {
      return json(res, 400, { error: "Provide payoutId, payoutIds, or syncAll=1" });
    }

    const results = [];
    let updatedCount = 0;

    for (const payout of payoutsToCheck) {
      if (!payout?.pawapay_payout_id) {
        results.push({ id: payout?.id, updated: false, reason: "Missing pawapay_payout_id" });
        continue;
      }

      const providerResult = await fetchPawaPayPayout(payout.pawapay_payout_id);
      if (!providerResult.ok) {
        results.push({
          id: payout.id,
          updated: false,
          status: payout.status,
          pawapayPayoutId: payout.pawapay_payout_id,
          error: providerResult.error,
        });
        continue;
      }

      const providerPayload = providerResult.payload || {};
      const pawapayStatus = String(providerPayload.status || "").toUpperCase();
      const nextStatus = mapPawaPayPayoutStatus(pawapayStatus);

      const updatePayload = {
        status: nextStatus,
        admin_notes:
          nextStatus === "rejected"
            ? `PawaPay Status: ${pawapayStatus}. ${buildErrorMessage(providerPayload)}`
            : `PawaPay Status: ${pawapayStatus || "UNKNOWN"}`,
        updated_at: new Date().toISOString(),
      };

      const shouldUpdate = payout.status !== nextStatus;
      if (shouldUpdate) {
        const { error: updateError } = await supabase
          .from("host_payouts")
          .update(updatePayload)
          .eq("id", payout.id);

        if (updateError) {
          results.push({
            id: payout.id,
            updated: false,
            status: payout.status,
            pawapayStatus,
            error: updateError.message,
          });
          continue;
        }

        updatedCount += 1;

        // Notify host only when payout transitions from processing to a terminal state.
        if (payout.status === "processing" && (nextStatus === "completed" || nextStatus === "rejected")) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", payout.host_id)
              .single();

            const reason = nextStatus === "rejected" ? buildErrorMessage(providerPayload) : null;
            await sendHostPayoutStatusEmail({
              toEmail: profile?.email,
              toName: profile?.full_name,
              status: nextStatus,
              amount: payout.amount,
              currency: payout.currency,
              method: payout.payout_method,
              reason,
            });
          } catch (emailError) {
            console.warn("Host payout status email failed", {
              payoutId: payout.id,
              error: emailError?.message || String(emailError),
            });
          }
        }
      }

      results.push({
        id: payout.id,
        updated: shouldUpdate,
        previousStatus: payout.status,
        status: nextStatus,
        pawapayStatus,
      });
    }

    return json(res, 200, {
      success: true,
      checkedCount: payoutsToCheck.length,
      updatedCount,
      results,
    });
  } catch (error) {
    console.error("Payout status sync error:", error);
    return json(res, 500, {
      error: "Payout status sync failed",
      message: error?.message || "Unexpected error",
    });
  }
}
