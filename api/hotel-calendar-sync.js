import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const CRON_SECRET = process.env.CALENDAR_SYNC_CRON_SECRET;

function isMissingIntegrationTableError(error) {
  const message = String(error?.message || error || "");
  const code = String(error?.code || "");
  return (
    code === "42P01" ||
    (message.includes("property_calendar_integrations") && message.toLowerCase().includes("does not exist"))
  );
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(body));
}

function getAction(req) {
  if (typeof req.query?.action === "string") return req.query.action;
  if (typeof req.body?.action === "string") return req.body.action;
  return "health";
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string") return null;
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
}

function getBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function normalizeIntegrationFeedUrl(rawFeedUrl) {
  let value = String(rawFeedUrl || "").trim();
  if (!value) throw new Error("Feed URL is required");

  if (value.toLowerCase().startsWith("webcal://")) {
    value = `https://${value.slice("webcal://".length)}`;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid feed URL");
  }

  const hostname = parsed.hostname.toLowerCase();
  const isGoogleCalendar = hostname.includes("calendar.google.");
  if (!isGoogleCalendar) return parsed.toString();

  if (parsed.pathname.includes("/calendar/ical/") && parsed.pathname.endsWith(".ics")) {
    return parsed.toString();
  }

  let calendarId = parsed.searchParams.get("cid") || parsed.searchParams.get("src") || "";
  try {
    calendarId = decodeURIComponent(calendarId);
  } catch {
    // Keep original value if decode fails
  }
  calendarId = String(calendarId || "").trim();

  if (!calendarId) {
    throw new Error("Google Calendar link is missing a calendar ID");
  }

  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
}

function normalizeIcsText(raw) {
  return String(raw || "")
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r/g, "\n");
}

function parseYmd(rawValue) {
  const value = String(rawValue || "").trim();
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString().slice(0, 10);
  }

  return null;
}

