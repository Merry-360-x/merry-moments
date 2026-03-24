import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { ok: false, error: "Supabase environment is not configured" });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = String(authHeader).startsWith("Bearer ") ? String(authHeader).slice(7).trim() : "";

  if (!token) return sendJson(res, 401, { ok: false, error: "Missing bearer token" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return sendJson(res, 401, { ok: false, error: "Invalid auth token" });
  }

  const userId = userData.user.id;

  // Best-effort cleanup of common user-linked rows before removing auth user.
  const cleanupTables = [
    ["profiles", "user_id"],
    ["wishlists", "user_id"],
    ["trip_cart", "user_id"],
    ["notifications", "user_id"],
    ["bookings", "guest_id"],
  ];

  for (const [table, column] of cleanupTables) {
    try {
      await adminClient.from(table).delete().eq(column, userId);
    } catch (_) {
      // Continue cleanup even if one table fails.
    }
  }

  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return sendJson(res, 500, { ok: false, error: deleteErr.message || "Failed to delete account" });
  }

  return sendJson(res, 200, { ok: true, deletedUserId: userId });
}
