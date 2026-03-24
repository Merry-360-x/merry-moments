import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return sendJson(res, 500, { ok: false, error: "Supabase environment is not configured" });
  }

  const userId = (req.query.userId || "").trim();
  const include = (req.query.include || "home,profile,wishlists,tripCart,bookings,notifications").split(",").map(s => s.trim());

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const result = { ok: true, serverTime: new Date().toISOString() };

  try {
    // ── Home listings ──
    if (include.includes("home")) {
      const [properties, tours, tourPackages, transport] = await Promise.all([
        supabase.from("properties").select("id, title, location, price_per_night, currency, images, main_image").eq("is_published", true).order("created_at", { ascending: false }).limit(20),
        supabase.from("tours").select("id, title, location, price_per_person, currency, images, main_image").eq("is_published", true).order("created_at", { ascending: false }).limit(10),
        supabase.from("tour_packages").select("id, title, city, price_per_adult, currency, images, main_image").eq("status", "active").order("created_at", { ascending: false }).limit(10),
        supabase.from("transport_vehicles").select("id, title, vehicle_type, price_per_day, currency, images, main_image").eq("is_published", true).order("created_at", { ascending: false }).limit(10),
      ]);

      const listings = [
        ...(properties.data || []).map(p => ({ ...p, item_type: "property" })),
        ...(tours.data || []).map(t => ({ ...t, item_type: "tour" })),
        ...(tourPackages.data || []).map(tp => ({ ...tp, item_type: "tour_package", location: tp.city })),
        ...(transport.data || []).map(tv => ({ ...tv, item_type: "transport" })),
      ];

      result.home = { listings, stories: [] };
    }

    // ── User-specific data (only if userId provided) ──
    if (userId) {
      if (include.includes("profile")) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
        result.profile = data || null;
      }

      if (include.includes("wishlists")) {
        const { data } = await supabase.from("favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        result.wishlists = data || [];
      }

      if (include.includes("tripCart")) {
        const { data } = await supabase.from("trip_cart_items").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        result.tripCart = data || [];
      }

      if (include.includes("bookings")) {
        const { data } = await supabase.from("bookings").select("*").eq("guest_id", userId).order("created_at", { ascending: false }).limit(50);
        result.bookings = data || [];
      }

      if (include.includes("notifications")) {
        result.notifications = [];
      }

      // ── Roles ──
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      result.roles = (rolesData || []).map(r => r.role);
    } else {
      result.profile = null;
      result.wishlists = [];
      result.tripCart = [];
      result.bookings = [];
      result.notifications = [];
      result.roles = [];
    }

    return sendJson(res, 200, result);
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || "Internal server error" });
  }
}
