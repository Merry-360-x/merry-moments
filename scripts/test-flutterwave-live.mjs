import fs from "fs";
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
    process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const baseUrl = process.env.TEST_BASE_URL || "https://merry360x.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(JSON.stringify({ ok: false, error: "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const payload = {
  name: "Flutterwave Test User",
  email: "flutterwave-test@example.com",
  phone: "+250788123456",
  total_amount: 1000,
  currency: "RWF",
  payment_status: "pending",
  payment_method: "card",
  metadata: {
    items: [
      {
        item_type: "tour",
        reference_id: "00000000-0000-0000-0000-000000000000",
        title: "Test Item",
        quantity: 1,
        price: 1000,
        currency: "RWF"
      }
    ],
    guest_info: {
      name: "Flutterwave Test User",
      email: "flutterwave-test@example.com",
      phone: "+250788123456"
    },
    booking_details: {
      check_in: "2026-03-10",
      check_out: "2026-03-10",
      guests: 1
    }
  }
};

const { data: checkout, error: insertError } = await supabase
  .from("checkout_requests")
  .insert(payload)
  .select("id")
  .single();

if (insertError || !checkout?.id) {
  console.error(JSON.stringify({ ok: false, stage: "insert_checkout", error: insertError?.message || "Unknown insert error" }));
  process.exit(2);
}

const initRes = await fetch(`${baseUrl}/api/flutterwave-create-payment`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    checkoutId: checkout.id,
    amount: 1000,
    currency: "RWF",
    payerName: "Flutterwave Test User",
    payerEmail: "flutterwave-test@example.com",
    phoneNumber: "+250788123456",
    description: "Automated smoke test"
  })
});

let initBody = null;
try {
  initBody = await initRes.json();
} catch {
  initBody = { error: "Non-JSON response" };
}

const passed = Boolean(initRes.ok && initBody?.success && initBody?.link);

console.log(JSON.stringify({
  ok: passed,
  checkoutId: checkout.id,
  statusCode: initRes.status,
  baseUrl,
  provider: initBody?.provider || null,
  hasLink: Boolean(initBody?.link),
  message: initBody?.flutterwaveMessage || initBody?.error || null,
  txRef: initBody?.txRef || null,
  link: initBody?.link || null
}, null, 2));

if (!passed) {
  process.exit(3);
}
