import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function toIcsDate(ymd) {
  return String(ymd || "").replace(/-/g, "");
}

function icsEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function makeEvent({ uid, title, startDate, endDate, description }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const dtStart = toIcsDate(startDate);
  const dtEnd = toIcsDate(endDate);

  return [
    "BEGIN:VEVENT",
    `UID:${icsEscape(uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${icsEscape(title)}`,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function buildCalendar(events) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Merry Moments//Hotel Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.statusCode = 500;
    res.end("Missing Supabase server configuration");
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const token = req.query?.token;
  if (!token) {
    res.statusCode = 400;
    res.end("Missing token");
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: integration, error: integrationError } = await admin
      .from("property_calendar_integrations")
      .select("id, property_id, is_active")
      .eq("feed_token", token)
      .maybeSingle();

    if (integrationError) throw integrationError;
    if (!integration || !integration.is_active) {
      res.statusCode = 404;
      res.end("Feed not found");
      return;
    }

    const [bookingsResult, blockedResult] = await Promise.all([
      admin
        .from("bookings")
        .select("id, check_in, check_out, status, payment_status")
        .eq("property_id", integration.property_id)
        .in("status", ["pending", "confirmed", "completed"])
        .in("payment_status", ["pending", "paid"]),
      admin
        .from("property_blocked_dates")
        .select("id, start_date, end_date, reason")
        .eq("property_id", integration.property_id)
        .not("reason", "ilike", "External Sync:%"),
    ]);

    if (bookingsResult.error) throw bookingsResult.error;
    if (blockedResult.error) throw blockedResult.error;

    const events = [];

    for (const booking of bookingsResult.data || []) {
      events.push(
        makeEvent({
          uid: `booking-${booking.id}@merry360x.com`,
          title: "Reserved",
          startDate: booking.check_in,
          endDate: booking.check_out,
          description: `Booking status: ${booking.status}`,
        })
      );
    }

    for (const block of blockedResult.data || []) {
      events.push(
        makeEvent({
          uid: `block-${block.id}@merry360x.com`,
          title: "Unavailable",
          startDate: block.start_date,
          endDate: addDays(block.end_date, 1),
          description: block.reason || "Blocked",
        })
      );
    }

    const payload = buildCalendar(events);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.end(payload);
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error?.message || error));
  }
}
