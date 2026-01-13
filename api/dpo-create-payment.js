import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DPO / 3G Direct Pay settings (you will set these in Vercel env vars)
const DPO_COMPANY_TOKEN = process.env.DPO_COMPANY_TOKEN;
const DPO_SERVICE_TYPE = process.env.DPO_SERVICE_TYPE; // numeric string from DPO
const DPO_API_URL = process.env.DPO_API_URL || "https://secure.3gdirectpay.com/API/v6/";
const DPO_PAY_URL = process.env.DPO_PAY_URL || "https://secure.3gdirectpay.com/payv2.php";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
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

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function xmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pickFirstTag(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

async function getUsdRates() {
  // Simple server-side rates fetch (no cache). If it fails, return null.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const rates = j?.rates;
    if (!rates || typeof rates !== "object") return null;
    rates.USD = 1;
    return rates;
  } catch {
    return null;
  }
}

function convertAmount(amount, from, to, usdRates) {
  const a = Number.isFinite(amount) ? Number(amount) : 0;
  const f = String(from || "RWF").toUpperCase();
  const t = String(to || "RWF").toUpperCase();
  if (f === t) return a;
  if (!usdRates) return null;
  const rf = usdRates[f];
  const rt = usdRates[t];
  if (!rf || !rt) return null;
  const usd = a / rf;
  const out = usd * rt;
  return Number.isFinite(out) ? out : null;
}

async function verifyUserFromAuthHeader(supabaseAdmin, req) {
  const auth = safeStr(req.headers.authorization || "", 2000);
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return null;
    return data?.user ?? null;
  } catch {
    return null;
  }
}

async function computeCartTotal(supabase, userId, guestItems, payCurrency) {
  // Returns { amount, currency, items }
  const usdRates = await getUsdRates();

  const items = Array.isArray(guestItems) ? guestItems : [];
  if (userId) {
    const { data, error } = await supabase
      .from("trip_cart_items")
      .select("item_type, reference_id, quantity, start_date, end_date")
      .eq("user_id", userId);
    if (error) throw error;
    const dbItems = data ?? [];
    const hydrated = [];

    for (const it of dbItems) {
      hydrated.push({
        item_type: it.item_type,
        reference_id: String(it.reference_id),
        quantity: Number(it.quantity ?? 1),
        start_date: it.start_date ?? null,
        end_date: it.end_date ?? null,
      });
    }

    // Price lookup per item type
    let total = 0;
    for (const it of hydrated) {
      const qty = Math.max(1, Number(it.quantity || 1));
      if (it.item_type === "tour") {
        const { data: row } = await supabase.from("tours").select("price_per_person,currency").eq("id", it.reference_id).maybeSingle();
        const unit = safeNum(row?.price_per_person);
        const cur = safeStr(row?.currency || "RWF", 10);
        const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
        total += conv == null ? unit * qty : conv;
      } else if (it.item_type === "transport_vehicle") {
        const { data: row } = await supabase
          .from("transport_vehicles")
          .select("price_per_day,currency")
          .eq("id", it.reference_id)
          .maybeSingle();
        const unit = safeNum(row?.price_per_day);
        const cur = safeStr(row?.currency || "RWF", 10);
        const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
        total += conv == null ? unit * qty : conv;
      } else if (it.item_type === "transport_route") {
        const { data: row } = await supabase
          .from("transport_routes")
          .select("base_price,currency")
          .eq("id", it.reference_id)
          .maybeSingle();
        const unit = safeNum(row?.base_price);
        const cur = safeStr(row?.currency || "RWF", 10);
        const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
        total += conv == null ? unit * qty : conv;
      } else if (it.item_type === "property") {
        // If property is in cart without dates, treat as 1 night for quoting purposes.
        const { data: row } = await supabase
          .from("properties")
          .select("price_per_night,currency")
          .eq("id", it.reference_id)
          .maybeSingle();
        const unit = safeNum(row?.price_per_night);
        const cur = safeStr(row?.currency || "RWF", 10);
        const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
        total += conv == null ? unit * qty : conv;
      }
    }

    return { amount: Math.max(0, total), currency: payCurrency, items: hydrated };
  }

  // Guest cart: expect [{item_type, reference_id, quantity}]
  if (!items.length) return { amount: 0, currency: payCurrency, items: [] };

  let total = 0;
  const normalized = items.map((i) => ({
    item_type: safeStr(i?.item_type ?? "", 40),
    reference_id: safeStr(i?.reference_id ?? "", 80),
    quantity: Math.max(1, safeNum(i?.quantity ?? 1)),
  }));

  for (const it of normalized) {
    const qty = it.quantity;
    if (it.item_type === "tour") {
      const { data: row } = await supabase.from("tours").select("price_per_person,currency").eq("id", it.reference_id).maybeSingle();
      const unit = safeNum(row?.price_per_person);
      const cur = safeStr(row?.currency || "RWF", 10);
      const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
      total += conv == null ? unit * qty : conv;
    } else if (it.item_type === "transport_vehicle") {
      const { data: row } = await supabase
        .from("transport_vehicles")
        .select("price_per_day,currency")
        .eq("id", it.reference_id)
        .maybeSingle();
      const unit = safeNum(row?.price_per_day);
      const cur = safeStr(row?.currency || "RWF", 10);
      const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
      total += conv == null ? unit * qty : conv;
    } else if (it.item_type === "transport_route") {
      const { data: row } = await supabase
        .from("transport_routes")
        .select("base_price,currency")
        .eq("id", it.reference_id)
        .maybeSingle();
      const unit = safeNum(row?.base_price);
      const cur = safeStr(row?.currency || "RWF", 10);
      const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
      total += conv == null ? unit * qty : conv;
    } else if (it.item_type === "property") {
      const { data: row } = await supabase.from("properties").select("price_per_night,currency").eq("id", it.reference_id).maybeSingle();
      const unit = safeNum(row?.price_per_night);
      const cur = safeStr(row?.currency || "RWF", 10);
      const conv = convertAmount(unit * qty, cur, payCurrency, usdRates);
      total += conv == null ? unit * qty : conv;
    }
  }

  return { amount: Math.max(0, total), currency: payCurrency, items: normalized };
}

