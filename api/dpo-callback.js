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
    const token =
      safeStr(req.query?.TransactionToken ?? "", 200) ||
      safeStr(req.query?.TransToken ?? "", 200) ||
      safeStr(req.query?.token ?? "", 200) ||
      safeStr(req.query?.ID ?? "", 200);

    if (!checkoutId) return redirect(res, `${origin}/checkout?status=error`);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch checkout request
    const { data: cr, error } = await supabaseAdmin
      .from("checkout_requests")
      .select("*")
      .eq("id", checkoutId)
      .maybeSingle();
    if (error || !cr?.id) return redirect(res, `${origin}/checkout?status=error`);

    // Try to verify with DPO (best-effort). If verification isn't configured, we still mark as paid
    // and rely on your ops to reconcile in DPO dashboard.
    const verification = token ? await verifyWithDpo(token) : null;
    const transStatus = verification?.transStatus || null;
    const isPaid =
      (verification?.result && verification.result === "000" && transStatus && String(transStatus).toLowerCase() === "paid") ||
      (!verification && Boolean(token)); // fallback if DPO verification not configured

    if (!isPaid) {
      await supabaseAdmin
        .from("checkout_requests")
        .update({
          payment_status: "failed",
          meta: { ...(cr.meta ?? {}), dpo_verify: verification ?? null },
        })
        .eq("id", checkoutId);
      return redirect(res, `${origin}/checkout?status=failed&checkoutId=${encodeURIComponent(checkoutId)}`);
    }

    await supabaseAdmin
      .from("checkout_requests")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        provider_token: cr.provider_token ?? token ?? null,
        meta: { ...(cr.meta ?? {}), dpo_verify: verification ?? null },
      })
      .eq("id", checkoutId);

    // Post-payment effects:
    // - booking mode: create a bookings row
    // - cart mode: clear user's trip_cart_items (if user_id present)
    const mode = safeStr(cr.mode ?? "cart", 20);
    if (mode === "booking") {
      const items = Array.isArray(cr.items) ? cr.items : [];
      const stay = items.find((i) => i && i.item_type === "property");
      if (stay?.reference_id) {
        const { data: prop } = await supabaseAdmin
          .from("properties")
          .select("host_id,currency,price_per_night")
          .eq("id", String(stay.reference_id))
          .maybeSingle();
        const bookingPayload = {
          property_id: String(stay.reference_id),
          host_id: prop?.host_id ?? null,
          check_in: safeStr(stay.start_date ?? cr.meta?.check_in ?? "", 20),
          check_out: safeStr(stay.end_date ?? cr.meta?.check_out ?? "", 20),
          guests_count: Math.max(1, Number(stay.guests ?? cr.meta?.guests ?? 1)),
          total_price: Number(cr.amount ?? 0),
          currency: safeStr(cr.currency ?? prop?.currency ?? "RWF", 10),
          status: "pending",
          guest_id: cr.user_id ?? null,
          is_guest_booking: cr.user_id ? false : true,
          guest_name: cr.user_id ? null : cr.name,
          guest_email: cr.user_id ? null : cr.email,
          guest_phone: cr.user_id ? null : cr.phone,
        };
        await supabaseAdmin.from("bookings").insert(bookingPayload);
      }
    } else {
      if (cr.user_id) {
        await supabaseAdmin.from("trip_cart_items").delete().eq("user_id", cr.user_id);
      }
    }

    return redirect(res, `${origin}/checkout?status=paid&checkoutId=${encodeURIComponent(checkoutId)}`);
  } catch {
    return redirect(res, `${origin}/checkout?status=error`);
  }
}