function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseIcsEvents(icsText) {
  const lines = normalizeIcsText(icsText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {
        uid: null,
        dtStart: null,
        dtEnd: null,
        startIsDateOnly: false,
        endIsDateOnly: false,
      };
      continue;
    }

    if (line === "END:VEVENT") {
      if (current?.dtStart) {
        const start = current.dtStart;
        let end = current.dtEnd || current.dtStart;

        if (current.endIsDateOnly && current.dtEnd) {
          end = addDays(current.dtEnd, -1);
        }

        if (!end || end < start) end = start;

        events.push({ uid: current.uid, startDate: start, endDate: end });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const sep = line.indexOf(":");
    if (sep <= 0) continue;

    const rawKey = line.slice(0, sep);
    const rawValue = line.slice(sep + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    const dateValue = parseYmd(rawValue);

    if (key === "UID") {
      current.uid = rawValue.trim() || null;
      continue;
    }

    if (key === "DTSTART" && dateValue) {
      current.dtStart = dateValue;
      current.startIsDateOnly = /VALUE=DATE/i.test(rawKey) || /^\d{8}$/.test(String(rawValue).trim());
      continue;
    }

    if (key === "DTEND" && dateValue) {
      current.dtEnd = dateValue;
      current.endIsDateOnly = /VALUE=DATE/i.test(rawKey) || /^\d{8}$/.test(String(rawValue).trim());
      continue;
    }
  }

  const seen = new Set();
  return events.filter((event) => {
    const key = `${event.uid || ""}|${event.startDate}|${event.endDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function decodeBase64ToUint8Array(base64Value) {
  const normalized = String(base64Value || "").trim();
  if (!normalized) return new Uint8Array(0);

  const binary = Buffer.from(normalized, "base64");
  return new Uint8Array(binary);
}

async function extractEventsFromUploadedCalendarFile({ fileName, icsText, zipBase64 }) {
  const normalizedName = String(fileName || "").toLowerCase();

  if (icsText) {
    return parseIcsEvents(String(icsText));
  }

  if (!zipBase64) {
    throw new Error("Missing file content");
  }

  const zipData = decodeBase64ToUint8Array(zipBase64);
  if (!zipData.length) throw new Error("Uploaded ZIP file is empty");

  const zip = await JSZip.loadAsync(zipData);
  const icsFiles = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".ics"));
  if (icsFiles.length === 0) {
    throw new Error("No .ics files found in ZIP");
  }

  const allEvents = [];
  for (const icsFile of icsFiles) {
    const text = await icsFile.async("text");
    const parsed = parseIcsEvents(text);
    allEvents.push(...parsed);
  }

  const dedupe = new Set();
  const unique = [];
  for (const event of allEvents) {
    const key = `${event.uid || ""}|${event.startDate}|${event.endDate}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    unique.push(event);
  }

  if (unique.length === 0) {
    if (normalizedName.endsWith(".zip")) {
      throw new Error("No valid events found in ZIP calendar files");
    }
    throw new Error("No valid events found in uploaded calendar file");
  }

  return unique;
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

function makeFeedEvent({ uid, title, startDate, endDate, description }) {
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

function buildFeedCalendar(events) {
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

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function userOwnsProperty(adminClient, propertyId, userId) {
  const { data } = await adminClient
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("host_id", userId)
    .maybeSingle();

  return Boolean(data?.id);
}

function isAuthorizedCron(req) {
  const vercelCron = req.headers["x-vercel-cron"] === "1";
  if (vercelCron) return true;

  const provided = req.query?.secret || req.headers["x-cron-secret"];
  return Boolean(CRON_SECRET && provided && String(provided) === String(CRON_SECRET));
}

async function runIntegrationSync(admin, integration) {
  const integrationReason = `External Sync:${integration.id}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let icsText;
  try {
    const response = await fetch(integration.feed_url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "MerryMoments-CalendarSync/1.0",
        Accept: "text/calendar, text/plain, */*",
      },
    });

    if (!response.ok) {
      try {
        const parsed = new URL(String(integration.feed_url || ""));
        if (parsed.hostname.toLowerCase().includes("calendar.google.") && response.status === 404) {
          const err = new Error(
            'Google Calendar URL returned 404. Use the "Secret address in iCal format" for private calendars, or make the calendar public and use the public iCal address.'
          );
          err.statusCode = 400;
          throw err;
        }
      } catch {
        // Fall back to generic message below
      }

      const err = new Error(`Could not fetch calendar URL (${response.status})`);
      err.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
      throw err;
    }

    icsText = await response.text();

    if (!icsText || !/BEGIN:VCALENDAR/i.test(icsText)) {
      const err = new Error("Calendar URL did not return a valid iCal file");
      err.statusCode = 400;
      throw err;
    }
  } finally {
    clearTimeout(timeout);
  }

  const parsedEvents = parseIcsEvents(icsText);

  await admin
    .from("property_blocked_dates")
    .delete()
    .eq("property_id", integration.property_id)
    .eq("reason", integrationReason);

  if (parsedEvents.length > 0) {
    const rows = parsedEvents.map((event) => ({
      property_id: integration.property_id,
      start_date: event.startDate,
      end_date: event.endDate,
      reason: integrationReason,
      created_by: integration.created_by || null,
    }));

    const { error: insertError } = await admin.from("property_blocked_dates").insert(rows);
    if (insertError) throw insertError;
  }

  await admin
    .from("property_calendar_integrations")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: "success",
      last_sync_error: null,
    })
    .eq("id", integration.id);

  return {
    integrationId: integration.id,
    propertyId: integration.property_id,
    eventsImported: parsedEvents.length,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(res, 500, { error: "Missing Supabase server configuration" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const action = getAction(req);

  try {
    if (action === "feed") {
      const token = req.query?.token;
      if (!token) {
        res.statusCode = 400;
        res.end("Missing token");
        return;
      }

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
          makeFeedEvent({
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
          makeFeedEvent({
            uid: `block-${block.id}@merry360x.com`,
            title: "Unavailable",
            startDate: block.start_date,
            endDate: addDays(block.end_date, 1),
            description: block.reason || "Blocked",
          })
        );
      }

      const payload = buildFeedCalendar(events);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
      res.end(payload);
      return;
    }

    if (action === "health") {
      return json(res, 200, { ok: true, service: "hotel-calendar-sync" });
    }

    if (action === "sync-all") {
      if (!isAuthorizedCron(req)) {
        return json(res, 401, { error: "Unauthorized cron request" });
      }

      const { data: integrations, error } = await admin
        .from("property_calendar_integrations")
        .select("id, property_id, feed_url, created_by, is_active")
        .eq("is_active", true);

      if (error) {
        if (isMissingIntegrationTableError(error)) {
          return json(res, 200, {
            ok: true,
            skipped: true,
            reason: "property_calendar_integrations table not found",
          });
        }
        throw error;
      }

      const results = [];
      for (const integration of integrations || []) {
        try {
          const result = await runIntegrationSync(admin, integration);
          results.push({ ok: true, ...result });
        } catch (syncError) {
          await admin
            .from("property_calendar_integrations")
            .update({
              last_synced_at: new Date().toISOString(),
              last_sync_status: "error",
              last_sync_error: String(syncError?.message || syncError).slice(0, 500),
            })
            .eq("id", integration.id);

          results.push({ ok: false, integrationId: integration.id, error: String(syncError?.message || syncError) });
        }
      }

      return json(res, 200, {
        ok: true,
        synced: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      });
    }

    const user = await requireUser(req);
    if (!user) return json(res, 401, { error: "Unauthorized" });

    if (action === "list") {
      const propertyId = req.query?.propertyId;
      if (!propertyId) return json(res, 400, { error: "Missing propertyId" });

      const ownsProperty = await userOwnsProperty(admin, propertyId, user.id);
      if (!ownsProperty) return json(res, 403, { error: "Forbidden" });

      const { data, error } = await admin
        .from("property_calendar_integrations")
        .select("id, property_id, provider, label, feed_url, feed_token, is_active, last_synced_at, last_sync_status, last_sync_error, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingIntegrationTableError(error)) {
          return json(res, 200, { ok: true, integrations: [] });
        }
        throw error;
      }

      const dedupedRows = [];
      const dedupeKeys = new Set();
      for (const row of data || []) {
        const dedupeKey = `${row.property_id}|${row.provider}|${String(row.feed_url || "").trim().toLowerCase()}`;
        if (dedupeKeys.has(dedupeKey)) continue;
        dedupeKeys.add(dedupeKey);
        dedupedRows.push(row);
      }

      const baseUrl = getBaseUrl(req);
      const integrations = dedupedRows.map((row) => ({
        ...row,
        export_url: `${baseUrl}/api/hotel-calendar-sync?action=feed&token=${row.feed_token}`,
      }));

      return json(res, 200, { ok: true, integrations });
    }

    if (action === "list-host") {
      const { data: hostProperties, error: propsError } = await admin
        .from("properties")
        .select("id")
        .eq("host_id", user.id);

      if (propsError) throw propsError;

      const propertyIds = (hostProperties || []).map((p) => p.id);
      if (propertyIds.length === 0) {
        return json(res, 200, { ok: true, summaries: {} });
      }

      const { data, error } = await admin
        .from("property_calendar_integrations")
        .select("id, property_id, last_synced_at, last_sync_status, created_at")
        .in("property_id", propertyIds)
        .order("created_at", { ascending: false });

      if (error) {
        if (isMissingIntegrationTableError(error)) {
          return json(res, 200, { ok: true, summaries: {} });
        }
        throw error;
      }

      const summaries = {};
      for (const row of data || []) {
        if (!summaries[row.property_id]) {
          summaries[row.property_id] = {
            connected: true,
            lastSyncStatus: row.last_sync_status || null,
            lastSyncedAt: row.last_synced_at || null,
          };
        }
      }

      return json(res, 200, { ok: true, summaries });
    }

    if (req.method !== "POST") {
      return json(res, 405, { error: "Method not allowed" });
    }

    if (action === "create") {
      const { propertyId, feedUrl, label } = req.body || {};
      if (!propertyId || !feedUrl) {
        return json(res, 400, { error: "Missing propertyId or feedUrl" });
      }

      let normalizedFeedUrl;
      try {
        normalizedFeedUrl = normalizeIntegrationFeedUrl(feedUrl);
      } catch (urlError) {
        return json(res, 400, { error: String(urlError?.message || urlError) });
      }

      const ownsProperty = await userOwnsProperty(admin, propertyId, user.id);
      if (!ownsProperty) return json(res, 403, { error: "Forbidden" });

      const { data: existingRows, error: existingError } = await admin
        .from("property_calendar_integrations")
        .select("id, property_id, provider, label, feed_url, feed_token, is_active, last_synced_at, last_sync_status, last_sync_error, created_at")
        .eq("property_id", propertyId)
        .eq("feed_url", normalizedFeedUrl)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingError) {
        if (isMissingIntegrationTableError(existingError)) {
          return json(res, 503, {
            error: "Calendar integration database migration is not applied yet",
          });
        }
        throw existingError;
      }

      if ((existingRows || []).length > 0) {
        const existing = existingRows[0];
        const baseUrl = getBaseUrl(req);
        return json(res, 200, {
          ok: true,
          already_exists: true,
          integration: {
            ...existing,
            export_url: `${baseUrl}/api/hotel-calendar-sync?action=feed&token=${existing.feed_token}`,
          },
        });
      }

      const { data, error } = await admin
        .from("property_calendar_integrations")
        .insert({
          property_id: propertyId,
          provider: "ical",
          label: label || "Hotel calendar",
          feed_url: normalizedFeedUrl,
          created_by: user.id,
        })
        .select("id, property_id, provider, label, feed_url, feed_token, is_active, created_at")
        .single();

      if (error) {
        if (isMissingIntegrationTableError(error)) {
          return json(res, 503, {
            error: "Calendar integration database migration is not applied yet",
          });
        }
        throw error;
      }

      const baseUrl = getBaseUrl(req);
      return json(res, 200, {
        ok: true,
        integration: {
          ...data,
          export_url: `${baseUrl}/api/hotel-calendar-sync?action=feed&token=${data.feed_token}`,
        },
      });
    }

    if (action === "import-ics" || action === "import-calendar-file") {
      const { propertyId, icsText, zipBase64, fileName, sourceLabel } = req.body || {};
      if (!propertyId || (!icsText && !zipBase64)) {
        return json(res, 400, { error: "Missing propertyId or file content" });
      }

      const ownsProperty = await userOwnsProperty(admin, propertyId, user.id);
      if (!ownsProperty) return json(res, 403, { error: "Forbidden" });

      const parsedEvents = await extractEventsFromUploadedCalendarFile({
        fileName,
        icsText,
        zipBase64,
      });

      const importReason = `External Upload:${String(sourceLabel || fileName || "Calendar import").slice(0, 80)}`;

      await admin
        .from("property_blocked_dates")
        .delete()
        .eq("property_id", propertyId)
        .eq("reason", importReason);

      const rows = parsedEvents.map((event) => ({
        property_id: propertyId,
        start_date: event.startDate,
        end_date: event.endDate,
        reason: importReason,
        created_by: user.id,
      }));

      const { error: insertError } = await admin.from("property_blocked_dates").insert(rows);
      if (insertError) throw insertError;

      return json(res, 200, {
        ok: true,
        propertyId,
        eventsImported: parsedEvents.length,
        importedFrom: fileName || (zipBase64 ? "zip" : "ics"),
      });
    }

    if (action === "delete") {
      const { integrationId } = req.body || {};
      if (!integrationId) return json(res, 400, { error: "Missing integrationId" });

      const { data: integration, error: findError } = await admin
        .from("property_calendar_integrations")
        .select("id, property_id")
        .eq("id", integrationId)
        .maybeSingle();

      if (findError) {
        if (isMissingIntegrationTableError(findError)) {
          return json(res, 503, {
            error: "Calendar integration database migration is not applied yet",
          });
        }
        throw findError;
      }
      if (!integration) return json(res, 404, { error: "Integration not found" });

      const ownsProperty = await userOwnsProperty(admin, integration.property_id, user.id);
      if (!ownsProperty) return json(res, 403, { error: "Forbidden" });

      const syncReason = `External Sync:${integration.id}`;
      await admin
        .from("property_blocked_dates")
        .delete()
        .eq("property_id", integration.property_id)
        .eq("reason", syncReason);

      const { error: deleteError } = await admin
        .from("property_calendar_integrations")
        .delete()
        .eq("id", integrationId);

      if (deleteError) throw deleteError;
      return json(res, 200, { ok: true });
    }

    if (action === "sync") {
      const { integrationId } = req.body || {};
      if (!integrationId) return json(res, 400, { error: "Missing integrationId" });

      const { data: integration, error: findError } = await admin
        .from("property_calendar_integrations")
        .select("id, property_id, feed_url, created_by, is_active")
        .eq("id", integrationId)
        .maybeSingle();

      if (findError) {
        if (isMissingIntegrationTableError(findError)) {
          return json(res, 503, {
            error: "Calendar integration database migration is not applied yet",
          });
        }
        throw findError;
      }
      if (!integration) return json(res, 404, { error: "Integration not found" });
      if (!integration.is_active) return json(res, 400, { error: "Integration is inactive" });

      const ownsProperty = await userOwnsProperty(admin, integration.property_id, user.id);
      if (!ownsProperty) return json(res, 403, { error: "Forbidden" });

      try {
        const result = await runIntegrationSync(admin, integration);
        return json(res, 200, { ok: true, ...result });
      } catch (syncError) {
        const syncMessage = String(syncError?.message || syncError).slice(0, 500);

        await admin
          .from("property_calendar_integrations")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: syncMessage,
          })
          .eq("id", integration.id);

        const statusCode = Number(syncError?.statusCode);
        if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600) {
          return json(res, statusCode, { error: syncMessage });
        }

        return json(res, 502, { error: syncMessage || "Calendar sync failed" });
      }
    }

    return json(res, 400, { error: `Unknown action: ${action}` });
  } catch (error) {
    return json(res, 500, { error: String(error?.message || error) });
  }
}
