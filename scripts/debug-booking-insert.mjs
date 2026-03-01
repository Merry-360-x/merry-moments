import fs from "fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env", ".env.local"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#") || !l.includes("=")) continue;
    const i = l.indexOf("=");
    process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  }
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const checkoutId = process.env.CHECKOUT_ID;

if (!checkoutId) {
  console.error("CHECKOUT_ID is required");
  process.exit(1);
}

const { data: c, error: e } = await supabase
  .from("checkout_requests")
  .select("id,user_id,name,email,phone,currency,metadata")
  .eq("id", checkoutId)
  .single();

if (e || !c) {
  console.error(JSON.stringify({ stage: "fetch_checkout", error: e?.message || "not found" }, null, 2));
  process.exit(2);
}

const item = (c.metadata?.items || [])[0];
const bd = c.metadata?.booking_details || {};

const payload = {
  guest_id: c.user_id,
  guest_name: c.metadata?.guest_info?.name || c.name || null,
  guest_email: c.email || null,
  guest_phone: c.metadata?.guest_info?.phone || c.phone || null,
  order_id: c.id,
  total_price: item?.calculated_price || item?.price || 1000,
  currency: item?.calculated_price_currency || item?.currency || c.currency || "RWF",
  status: "pending",
  confirmation_status: "pending",
  payment_status: "paid",
  payment_method: "card",
  guests: bd?.guests || 1,
  review_token: crypto.randomUUID(),
  booking_type: "tour",
  tour_id: item?.reference_id,
  check_in: bd?.check_in,
  check_out: bd?.check_out,
};

const { data, error } = await supabase
  .from("bookings")
  .insert(payload)
  .select("id")
  .single();

console.log(JSON.stringify({ data, error }, null, 2));
