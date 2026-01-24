import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DPO verification settings (optional but recommended)
const DPO_COMPANY_TOKEN = process.env.DPO_COMPANY_TOKEN;
const DPO_API_URL = process.env.DPO_API_URL || "https://secure.3gdirectpay.com/API/v6/";

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end();
}

function originFromReq(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").toString();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
  return host ? `${proto}://${host}` : "";
}

function safeStr(x, max = 500) {
  const s = typeof x === "string" ? x : "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function pickFirstTag(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function xmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function verifyWithDpo(token) {
  if (!DPO_COMPANY_TOKEN || !token) return null;
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${xmlEscape(DPO_COMPANY_TOKEN)}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${xmlEscape(token)}</TransactionToken>
</API3G>`;

  try {
    const r = await fetch(DPO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xml,
    });
    const txt = await r.text();
    if (!r.ok) return null;
    return {
      result: pickFirstTag(txt, "Result"),
      explanation: pickFirstTag(txt, "ResultExplanation"),
      transStatus: pickFirstTag(txt, "TransStatus"),
      transRef: pickFirstTag(txt, "TransRef"),
      xml: txt,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const origin = originFromReq(req);
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return redirect(res, `${origin}/checkout?status=error`);
    }

    const checkoutId = safeStr(req.query?.checkoutId ?? "", 80);
    const bookingId = safeStr(req.query?.bookingId ?? "", 80);
    const orderId = safeStr(req.query?.orderId ?? "", 80);
    const token =
      safeStr(req.query?.TransactionToken ?? "", 200) ||
      safeStr(req.query?.TransToken ?? "", 200) ||
      safeStr(req.query?.token ?? "", 200) ||
      safeStr(req.query?.ID ?? "", 200);

    if (!checkoutId && !bookingId && !orderId) {
      return redirect(res, `${origin}/checkout?status=error`);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try to verify with DPO (best-effort)
    const verification = token ? await verifyWithDpo(token) : null;
    const transStatus = verification?.transStatus || null;
    const isPaid =
      (verification?.result && verification.result === "000" && transStatus && String(transStatus).toLowerCase() === "paid") ||
      (!verification && Boolean(token));

    if (!isPaid) {
      // Update booking(s) to failed status
      if (bookingId) {
        await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "failed" })
          .eq("id", bookingId);
      } else if (orderId) {
        await supabaseAdmin
          .from("bookings")
          .update({ payment_status: "failed" })
          .eq("order_id", orderId);
      }
      return redirect(res, `${origin}/checkout?status=failed`);
    }

    // Update booking(s) to paid and confirmed
    if (bookingId) {
      // Single booking
      await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("id", bookingId);
      return redirect(res, `${origin}/checkout?status=paid&bookingId=${encodeURIComponent(bookingId)}`);
    } else if (orderId) {
      // Bulk booking (cart checkout)
      await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
        })
        .eq("order_id", orderId);
      return redirect(res, `${origin}/checkout?status=paid&orderId=${encodeURIComponent(orderId)}`);
    }

    return redirect(res, `${origin}/checkout?status=error`);
  } catch {
    return redirect(res, `${origin}/checkout?status=error`);
  }
}