async function computeBookingTotal(supabase, propertyId, checkIn, checkOut, payCurrency) {
  const { data: p, error } = await supabase
    .from("properties")
    .select("id,title,name,price_per_night,currency,host_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  if (!p?.id) throw new Error("Property not found");

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (!Number.isFinite(nights) || nights <= 0) throw new Error("Invalid dates");

  const total = safeNum(p.price_per_night) * nights;
  const usdRates = await getUsdRates();
  const conv = convertAmount(total, safeStr(p.currency || "RWF", 10), payCurrency, usdRates);
  return {
    amount: Math.max(0, conv == null ? total : conv),
    currency: payCurrency,
    nights,
    property: {
      id: p.id,
      title: p.title ?? p.name ?? "Accommodation",
      host_id: p.host_id ?? null,
    },
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
    if (!SUPABASE_URL) return json(res, 500, { error: "Missing SUPABASE_URL" });
    if (!SUPABASE_SERVICE_ROLE_KEY) return json(res, 500, { error: "Missing SUPABASE_SERVICE_ROLE_KEY" });

    // We allow this route to run even if DPO vars are missing, but it will return a clear error.
    if (!DPO_COMPANY_TOKEN || !DPO_SERVICE_TYPE) {
      return json(res, 500, {
        error: "Missing DPO env vars",
        missing: ["DPO_COMPANY_TOKEN", "DPO_SERVICE_TYPE"].filter((k) => !process.env[k]),
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const mode = safeStr(body?.mode ?? "cart", 20);
    const payCurrency = safeStr(body?.payCurrency ?? "RWF", 10).toUpperCase() || "RWF";

    const name = safeStr(body?.name ?? "", 200);
    const email = safeStr(body?.email ?? "", 200).toLowerCase();
    const phone = safeStr(body?.phone ?? "", 50) || null;
    const message = safeStr(body?.message ?? "", 1000) || null;

    if (!name) return json(res, 400, { error: "Name required" });
    if (!email || !email.includes("@")) return json(res, 400, { error: "Valid email required" });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authedUser = await verifyUserFromAuthHeader(supabaseAdmin, req);
    const userId = authedUser?.id ?? null;

    const origin = originFromReq(req);
    const callbackUrl = `${origin}/api/dpo-callback`;

    let amount = 0;
    let items = [];
    let meta = {};

    if (mode === "booking") {
      const propertyId = safeStr(body?.propertyId ?? "", 80);
      const checkIn = safeStr(body?.checkIn ?? "", 20);
      const checkOut = safeStr(body?.checkOut ?? "", 20);
      const guests = Math.max(1, safeNum(body?.guests ?? 1));
      if (!propertyId) return json(res, 400, { error: "propertyId required" });
      const booking = await computeBookingTotal(supabaseAdmin, propertyId, checkIn, checkOut, payCurrency);
      amount = booking.amount;
      items = [
        {
          item_type: "property",
          reference_id: propertyId,
          quantity: 1,
          start_date: checkIn,
          end_date: checkOut,
          guests,
        },
      ];
      meta = {
        mode: "booking",
        property_id: propertyId,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        nights: booking.nights,
        property_title: booking.property.title,
        host_id: booking.property.host_id,
      };
    } else {
      const guestItems = body?.guestItems ?? [];
      const cart = await computeCartTotal(supabaseAdmin, userId, guestItems, payCurrency);
      amount = cart.amount;
      items = cart.items;
      meta = { mode: "cart" };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return json(res, 400, { error: "Nothing to pay for" });
    }

    // Create a checkout request record first (source of truth)
    const { data: cr, error: crErr } = await supabaseAdmin
      .from("checkout_requests")
      .insert({
        user_id: userId,
        name,
        email,
        phone,
        message,
        items,
        status: "pending",
        mode,
        amount,
        currency: payCurrency,
        payment_provider: "dpo",
        payment_status: "initiated",
        meta,
      })
      .select("id")
      .maybeSingle();
    if (crErr) throw crErr;
    const checkoutId = cr?.id;
    if (!checkoutId) throw new Error("Failed to create checkout request");

    // CreateToken request (Hosted Payment Page)
    const companyRef = `merry360x-${checkoutId}`;
    const redirectUrl = `${origin}/checkout?status=paid&checkoutId=${encodeURIComponent(checkoutId)}`;
    const backUrl = `${origin}/checkout?status=cancelled&checkoutId=${encodeURIComponent(checkoutId)}`;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${xmlEscape(DPO_COMPANY_TOKEN)}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${xmlEscape(amount.toFixed(2))}</PaymentAmount>
    <PaymentCurrency>${xmlEscape(payCurrency)}</PaymentCurrency>
    <CompanyRef>${xmlEscape(companyRef)}</CompanyRef>
    <RedirectURL>${xmlEscape(callbackUrl + `?checkoutId=${encodeURIComponent(checkoutId)}`)}</RedirectURL>
    <BackURL>${xmlEscape(backUrl)}</BackURL>
    <CompanyRefUnique>0</CompanyRefUnique>
    <PTL>10</PTL>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${xmlEscape(DPO_SERVICE_TYPE)}</ServiceType>
      <ServiceDescription>${xmlEscape(mode === "booking" ? "Accommodation booking" : "Trip cart checkout")}</ServiceDescription>
      <ServiceDate>${xmlEscape(new Date().toISOString().slice(0, 10).replaceAll("-", "/"))}</ServiceDate>
    </Service>
  </Services>
</API3G>`;

    const r = await fetch(DPO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xml,
    });
    const txt = await r.text();
    if (!r.ok) {
      await supabaseAdmin
        .from("checkout_requests")
        .update({ payment_status: "error", meta: { ...meta, dpo_error: "http_error" } })
        .eq("id", checkoutId);
      return json(res, 502, { error: "DPO request failed" });
    }

    const result = pickFirstTag(txt, "Result");
    const token = pickFirstTag(txt, "TransToken") || pickFirstTag(txt, "TransactionToken");
    if (!token || (result && result !== "000")) {
      await supabaseAdmin
        .from("checkout_requests")
        .update({ payment_status: "error", meta: { ...meta, dpo_result: result ?? null } })
        .eq("id", checkoutId);
      return json(res, 502, { error: "Could not create DPO payment token" });
    }

    const payUrl = `${DPO_PAY_URL}?ID=${encodeURIComponent(token)}`;

    await supabaseAdmin
      .from("checkout_requests")
      .update({
        provider_token: token,
        provider_reference: companyRef,
        payment_url: payUrl,
        payment_status: "pending",
      })
      .eq("id", checkoutId);

    return json(res, 200, { checkoutId, payUrl });
  } catch (e) {
    return json(res, 500, { error: "Server error" });
  }
}

