import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv(".env");
loadEnv(".env.local");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const flwSecretKey = process.env.FLW_SECRET_KEY;
const flwEncryptionKey = process.env.FLW_ENCRYPTION_KEY;
const flwBaseUrl = process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3010";
const testEmail = process.env.FLW_TEST_EMAIL || "flutterwave-booking-test@example.com";
const previewEmail = process.env.PREVIEW_TO || testEmail;

if (!supabaseUrl || !serviceRoleKey || !flwSecretKey || !flwEncryptionKey) {
  console.error(JSON.stringify({
    ok: false,
    error: "Missing one of VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FLW_SECRET_KEY, FLW_ENCRYPTION_KEY"
  }, null, 2));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const card = {
  card_number: process.env.FLW_TEST_CARD_NUMBER || "5531886652142950",
  cvv: process.env.FLW_TEST_CARD_CVV || "564",
  expiry_month: process.env.FLW_TEST_CARD_EXPIRY_MONTH || "09",
  expiry_year: process.env.FLW_TEST_CARD_EXPIRY_YEAR || "32",
  pin: process.env.FLW_TEST_CARD_PIN || "3310",
  otp: process.env.FLW_TEST_CARD_OTP || "12345",
};

async function flwPost(path, body) {
  const res = await fetch(`${flwBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${flwSecretKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function encrypt3DES(payload, encryptionKey) {
  const cipher = crypto.createCipheriv("des-ede3", Buffer.from(encryptionKey), null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

async function flwGet(path) {
  const res = await fetch(`${flwBaseUrl}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${flwSecretKey}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const { data: tourPackage } = await supabase
  .from("tour_packages")
  .select("id")
  .limit(1)
  .maybeSingle();

const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .limit(1)
  .maybeSingle();

if (!tourPackage?.id) {
  console.error(JSON.stringify({ ok: false, error: "No tour package found to attach test booking" }, null, 2));
  process.exit(2);
}

if (!profile?.id) {
  console.error(JSON.stringify({ ok: false, error: "No profile found to attach test booking user" }, null, 2));
  process.exit(2);
}

const amount = Number(process.env.FLW_TEST_AMOUNT || 1000);
const currency = process.env.FLW_TEST_CURRENCY || "RWF";
const checkoutInsert = {
  user_id: profile.id,
  name: "Flutterwave Booking Test",
  email: testEmail,
  phone: "+250788123456",
  total_amount: amount,
  currency,
  payment_status: "pending",
  payment_method: "card",
  metadata: {
    items: [
      {
        item_type: "tour_package",
        reference_id: tourPackage.id,
        title: "Test Tour Package",
        quantity: 1,
        price: amount,
        currency,
        calculated_price: amount,
        calculated_price_currency: currency,
      },
    ],
    guest_info: {
      name: "Flutterwave Booking Test",
      email: testEmail,
      phone: "+250788123456",
    },
    booking_details: {
      check_in: "2026-03-15",
      check_out: "2026-03-15",
      guests: 1,
    },
  },
};

const { data: checkout, error: checkoutError } = await supabase
  .from("checkout_requests")
  .insert(checkoutInsert)
  .select("id")
  .single();

if (checkoutError || !checkout?.id) {
  console.error(JSON.stringify({ ok: false, stage: "insert_checkout", error: checkoutError?.message || "unknown" }, null, 2));
  process.exit(3);
}

const txRef = `merry-e2e-${checkout.id}-${Date.now()}`;

const baseCharge = {
  tx_ref: txRef,
  amount,
  currency,
  email: testEmail,
  fullname: "Flutterwave Booking Test",
  phone_number: "+250788123456",
  card_number: card.card_number,
  cvv: card.cvv,
  expiry_month: card.expiry_month,
  expiry_year: card.expiry_year,
  redirect_url: `${baseUrl}/payment-pending?checkoutId=${encodeURIComponent(checkout.id)}&provider=flutterwave`,
  meta: {
    checkout_id: checkout.id,
  },
};

let charge = await flwPost("/charges?type=card", {
  client: encrypt3DES(baseCharge, flwEncryptionKey),
});
let flwRef = charge.data?.data?.flw_ref || null;
let chargeStatus = charge.data?.data?.status || charge.data?.status || null;
let processorResponse = charge.data?.data?.processor_response || "";
let needsValidation = String(processorResponse).toLowerCase().includes("pending") || charge.data?.meta?.authorization?.mode || charge.data?.data?.processor_response === "Pending validate";

if (!charge.res.ok) {
  console.log(JSON.stringify({
    ok: false,
    stage: "initial_charge",
    checkoutId: checkout.id,
    txRef,
    statusCode: charge.res.status,
    response: charge.data,
  }, null, 2));
  process.exit(4);
}

if (charge.data?.meta?.authorization?.mode === "pin") {
  charge = await flwPost("/charges?type=card", {
    client: encrypt3DES({
      ...baseCharge,
      authorization: {
        mode: "pin",
        pin: card.pin,
      },
    }, flwEncryptionKey),
  });
  flwRef = charge.data?.data?.flw_ref || flwRef;
  chargeStatus = charge.data?.data?.status || chargeStatus;
  processorResponse = charge.data?.data?.processor_response || processorResponse;
}

if (flwRef && (String(processorResponse).toLowerCase().includes("pending") || charge.data?.data?.status === "pending" || charge.data?.meta?.authorization?.mode === "otp")) {
  const validate = await flwPost("/validate-charge", {
    otp: card.otp,
    flw_ref: flwRef,
  });
  if (!validate.res.ok) {
    console.log(JSON.stringify({
      ok: false,
      stage: "validate_charge",
      checkoutId: checkout.id,
      txRef,
      flwRef,
      statusCode: validate.res.status,
      response: validate.data,
    }, null, 2));
    process.exit(5);
  }
}

const verifiedDirect = await flwGet(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);

const appVerifyRes = await fetch(`${baseUrl}/api/flutterwave-verify-payment?checkoutId=${encodeURIComponent(checkout.id)}&tx_ref=${encodeURIComponent(txRef)}`);
const appVerify = await appVerifyRes.json().catch(() => ({}));

const { data: checkoutAfter } = await supabase
  .from("checkout_requests")
  .select("id, payment_status, payment_method, metadata")
  .eq("id", checkout.id)
  .single();

const { data: bookings } = await supabase
  .from("bookings")
  .select("id, order_id, payment_status")
  .eq("order_id", checkout.id);

const emailRes = await fetch(`${baseUrl}/api/booking-confirmation-email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "pending_order",
    previewTo: previewEmail,
    checkoutId: checkout.id,
    guestName: "Flutterwave Booking Test",
    guestEmail: testEmail,
    guestPhone: "+250788123456",
    totalAmount: amount,
    currency,
    paymentMethod: "card",
    items: [
      {
        item_type: "tour_package",
        reference_id: tourPackage.id,
        title: "Test Tour Package",
        quantity: 1,
      },
    ],
  }),
});
const emailBody = await emailRes.json().catch(() => ({}));

const success = appVerifyRes.ok && appVerify?.paymentStatus === "paid" && checkoutAfter?.payment_status === "paid" && Array.isArray(bookings) && bookings.length > 0;

console.log(JSON.stringify({
  ok: success,
  checkoutId: checkout.id,
  txRef,
  initialChargeStatus: chargeStatus,
  flutterwaveVerifyStatusCode: verifiedDirect.res.status,
  flutterwaveVerifyStatus: verifiedDirect.data?.data?.status || null,
  appVerifyStatusCode: appVerifyRes.status,
  appVerifyPaymentStatus: appVerify?.paymentStatus || null,
  checkoutPaymentStatus: checkoutAfter?.payment_status || null,
  bookingCount: Array.isArray(bookings) ? bookings.length : 0,
  bookingPaymentStatuses: Array.isArray(bookings) ? bookings.map((b) => b.payment_status) : [],
  emailStatusCode: emailRes.status,
  emailOk: emailRes.ok,
  emailResponse: emailBody,
  appVerifyResponse: appVerify,
}, null, 2));

if (!success) process.exit(6);
