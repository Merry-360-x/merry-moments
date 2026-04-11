import { createClient } from "@supabase/supabase-js";
import {
  buildBrevoSmtpPayload,
  escapeHtml,
  keyValueRows,
  renderMinimalEmail,
  validateRecipientEmail,
} from "../lib/email-template-kit.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";

const APP_BASE_URL = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://merry360x.com";

function normalizeAppBaseUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "https://merry360x.com";

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }

  // Accept env values like "merry360x.com" and force a valid absolute URL.
  return `https://${raw.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

const APP_ORIGIN = normalizeAppBaseUrl(APP_BASE_URL);

function appUrl(path = "/") {
  const cleanPath = String(path || "/").startsWith("/") ? String(path || "/") : `/${String(path || "")}`;
  return `${APP_ORIGIN}${cleanPath}`;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(body));
}

function safeStr(value, max = 500) {
  const s = typeof value === "string" ? value : "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeStr(String(item || ""), 1500))
    .filter(Boolean)
    .slice(0, 10);
}

function isAdminOrStaffRole(role) {
  return ["admin", "financial_staff", "operations_staff", "customer_support"].includes(String(role || "").toLowerCase());
}

function isHostRole(role) {
  return String(role || "").toLowerCase() === "host";
}

function readableMoney(amount, currency = "USD") {
  const n = safeAmount(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency || "USD"} ${n.toFixed(2)}`;
  }
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  if (!String(authHeader).startsWith("Bearer ")) return "";
  return String(authHeader).slice(7).trim();
}

async function authenticate(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error("Supabase environment is not configured"), { status: 500 });
  }

  const token = getBearerToken(req);
  if (!token) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    throw Object.assign(new Error("Invalid auth token"), { status: 401 });
  }

  const userId = userData.user.id;
  const email = userData.user.email || null;

  const { data: roleRows } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (roleRows || []).map((r) => String(r.role || "").toLowerCase());

  return {
    adminClient,
    userId,
    userEmail: email,
    roles,
    isAdminOrStaff: roles.some(isAdminOrStaffRole),
    isHost: roles.some(isHostRole),
  };
}

function requireAdminOrStaff(auth) {
  if (!auth?.isAdminOrStaff) {
    throw Object.assign(new Error("Forbidden: admin or staff role required"), { status: 403 });
  }
}

function requireHost(auth) {
  if (!auth?.isHost) {
    throw Object.assign(new Error("Forbidden: host role required"), { status: 403 });
  }
}

async function resolveBookingHostId(adminClient, booking) {
  if (!booking) return null;

  const directHostId = safeStr(booking.host_id, 80);
  if (directHostId) return directHostId;

  let resolvedHostId = "";

  if (booking.property_id) {
    const { data: property } = await adminClient
      .from("properties")
      .select("host_id")
      .eq("id", booking.property_id)
      .maybeSingle();
    resolvedHostId = safeStr(property?.host_id, 80);
  }

  if (!resolvedHostId && booking.tour_id) {
    const { data: tourPackage } = await adminClient
      .from("tour_packages")
      .select("host_id")
      .eq("id", booking.tour_id)
      .maybeSingle();
    resolvedHostId = safeStr(tourPackage?.host_id, 80);
  }

  if (!resolvedHostId && booking.tour_id) {
    const { data: tour } = await adminClient
      .from("tours")
      .select("host_id, created_by")
      .eq("id", booking.tour_id)
      .maybeSingle();
    resolvedHostId = safeStr(tour?.host_id || tour?.created_by, 80);
  }

  if (!resolvedHostId && booking.transport_id) {
    const { data: vehicle } = await adminClient
      .from("transport_vehicles")
      .select("owner_id")
      .eq("id", booking.transport_id)
      .maybeSingle();
    resolvedHostId = safeStr(vehicle?.owner_id, 80);
  }

  if (resolvedHostId && booking.id) {
    await adminClient
      .from("bookings")
      .update({ host_id: resolvedHostId })
      .eq("id", booking.id)
      .is("host_id", null);
  }

  return resolvedHostId || null;
}

async function attachResolvedBookingHost(adminClient, booking) {
  if (!booking) return booking;

  const resolvedHostId = await resolveBookingHostId(adminClient, booking);
  if (!resolvedHostId || booking.host_id === resolvedHostId) {
    return booking;
  }

  return {
    ...booking,
    host_id: resolvedHostId,
  };
}

async function listOwnedBookingsForHost({ adminClient, hostId, select }) {
  const [directBookingsRes, propertyRes, packageRes, tourRes, vehicleRes] = await Promise.all([
    adminClient
      .from("bookings")
      .select(select)
      .eq("host_id", hostId)
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("properties")
      .select("id")
      .eq("host_id", hostId)
      .limit(500),
    adminClient
      .from("tour_packages")
      .select("id")
      .eq("host_id", hostId)
      .limit(500),
    adminClient
      .from("tours")
      .select("id")
      .or(`host_id.eq.${hostId},created_by.eq.${hostId}`)
      .limit(500),
    adminClient
      .from("transport_vehicles")
      .select("id")
      .eq("owner_id", hostId)
      .limit(500),
  ]);

  const propertyIds = (propertyRes.data || []).map((row) => row.id).filter(Boolean);
  const packageIds = (packageRes.data || []).map((row) => row.id).filter(Boolean);
  const tourIds = (tourRes.data || []).map((row) => row.id).filter(Boolean);
  const vehicleIds = (vehicleRes.data || []).map((row) => row.id).filter(Boolean);

  const fallbackQueryPromises = [];

  if (propertyIds.length) {
    fallbackQueryPromises.push(
      adminClient
        .from("bookings")
        .select(select)
        .in("property_id", propertyIds)
        .order("created_at", { ascending: false })
        .limit(500)
    );
  }

  const tourBookingIds = Array.from(new Set([...packageIds, ...tourIds]));
  if (tourBookingIds.length) {
    fallbackQueryPromises.push(
      adminClient
        .from("bookings")
        .select(select)
        .in("tour_id", tourBookingIds)
        .order("created_at", { ascending: false })
        .limit(500)
    );
  }

  if (vehicleIds.length) {
    fallbackQueryPromises.push(
      adminClient
        .from("bookings")
        .select(select)
        .in("transport_id", vehicleIds)
        .order("created_at", { ascending: false })
        .limit(500)
    );
  }

  const fallbackResults = await Promise.all(fallbackQueryPromises);
  const bookingMap = new Map();

  for (const row of directBookingsRes.data || []) {
    bookingMap.set(row.id, row);
  }

  for (const result of fallbackResults) {
    for (const row of result.data || []) {
      if (!bookingMap.has(row.id)) {
        bookingMap.set(row.id, row);
      }
    }
  }

  return Array.from(bookingMap.values())
    .sort((left, right) => new Date(String(right.created_at || 0)).getTime() - new Date(String(left.created_at || 0)).getTime())
    .slice(0, 500);
}

async function getBookingOrThrow(adminClient, bookingId) {
  const { data: booking, error } = await adminClient
    .from("bookings")
    .select("id, guest_id, guest_email, guest_name, host_id, property_id, tour_id, transport_id, check_in, check_out, total_price, currency, booking_type")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  return attachResolvedBookingHost(adminClient, booking);
}

async function ensureUserOwnsCharge(adminClient, chargeId, userId) {
  const { data: charge, error } = await adminClient
    .from("charges")
    .select("*")
    .eq("id", chargeId)
    .single();

  if (error || !charge) {
    throw Object.assign(new Error("Charge not found"), { status: 404 });
  }

  if (charge.user_id !== userId) {
    throw Object.assign(new Error("Forbidden: charge does not belong to current user"), { status: 403 });
  }

  return charge;
}

async function sendEmailNotification({ toEmail, toName, subject, html, tags = [] }) {
  if (!BREVO_API_KEY) return { ok: false, skipped: true, reason: "brevo_missing" };

  const recipient = validateRecipientEmail(toEmail);
  if (!recipient.ok) return { ok: false, skipped: true, reason: "invalid_email" };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildBrevoSmtpPayload({
        senderName: "Merry 360 Experiences",
        senderEmail: "support@merry360x.com",
        to: [{ email: recipient.email, name: toName || "Guest" }],
        subject,
        htmlContent: html,
        tags,
      })),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, status: response.status, body };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" };
  }
}

async function createInAppNotification(adminClient, payload) {
  const { userId, title, body, type = "general", channel = "in_app", data = {} } = payload;

  try {
    const { error } = await adminClient
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        body,
        notification_type: type,
        channel,
        data,
      });

    if (!error) return;
  } catch {
    // Fall through to RPC fallback.
  }

  await adminClient.rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_body: body,
    p_notification_type: type,
    p_channel: channel,
    p_data: data,
  });
}

async function notifyChargeCreated({ adminClient, booking, charge, userEmail }) {
  const bookingRef = `#${String(booking.id).slice(0, 8).toUpperCase()}`;
  const title = "New post-booking charge";
  const body = `${charge.charge_type.replaceAll("_", " ")} charge of ${readableMoney(charge.amount, charge.currency)} was added to booking ${bookingRef}.`;

  await createInAppNotification(adminClient, {
    userId: booking.guest_id,
    title,
    body,
    type: "charge_created",
    channel: "in_app",
    data: { charge_id: charge.id, booking_id: booking.id },
  });

  await createInAppNotification(adminClient, {
    userId: booking.guest_id,
    title,
    body,
    type: "charge_created",
    channel: "push",
    data: { charge_id: charge.id, booking_id: booking.id },
  });

  const html = renderMinimalEmail({
    eyebrow: "Post-booking charge",
    title: "A new charge was added to your booking",
      subtitle: "Review the reason and pay securely from My Bookings.",
    bodyHtml: keyValueRows([
      { label: "Booking", value: escapeHtml(bookingRef) },
      { label: "Type", value: escapeHtml(String(charge.charge_type || "").replaceAll("_", " ")) },
      { label: "Amount", value: escapeHtml(readableMoney(charge.amount, charge.currency)) },
      { label: "Status", value: escapeHtml(String(charge.status || "pending")) },
      { label: "Description", value: escapeHtml(String(charge.description || "")) },
    ]),
      ctaText: "Open My Bookings",
      ctaUrl: appUrl("/my-bookings"),
  });

  await sendEmailNotification({
    toEmail: userEmail || booking.guest_email,
    toName: booking.guest_name || "Guest",
    subject: "New post-booking charge",
    html,
    tags: ["post-booking", "charge"],
  });
}

async function notifyModification({ adminClient, booking, modification, userEmail }) {
  const bookingRef = `#${String(booking.id).slice(0, 8).toUpperCase()}`;
  const diff = safeAmount(modification.difference || 0);
  const sign = diff > 0 ? "+" : "";

  await createInAppNotification(adminClient, {
    userId: booking.guest_id,
    title: "Booking modification proposal",
    body: `A ${modification.modification_type.replaceAll("_", " ")} proposal was sent for booking ${bookingRef} (${sign}${readableMoney(diff, modification.currency)}).`,
    type: "booking_modification",
    channel: "in_app",
    data: { booking_modification_id: modification.id, booking_id: booking.id },
  });

  await createInAppNotification(adminClient, {
    userId: booking.guest_id,
    title: "Booking modification proposal",
    body: `A ${modification.modification_type.replaceAll("_", " ")} proposal was sent for booking ${bookingRef}.`,
    type: "booking_modification",
    channel: "push",
    data: { booking_modification_id: modification.id, booking_id: booking.id },
  });

  const html = renderMinimalEmail({
    eyebrow: "Booking modification",
    title: "A booking change needs your response",
    subtitle: "Review the old vs new prices and accept or reject.",
    bodyHtml: keyValueRows([
      { label: "Booking", value: escapeHtml(bookingRef) },
      { label: "Type", value: escapeHtml(String(modification.modification_type || "").replaceAll("_", " ")) },
      { label: "Old Price", value: escapeHtml(readableMoney(modification.old_price, modification.currency)) },
      { label: "New Price", value: escapeHtml(readableMoney(modification.new_price, modification.currency)) },
      { label: "Difference", value: escapeHtml(`${sign}${readableMoney(diff, modification.currency)}`) },
      { label: "Message", value: escapeHtml(String(modification.proposal_message || "")) },
    ]),
      ctaText: "Review in My Bookings",
      ctaUrl: appUrl("/my-bookings"),
  });

  await sendEmailNotification({
    toEmail: userEmail || booking.guest_email,
    toName: booking.guest_name || "Guest",
    subject: "Booking modification proposal",
    html,
    tags: ["post-booking", "modification"],
  });
}

async function tryAutoChargeFromWallet({ adminClient, charge }) {
  if (!charge.auto_charge_allowed) return { autoCharged: false };

  const { data: wallet } = await adminClient
    .from("wallet_accounts")
    .select("user_id, balance, auto_charge_consent")
    .eq("user_id", charge.user_id)
    .maybeSingle();

  if (!wallet?.auto_charge_consent) return { autoCharged: false };
  if (safeAmount(wallet.balance) < safeAmount(charge.amount)) return { autoCharged: false };

  const { error: txErr } = await adminClient.rpc("wallet_apply_transaction", {
    p_user_id: charge.user_id,
    p_tx_type: "charge_payment",
    p_direction: "out",
    p_amount: safeAmount(charge.amount),
    p_reference_type: "charge",
    p_reference_id: charge.id,
    p_notes: "Auto-charge enabled for post-booking charge",
    p_metadata: { charge_id: charge.id, auto_charge: true },
  });

  if (txErr) {
    return { autoCharged: false, autoChargeError: txErr.message || "wallet_tx_failed" };
  }

  const nowIso = new Date().toISOString();
  const { data: updatedCharge, error: updateErr } = await adminClient
    .from("charges")
    .update({
      status: "paid",
      payment_method: "wallet",
      payment_provider: "wallet",
      payment_reference: `wallet-${charge.id}`,
      paid_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", charge.id)
    .select("*")
    .single();

  if (updateErr) {
    return { autoCharged: false, autoChargeError: updateErr.message || "charge_update_failed" };
  }

  return { autoCharged: true, charge: updatedCharge };
}

function paymentMethodLabel(method) {
  const m = safeStr(method, 64).toLowerCase();
  if (m === "mobile_money" || m === "mobile") return "Mobile Money";
  if (m === "card" || m === "flutterwave") return "Card";
  return "Payment";
}

async function ensureHostAdjustmentForPostBookingCharge({ adminClient, charge }) {
  if (!charge?.id || !charge?.booking_id) return;

  const { data: bookingRow } = await adminClient
    .from("bookings")
    .select("id, host_id, property_id, tour_id, transport_id")
    .eq("id", charge.booking_id)
    .maybeSingle();

  const booking = await attachResolvedBookingHost(adminClient, bookingRow);

  if (!booking?.host_id) return;

  const amount = safeAmount(charge.amount);
  if (amount <= 0) return;

  await adminClient
    .from("host_earnings_adjustments")
    .upsert(
      {
        host_id: booking.host_id,
        amount,
        currency: safeStr(charge.currency || "USD", 12).toUpperCase(),
        reason: `Post-booking charge paid (${String(charge.id).slice(0, 8)})`,
        reference_key: `post_booking_charge_paid_${charge.id}`,
        created_by: null,
      },
      { onConflict: "reference_key", ignoreDuplicates: true },
    );

  await createInAppNotification(adminClient, {
    userId: booking.host_id,
    title: "Post-booking payment received",
    body: `A guest paid ${readableMoney(charge.amount, charge.currency)} for a post-booking charge.`,
    type: "post_booking_payment_received",
    channel: "in_app",
    data: { charge_id: charge.id, booking_id: charge.booking_id },
  });
}

async function sendGuestPostBookingPaidEmail({ adminClient, charge, method }) {
  const { data: booking } = await adminClient
    .from("bookings")
    .select("id, guest_email, guest_name")
    .eq("id", charge.booking_id)
    .maybeSingle();

  const targetEmail = safeStr(booking?.guest_email, 160);
  if (!targetEmail) return;

  const amountLabel = readableMoney(charge.amount, charge.currency || "USD");
  const html = renderMinimalEmail({
    eyebrow: "Payment Receipt",
    title: "Post-booking payment received",
    subtitle: "Your additional payment has been confirmed successfully.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: escapeHtml(paymentMethodLabel(method)) },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Status", value: "Paid" },
    ]),
      ctaText: "Open My Bookings",
      ctaUrl: appUrl("/my-bookings"),
  });

  await sendEmailNotification({
    toEmail: targetEmail,
    toName: safeStr(booking?.guest_name || "Guest", 120) || "Guest",
    subject: `Payment received - ${amountLabel}`,
    html,
    tags: ["post-booking", "payment-confirmation"],
  });
}

async function sendHostPostBookingPaidEmail({ adminClient, charge, method }) {
  const { data: bookingRow } = await adminClient
    .from("bookings")
    .select("id, host_id, property_id, tour_id, transport_id, guest_name")
    .eq("id", charge.booking_id)
    .maybeSingle();

  const booking = await attachResolvedBookingHost(adminClient, bookingRow);

  if (!booking?.host_id) return;

  const { data: hostProfile } = await adminClient
    .from("profiles")
    .select("email, full_name")
    .eq("user_id", booking.host_id)
    .maybeSingle();

  const targetEmail = safeStr(hostProfile?.email, 160);
  if (!targetEmail) return;

  const amountLabel = readableMoney(charge.amount, charge.currency || "USD");
  const html = renderMinimalEmail({
    eyebrow: "Payment Notice",
    title: "Post-booking charge paid",
    subtitle: "A guest completed a post-booking payment for your booking.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: escapeHtml(paymentMethodLabel(method)) },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Guest", value: escapeHtml(safeStr(booking.guest_name || "Guest", 120) || "Guest") },
    ]),
    ctaText: "Open Host Dashboard",
    ctaUrl: appUrl("/host-dashboard"),
  });

  await sendEmailNotification({
    toEmail: targetEmail,
    toName: safeStr(hostProfile?.full_name || "Host", 120) || "Host",
    subject: `Post-booking payment received - ${amountLabel}`,
    html,
    tags: ["post-booking", "host-notice", "payment-confirmation"],
  });
}

async function sendAdminPostBookingPaidEmail({ adminClient, charge, method }) {
  const { data: adminRoleRows } = await adminClient
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "financial_staff", "operations_staff", "customer_support"]);

  const adminIds = Array.from(new Set((adminRoleRows || []).map((row) => String(row.user_id || "")).filter(Boolean)));
  if (!adminIds.length) return;

  const { data: adminProfiles } = await adminClient
    .from("profiles")
    .select("user_id, email, full_name")
    .in("user_id", adminIds);

  const amountLabel = readableMoney(charge.amount, charge.currency || "USD");

  const html = renderMinimalEmail({
    eyebrow: "Post-booking Alert",
    title: "Post-booking payment completed",
    subtitle: "A post-booking charge was paid successfully.",
    bodyHtml: keyValueRows([
      { label: "Amount Paid", value: escapeHtml(amountLabel) },
      { label: "Payment Method", value: escapeHtml(paymentMethodLabel(method)) },
      { label: "Charge ID", value: escapeHtml(String(charge.id).slice(0, 12).toUpperCase()) },
      { label: "Booking ID", value: escapeHtml(String(charge.booking_id).slice(0, 12).toUpperCase()) },
      { label: "Status", value: "Paid" },
    ]),
    ctaText: "Open Post-Booking Console",
    ctaUrl: appUrl("/admin/post-booking"),
  });

  for (const admin of adminProfiles || []) {
    const targetEmail = safeStr(admin?.email, 160);
    if (!targetEmail) continue;
    await sendEmailNotification({
      toEmail: targetEmail,
      toName: safeStr(admin?.full_name || "Admin", 120) || "Admin",
      subject: `Post-booking payment completed - ${amountLabel}`,
      html,
      tags: ["post-booking", "admin-notice", "payment-confirmation"],
    });
  }
}

function humanizeLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .trim();
}

function appendDisputeTimelineEntry(existingDetails, actorLabel, message) {
  const previous = safeStr(existingDetails || "", 6000);
  const actor = safeStr(actorLabel || "Update", 120) || "Update";
  const note = safeStr(message || "", 3000);
  if (!note) return previous;

  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const nextEntry = `${actor} (${timestamp}): ${note}`;

  return previous ? `${previous}\n\n${nextEntry}` : nextEntry;
}

async function getDisputeParticipants(adminClient, bookingId) {
  const booking = await getBookingOrThrow(adminClient, bookingId);

  let hostProfile = null;
  if (booking?.host_id) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", booking.host_id)
      .maybeSingle();

    hostProfile = profile || null;
  }

  return { booking, hostProfile };
}

async function sendDisputeLifecycleEmails({ adminClient, dispute, booking, hostProfile, event, latestUpdate }) {
  const bookingLabel = escapeHtml(String(booking?.id || dispute?.booking_id || "").slice(0, 12).toUpperCase());
  const disputeLabel = escapeHtml(String(dispute?.id || "").slice(0, 12).toUpperCase());
  const reasonLabel = safeStr(dispute?.reason || "Post-booking dispute", 160) || "Post-booking dispute";
  const detailsExcerpt = safeStr(dispute?.details || "", 600);
  const resolutionExcerpt = safeStr(dispute?.resolution || "", 600);
  const adminNotesExcerpt = safeStr(dispute?.admin_notes || "", 600);
  const latestUpdateExcerpt = safeStr(latestUpdate || "", 600);
  const statusLabel = humanizeLabel(dispute?.status || "open") || "open";
  const eventLabel = event === "guest_appeal"
    ? "Guest appealed"
    : event === "guest_close"
      ? "Guest closed dispute"
      : event === "guest_pay"
        ? "Guest chose to pay"
        : event === "host_reply"
          ? "Host replied"
          : event === "opened"
            ? "Dispute opened"
            : "Dispute updated";

  const sendGuest = !["guest_appeal", "guest_close", "guest_pay"].includes(event);
  const sendHost = event !== "host_reply";

  const guestCopy = event === "opened"
    ? {
        eyebrow: "Dispute Received",
        title: "We received your dispute",
        subtitle: "The host and support team can now review the issue and follow up with next steps.",
        subject: `Dispute received - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
      }
    : event === "host_reply"
      ? {
          eyebrow: "Host Update",
          title: "Your host replied to the dispute",
          subtitle: "Review the latest host response and continue tracking the case from My Bookings.",
          subject: `Host replied - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
        }
      : {
          eyebrow: "Dispute Update",
          title: "Your dispute has been updated",
          subtitle: "There is a new update on your post-booking dispute.",
          subject: `Dispute update - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
        };

  const hostCopy = event === "opened"
    ? {
        eyebrow: "Host Alert",
        title: "A guest opened a dispute",
        subtitle: "A guest raised a post-booking issue for one of your bookings.",
        subject: `New dispute opened - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
      }
    : event === "guest_appeal"
      ? {
          eyebrow: "Guest Appeal",
          title: "The guest wants to continue the dispute",
          subtitle: "The guest reviewed your response and sent another appeal.",
          subject: `Guest appealed dispute - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
        }
      : event === "guest_close"
        ? {
            eyebrow: "Dispute Closed",
            title: "The guest closed the dispute",
            subtitle: "The guest ended the dispute thread for this booking.",
            subject: `Guest closed dispute - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
          }
        : event === "guest_pay"
          ? {
              eyebrow: "Guest Payment Choice",
              title: "The guest chose to pay and close the dispute",
              subtitle: "The guest accepted the outcome and started payment on the disputed charge.",
              subject: `Guest chose to pay - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
            }
    : {
        eyebrow: "Dispute Update",
        title: "A dispute has been updated",
        subtitle: "There is a new update on a post-booking dispute tied to your booking.",
        subject: `Dispute update - booking ${String(booking?.id || "").slice(0, 12).toUpperCase()}`,
      };

  const detailRows = [
    { label: "Dispute ID", value: disputeLabel },
    { label: "Booking ID", value: bookingLabel },
    { label: "Status", value: escapeHtml(statusLabel) },
    { label: "Reason", value: escapeHtml(reasonLabel) },
    { label: "Event", value: escapeHtml(eventLabel) },
  ];

  if (latestUpdateExcerpt) {
    detailRows.push({ label: "Latest Update", value: escapeHtml(latestUpdateExcerpt) });
  }

  if (detailsExcerpt) {
    detailRows.push({ label: "Details", value: escapeHtml(detailsExcerpt) });
  }

  if (resolutionExcerpt) {
    detailRows.push({ label: "Resolution", value: escapeHtml(resolutionExcerpt) });
  }

  if (adminNotesExcerpt) {
    detailRows.push({ label: "Admin Notes", value: escapeHtml(adminNotesExcerpt) });
  }

  const guestEmail = safeStr(booking?.guest_email, 160);
  if (sendGuest && guestEmail) {
    const guestHtml = renderMinimalEmail({
      eyebrow: guestCopy.eyebrow,
      title: guestCopy.title,
      subtitle: guestCopy.subtitle,
      bodyHtml: keyValueRows(detailRows),
      ctaText: "Open My Bookings",
      ctaUrl: appUrl("/my-bookings"),
    });

    await sendEmailNotification({
      toEmail: guestEmail,
      toName: safeStr(booking?.guest_name || "Guest", 120) || "Guest",
      subject: guestCopy.subject,
      html: guestHtml,
      tags: [
        "post-booking",
        "dispute",
        event === "opened"
          ? "dispute-opened"
          : event === "host_reply"
            ? "host-replied"
            : "dispute-updated",
      ],
    });
  }

  const hostEmail = safeStr(hostProfile?.email, 160);
  if (sendHost && hostEmail) {
    const hostRows = [
      ...detailRows,
      { label: "Guest", value: escapeHtml(safeStr(booking?.guest_name || "Guest", 120) || "Guest") },
    ];

    const hostHtml = renderMinimalEmail({
      eyebrow: hostCopy.eyebrow,
      title: hostCopy.title,
      subtitle: hostCopy.subtitle,
      bodyHtml: keyValueRows(hostRows),
      ctaText: "Open Host Dashboard",
      ctaUrl: appUrl("/host-dashboard?tab=post-booking"),
    });

    await sendEmailNotification({
      toEmail: hostEmail,
      toName: safeStr(hostProfile?.full_name || "Host", 120) || "Host",
      subject: hostCopy.subject,
      html: hostHtml,
      tags: [
        "post-booking",
        "dispute",
        "host-notice",
        event === "opened"
          ? "dispute-opened"
          : event === "guest_appeal"
            ? "guest-appealed"
            : event === "guest_close"
              ? "guest-closed-dispute"
              : event === "guest_pay"
                ? "guest-chose-pay"
                : "dispute-updated",
      ],
    });
  }
}

async function reconcileChargesFromCheckout({ adminClient, charges }) {
  const rows = Array.isArray(charges) ? charges : [];
  if (!rows.length) return rows;

  const maybeSync = rows.filter((charge) => {
    const ref = safeStr(charge?.payment_reference, 120);
    const status = safeStr(charge?.status, 32).toLowerCase();
    return Boolean(ref && (status === "pending" || status === "processing" || status === "failed"));
  });

  if (!maybeSync.length) return rows;

  const checkoutIds = [...new Set(maybeSync.map((charge) => safeStr(charge.payment_reference, 120)).filter(Boolean))];
  if (!checkoutIds.length) return rows;

  const { data: checkoutRows } = await adminClient
    .from("checkout_requests")
    .select("id, payment_status, payment_method")
    .in("id", checkoutIds);

  const checkoutById = new Map((checkoutRows || []).map((row) => [String(row.id), row]));
  const updatedChargeById = new Map();
  const nowIso = new Date().toISOString();

  for (const charge of maybeSync) {
    const checkout = checkoutById.get(String(charge.payment_reference || ""));
    if (!checkout) continue;

    const paymentStatus = safeStr(checkout.payment_status, 32).toLowerCase();
    const chargeStatus = safeStr(charge.status, 32).toLowerCase();
    const method = safeStr(checkout.payment_method || charge.payment_method || charge.payment_provider, 64).toLowerCase();

    if (paymentStatus === "paid" && chargeStatus !== "paid") {
      const provider = method === "mobile_money" ? "pawapay" : method === "card" ? "flutterwave" : (safeStr(charge.payment_provider, 64) || null);

      const { data: updated } = await adminClient
        .from("charges")
        .update({
          status: "paid",
          payment_method: method || charge.payment_method || null,
          payment_provider: provider,
          payment_reference: String(checkout.id),
          paid_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", charge.id)
        .select("*")
        .single();

      if (updated) {
        updatedChargeById.set(updated.id, updated);

        await createInAppNotification(adminClient, {
          userId: updated.user_id,
          title: "Payment successful",
          body: `Your post-booking payment of ${readableMoney(updated.amount, updated.currency)} was confirmed.`,
          type: "payment_success",
          channel: "in_app",
          data: { charge_id: updated.id, booking_id: updated.booking_id, checkout_id: checkout.id },
        }).catch(() => null);

        await ensureHostAdjustmentForPostBookingCharge({ adminClient, charge: updated }).catch(() => null);
        await sendGuestPostBookingPaidEmail({ adminClient, charge: updated, method }).catch(() => null);
        await sendHostPostBookingPaidEmail({ adminClient, charge: updated, method }).catch(() => null);
        await sendAdminPostBookingPaidEmail({ adminClient, charge: updated, method }).catch(() => null);
      }
      continue;
    }

    if (["failed", "rejected", "cancelled"].includes(paymentStatus) && chargeStatus === "pending") {
      const { data: updated } = await adminClient
        .from("charges")
        .update({
          status: "failed",
          payment_method: method || charge.payment_method || null,
          payment_provider: method === "mobile_money" ? "pawapay" : method === "card" ? "flutterwave" : (safeStr(charge.payment_provider, 64) || null),
          payment_reference: String(checkout.id),
          failed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", charge.id)
        .select("*")
        .single();

      if (updated) {
        updatedChargeById.set(updated.id, updated);
      }
    }
  }

  if (!updatedChargeById.size) return rows;

  return rows.map((charge) => updatedChargeById.get(charge.id) || charge);
}

async function listHostOverview({ adminClient, hostId }) {
  const bookingRows = await listOwnedBookingsForHost({
    adminClient,
    hostId,
    select: "id, guest_name, guest_email, check_in, check_out, total_price, currency, status, created_at",
  });

  const bookingIds = (bookingRows || []).map((booking) => booking.id).filter(Boolean);
  if (!bookingIds.length) {
    return {
      charges: [],
      booking_modifications: [],
      disputes: [],
      host_bookings: [],
    };
  }

  const [chargesRes, modificationsRes, disputesRes] = await Promise.all([
    adminClient
      .from("charges")
      .select("*")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("booking_modifications")
      .select("*")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("disputes")
      .select("*")
      .in("booking_id", bookingIds)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  const reconciledCharges = await reconcileChargesFromCheckout({
    adminClient,
    charges: chargesRes.data || [],
  });

  return {
    charges: reconciledCharges,
    booking_modifications: modificationsRes.data || [],
    disputes: disputesRes.data || [],
    host_bookings: bookingRows || [],
  };
}

async function listHostBookings({ adminClient, hostId }) {
  const bookings = await listOwnedBookingsForHost({
    adminClient,
    hostId,
    select: "id, guest_name, guest_email, check_in, check_out, total_price, currency, status, created_at",
  });

  return { bookings: bookings || [] };
}

async function listUserOverview({ adminClient, userId }) {
  const [
    chargesRes,
    modificationsRes,
    disputesRes,
    notificationsRes,
  ] = await Promise.all([
    adminClient
      .from("charges")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("booking_modifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("disputes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200),
    adminClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const reconciledCharges = await reconcileChargesFromCheckout({
    adminClient,
    charges: chargesRes.data || [],
  });

  return {
    charges: reconciledCharges,
    booking_modifications: modificationsRes.data || [],
    disputes: disputesRes.data || [],
    wallet_account: null,
    wallet_transactions: [],
    notifications: notificationsRes.data || [],
  };
}

async function listAdminOverview({ adminClient }) {
  const [chargesRes, modificationsRes, disputesRes] = await Promise.all([
    adminClient
      .from("charges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("booking_modifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("disputes")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  const reconciledCharges = await reconcileChargesFromCheckout({
    adminClient,
    charges: chargesRes.data || [],
  });

  return {
    charges: reconciledCharges,
    booking_modifications: modificationsRes.data || [],
    disputes: disputesRes.data || [],
  };
}

async function createCharge({ auth, body }) {
  if (!auth?.isAdminOrStaff && !auth?.isHost) {
    throw Object.assign(new Error("Forbidden: host or staff role required"), { status: 403 });
  }

  const bookingId = safeStr(body.booking_id, 80);
  const chargeType = safeStr(body.charge_type, 64).toLowerCase();
  const amount = safeAmount(body.amount);
  const description = safeStr(body.description, 2000);
  const currency = safeStr(body.currency || "USD", 12).toUpperCase();
  const proofUrls = normalizeList(body.proof_urls || body.proof || []);
  const dueAt = body.due_at ? new Date(body.due_at).toISOString() : null;

  if (!bookingId || !chargeType || amount <= 0 || !description) {
    throw Object.assign(new Error("booking_id, charge_type, amount, and description are required"), { status: 400 });
  }

  const booking = await getBookingOrThrow(auth.adminClient, bookingId);

  if (auth.isHost && booking.host_id !== auth.userId) {
    throw Object.assign(new Error("Forbidden: booking does not belong to current host"), { status: 403 });
  }

  const { data: charge, error } = await auth.adminClient
    .from("charges")
    .insert({
      booking_id: booking.id,
      user_id: booking.guest_id,
      created_by: auth.userId,
      charge_type: chargeType,
      amount,
      currency: currency || booking.currency || "USD",
      description,
      proof_urls: proofUrls,
      status: "pending",
      due_at: dueAt,
      metadata: {
        source: auth.isHost ? "post_booking_host" : "post_booking_admin",
        requested_by: auth.userId,
      },
    })
    .select("*")
    .single();

  if (error || !charge) {
    throw Object.assign(new Error(error?.message || "Failed to create charge"), { status: 400 });
  }

  await notifyChargeCreated({
    adminClient: auth.adminClient,
    booking,
    charge,
    userEmail: booking.guest_email,
  });

  return {
    charge,
    auto_charge_applied: false,
    auto_charge_error: "wallet_system_removed",
  };
}

async function createModification({ auth, body }) {
  requireAdminOrStaff(auth);

  const bookingId = safeStr(body.booking_id, 80);
  const type = safeStr(body.modification_type || body.type || "date_change", 64).toLowerCase();
  const proposalMessage = safeStr(body.proposal_message || body.message, 2000);
  const reason = safeStr(body.reason, 2000);
  const newPropertyId = body.new_property_id ? safeStr(body.new_property_id, 80) : null;
  const oldPropertyId = body.old_property_id ? safeStr(body.old_property_id, 80) : null;

  const newCheckIn = body.new_check_in ? safeStr(body.new_check_in, 30) : null;
  const newCheckOut = body.new_check_out ? safeStr(body.new_check_out, 30) : null;

  if (!bookingId) {
    throw Object.assign(new Error("booking_id is required"), { status: 400 });
  }

  const booking = await getBookingOrThrow(auth.adminClient, bookingId);

  const { data: calcRows, error: calcErr } = await auth.adminClient.rpc("calculate_booking_modification_difference", {
    p_booking_id: booking.id,
    p_new_check_in: newCheckIn,
    p_new_check_out: newCheckOut,
    p_new_property_id: newPropertyId,
  });

  if (calcErr || !Array.isArray(calcRows) || calcRows.length === 0) {
    throw Object.assign(new Error(calcErr?.message || "Failed to calculate pricing difference"), { status: 400 });
  }

  const calc = calcRows[0] || {};
  const oldPrice = safeAmount(calc.old_price || booking.total_price);
  const newPrice = safeAmount(calc.new_price || booking.total_price);
  const difference = safeAmount(calc.difference || (newPrice - oldPrice));
  const currency = safeStr(calc.currency || booking.currency || "USD", 12).toUpperCase();

  const payload = {
    booking_id: booking.id,
    user_id: booking.guest_id,
    requested_by: auth.userId,
    admin_id: auth.userId,
    modification_type: type,
    old_property_id: oldPropertyId || booking.property_id || null,
    new_property_id: newPropertyId || null,
    old_check_in: booking.check_in,
    old_check_out: booking.check_out,
    new_check_in: newCheckIn,
    new_check_out: newCheckOut,
    old_price: oldPrice,
    new_price: newPrice,
    difference,
    currency,
    reason: reason || null,
    proposal_message: proposalMessage || null,
    payment_status: difference > 0 ? "pending" : difference < 0 ? "refunded" : "not_required",
    status: "pending",
  };

  const { data: modification, error: modErr } = await auth.adminClient
    .from("booking_modifications")
    .insert(payload)
    .select("*")
    .single();

  if (modErr || !modification) {
    throw Object.assign(new Error(modErr?.message || "Failed to create booking modification"), { status: 400 });
  }

  let linkedCharge = null;

  if (difference > 0) {
    const { data: charge, error: chargeErr } = await auth.adminClient
      .from("charges")
      .insert({
        booking_id: booking.id,
        user_id: booking.guest_id,
        created_by: auth.userId,
        charge_type: "modification_difference",
        amount: difference,
        currency,
        description: `Booking modification (${type.replaceAll("_", " ")}) price difference`,
        status: "pending",
        proof_urls: [],
        metadata: {
          booking_modification_id: modification.id,
          source: "booking_modification",
        },
      })
      .select("*")
      .single();

    if (!chargeErr && charge) {
      linkedCharge = charge;
      await auth.adminClient
        .from("booking_modifications")
        .update({ charge_id: charge.id })
        .eq("id", modification.id);
    }
  }

  await notifyModification({
    adminClient: auth.adminClient,
    booking,
    modification: {
      ...modification,
      difference,
      old_price: oldPrice,
      new_price: newPrice,
      currency,
    },
    userEmail: booking.guest_email,
  });

  return {
    booking_modification: linkedCharge
      ? { ...modification, charge_id: linkedCharge.id }
      : modification,
    charge: linkedCharge,
  };
}

async function openDispute({ auth, body }) {
  const chargeId = safeStr(body.charge_id, 80);
  const modificationId = safeStr(body.booking_modification_id, 80);
  const reason = safeStr(body.reason, 800);
  const details = safeStr(body.details, 3000);
  const evidenceUrls = normalizeList(body.evidence_urls || body.evidence || []);

  if (!reason || (!chargeId && !modificationId)) {
    throw Object.assign(new Error("reason and one target (charge_id or booking_modification_id) are required"), { status: 400 });
  }

  let bookingId = "";
  let charge = null;

  if (chargeId) {
    charge = await ensureUserOwnsCharge(auth.adminClient, chargeId, auth.userId);
    bookingId = charge.booking_id;
  }

  if (!bookingId && modificationId) {
    const { data: modification, error: modErr } = await auth.adminClient
      .from("booking_modifications")
      .select("id, booking_id, user_id")
      .eq("id", modificationId)
      .single();

    if (modErr || !modification) {
      throw Object.assign(new Error("Booking modification not found"), { status: 404 });
    }

    if (modification.user_id !== auth.userId) {
      throw Object.assign(new Error("Forbidden: modification does not belong to current user"), { status: 403 });
    }

    bookingId = modification.booking_id;
  }

  if (!bookingId) {
    throw Object.assign(new Error("Unable to resolve booking for dispute"), { status: 400 });
  }

  const { booking, hostProfile } = await getDisputeParticipants(auth.adminClient, bookingId);
  const guestLabel = safeStr(booking?.guest_name || "Guest", 120) || "Guest";
  const initialDetails = details ? appendDisputeTimelineEntry("", guestLabel, details) : null;

  const { data: dispute, error: disputeErr } = await auth.adminClient
    .from("disputes")
    .insert({
      booking_id: bookingId,
      charge_id: chargeId || null,
      booking_modification_id: modificationId || null,
      user_id: auth.userId,
      opened_by: auth.userId,
      reason,
      details: initialDetails,
      evidence_urls: evidenceUrls,
      status: "open",
    })
    .select("*")
    .single();

  if (disputeErr || !dispute) {
    throw Object.assign(new Error(disputeErr?.message || "Failed to open dispute"), { status: 400 });
  }

  if (chargeId) {
    await auth.adminClient
      .from("charges")
      .update({ status: "disputed", disputed_at: new Date().toISOString() })
      .eq("id", chargeId)
      .eq("user_id", auth.userId);
  }

  const bookingRef = String(booking.id).slice(0, 12).toUpperCase();

  await createInAppNotification(auth.adminClient, {
    userId: auth.userId,
    title: "Dispute opened",
    body: "Your dispute has been received and is under review.",
    type: "dispute_opened",
    channel: "in_app",
    data: { dispute_id: dispute.id, booking_id: bookingId, charge_id: chargeId || null },
  });

  if (booking.host_id && booking.host_id !== auth.userId) {
    await createInAppNotification(auth.adminClient, {
      userId: booking.host_id,
      title: "Guest dispute opened",
      body: `A guest opened a dispute for booking ${bookingRef}.`,
      type: "dispute_opened_host",
      channel: "in_app",
      data: { dispute_id: dispute.id, booking_id: bookingId, charge_id: chargeId || null },
    });
  }

  await sendDisputeLifecycleEmails({
    adminClient: auth.adminClient,
    dispute,
    booking,
    hostProfile,
    event: "opened",
  }).catch(() => null);

  return { dispute };
}

async function resolveDispute({ auth, body }) {
  requireAdminOrStaff(auth);

  const disputeId = safeStr(body.dispute_id, 80);
  const nextStatus = safeStr(body.status, 64).toLowerCase();
  const resolution = safeStr(body.resolution, 3000);
  const adminNotes = safeStr(body.admin_notes, 3000);

  if (!disputeId || !nextStatus) {
    throw Object.assign(new Error("dispute_id and status are required"), { status: 400 });
  }

  if (!["approved", "rejected", "settled", "closed", "in_review"].includes(nextStatus)) {
    throw Object.assign(new Error("Invalid dispute status"), { status: 400 });
  }

  const nowIso = new Date().toISOString();

  const { data: dispute, error: disputeErr } = await auth.adminClient
    .from("disputes")
    .update({
      status: nextStatus,
      resolution: resolution || null,
      admin_notes: adminNotes || null,
      resolved_by: auth.userId,
      resolved_at: ["approved", "rejected", "settled", "closed"].includes(nextStatus) ? nowIso : null,
      updated_at: nowIso,
    })
    .eq("id", disputeId)
    .select("*")
    .single();

  if (disputeErr || !dispute) {
    throw Object.assign(new Error(disputeErr?.message || "Failed to resolve dispute"), { status: 400 });
  }

  const { booking, hostProfile } = await getDisputeParticipants(auth.adminClient, dispute.booking_id);

  if (dispute.charge_id) {
    const mappedChargeStatus = nextStatus === "approved"
      ? "cancelled"
      : nextStatus === "rejected"
        ? "pending"
        : nextStatus === "settled"
          ? "paid"
          : null;

    if (mappedChargeStatus) {
      await auth.adminClient
        .from("charges")
        .update({ status: mappedChargeStatus, updated_at: nowIso })
        .eq("id", dispute.charge_id);
    }
  }

    const bookingRef = String(booking.id).slice(0, 12).toUpperCase();

  await createInAppNotification(auth.adminClient, {
    userId: dispute.user_id,
    title: "Dispute update",
      body: `Your dispute status is now ${humanizeLabel(nextStatus)}.`,
    type: "dispute_update",
    channel: "in_app",
    data: { dispute_id: dispute.id, status: nextStatus },
  });

    if (booking.host_id && booking.host_id !== dispute.user_id) {
      await createInAppNotification(auth.adminClient, {
        userId: booking.host_id,
        title: "Dispute update",
        body: `Dispute for booking ${bookingRef} is now ${humanizeLabel(nextStatus)}.`,
        type: "dispute_update_host",
        channel: "in_app",
        data: { dispute_id: dispute.id, booking_id: dispute.booking_id, status: nextStatus },
      });
    }

    await sendDisputeLifecycleEmails({
      adminClient: auth.adminClient,
      dispute,
      booking,
      hostProfile,
      event: "updated",
    }).catch(() => null);

  return { dispute };
}

async function respondDisputeAsHost({ auth, body }) {
  requireHost(auth);

  const disputeId = safeStr(body.dispute_id, 80);
  const message = safeStr(body.message || body.response || body.note, 3000);

  if (!disputeId || !message) {
    throw Object.assign(new Error("dispute_id and message are required"), { status: 400 });
  }

  const { data: dispute, error: disputeErr } = await auth.adminClient
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (disputeErr || !dispute) {
    throw Object.assign(new Error("Dispute not found"), { status: 404 });
  }

  if (!["open", "in_review"].includes(safeStr(dispute.status, 32).toLowerCase())) {
    throw Object.assign(new Error(`Dispute status is ${dispute.status}; host replies are only allowed while the dispute is open or in review`), { status: 400 });
  }

  const { booking, hostProfile } = await getDisputeParticipants(auth.adminClient, dispute.booking_id);
  if (!booking?.host_id || booking.host_id !== auth.userId) {
    throw Object.assign(new Error("Forbidden: dispute is not linked to one of your bookings"), { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const hostName = safeStr(hostProfile?.full_name || "Host", 120) || "Host";
  const nextDetails = appendDisputeTimelineEntry(dispute.details, hostName, message);

  const { data: updated, error: updateErr } = await auth.adminClient
    .from("disputes")
    .update({
      details: nextDetails,
      status: "in_review",
      updated_at: nowIso,
    })
    .eq("id", dispute.id)
    .select("*")
    .single();

  if (updateErr || !updated) {
    throw Object.assign(new Error(updateErr?.message || "Failed to send dispute response"), { status: 400 });
  }

  await createInAppNotification(auth.adminClient, {
    userId: dispute.user_id,
    title: "Host replied to your dispute",
    body: safeStr(message, 220) || "Your host sent an update on the dispute.",
    type: "dispute_update",
    channel: "in_app",
    data: { dispute_id: dispute.id, booking_id: dispute.booking_id, status: "in_review", source: "host" },
  });

  await sendDisputeLifecycleEmails({
    adminClient: auth.adminClient,
    dispute: updated,
    booking,
    hostProfile,
    event: "host_reply",
    latestUpdate: message,
  }).catch(() => null);

  return { dispute: updated };
}

async function resolveDisputeChargeForUser(adminClient, dispute, userId) {
  if (dispute?.charge_id) {
    return ensureUserOwnsCharge(adminClient, dispute.charge_id, userId);
  }

  if (!dispute?.booking_modification_id) {
    return null;
  }

  const { data: modification, error: modificationErr } = await adminClient
    .from("booking_modifications")
    .select("id, charge_id, user_id")
    .eq("id", dispute.booking_modification_id)
    .single();

  if (modificationErr || !modification) {
    throw Object.assign(new Error("Booking modification linked to dispute was not found"), { status: 404 });
  }

  if (modification.user_id !== userId) {
    throw Object.assign(new Error("Forbidden: modification does not belong to current user"), { status: 403 });
  }

  if (!modification.charge_id) {
    return null;
  }

  return ensureUserOwnsCharge(adminClient, modification.charge_id, userId);
}

async function initializeChargePayment({ auth, charge, method, body }) {
  const nowIso = new Date().toISOString();

  // Card/mobile money flow initialization through existing checkout + payment endpoints.
  // Server computes/locks amount so the client cannot tamper with charge value.
  const amount = safeAmount(charge.amount);

  let bookingContact = null;
  if (charge.booking_id) {
    const { data: bookingRow } = await auth.adminClient
      .from("bookings")
      .select("guest_name, guest_email, guest_phone")
      .eq("id", charge.booking_id)
      .maybeSingle();
    bookingContact = bookingRow || null;
  }

  const { data: profile } = await auth.adminClient
    .from("profiles")
    .select("full_name, email, phone")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const userSlug = String(auth.userId || "guest")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12) || "guest";

  const payerName =
    safeStr(
      body.payer_name || body.payerName || profile?.full_name || bookingContact?.guest_name || "Guest",
      120,
    ) || "Guest";

  const payerEmail =
    safeStr(
      body.payer_email || body.payerEmail || profile?.email || auth.userEmail || bookingContact?.guest_email || "",
      160,
    ) || `guest+${userSlug}@merry360x.com`;

  const payerPhone = safeStr(
    String(
      body.phone_number ||
      body.phoneNumber ||
      body.phone ||
      profile?.phone ||
      bookingContact?.guest_phone ||
      "",
    ).replace(/\s+/g, ""),
    40,
  );

  const checkoutPayload = {
    user_id: auth.userId,
    name: payerName,
    email: payerEmail,
    phone: payerPhone || null,
    total_amount: amount,
    base_price_amount: amount,
    service_fee_amount: 0,
    currency: safeStr(charge.currency || "USD", 12),
    payment_method: method,
    payment_status: "pending",
    status: "pending",
    items: [
      {
        id: charge.id,
        item_type: "post_booking_charge",
        reference_id: charge.id,
        title: `Post-booking charge (${charge.charge_type})`,
        price: amount,
        currency: safeStr(charge.currency || "USD", 12),
        quantity: 1,
      },
    ],
    metadata: {
      post_booking_charge_id: charge.id,
      booking_id: charge.booking_id,
      amount,
      currency: charge.currency,
      payment_flow: "post_booking",
    },
    message: safeStr(charge.description, 1000) || null,
  };

  const { data: checkout, error: checkoutErr } = await auth.adminClient
    .from("checkout_requests")
    .insert(checkoutPayload)
    .select("id, currency, total_amount")
    .single();

  if (checkoutErr || !checkout) {
    throw Object.assign(new Error(checkoutErr?.message || "Failed to create checkout request"), { status: 400 });
  }

  await auth.adminClient
    .from("charges")
    .update({
      payment_method: method,
      payment_provider: method,
      payment_reference: checkout.id,
      updated_at: nowIso,
    })
    .eq("id", charge.id)
    .eq("user_id", auth.userId);

  const response = {
    payment_status: "pending",
    charge_id: charge.id,
    checkout_id: checkout.id,
    amount: checkout.total_amount,
    currency: checkout.currency,
    method,
    next_step: "client_should_invoke_existing_payment_endpoint",
  };

  if (method === "card" && body.initialize === true) {
    const flwResp = await fetch(appUrl("/api/flutterwave"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-payment",
        checkoutId: checkout.id,
        amount: checkout.total_amount,
        currency: checkout.currency,
        payerName,
        payerEmail,
        phoneNumber: payerPhone,
        description: `Post-booking charge ${charge.id}`,
        redirectUrl: appUrl(`/payment-pending?checkoutId=${encodeURIComponent(checkout.id)}&provider=flutterwave`),
      }),
    }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .catch((err) => ({ ok: false, body: { error: err instanceof Error ? err.message : "flutterwave_init_failed" } }));

    response.flutterwave = flwResp;

    const flwBody = flwResp?.body || {};
    const flwRedirectUrl =
      flwBody?.redirectUrl ||
      flwBody?.link ||
      flwBody?.data?.link ||
      null;

    if (!flwResp.ok || flwBody?.success === false || !flwRedirectUrl) {
      throw Object.assign(
        new Error(
          safeStr(
            flwBody?.error || flwBody?.message || "Unable to initialize card payment",
            300,
          ) || "Unable to initialize card payment",
        ),
        { status: 502 },
      );
    }
  }

  if (method === "mobile_money" && body.initialize === true) {
    const provider = safeStr(body.provider, 80);
    const phoneNumber = safeStr(body.phone_number || body.phone, 32);

    if (!provider || !phoneNumber) {
      throw Object.assign(new Error("provider and phone_number are required for mobile money"), { status: 400 });
    }

    const mpResp = await fetch(appUrl("/api/pawapay-create-payment"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutId: checkout.id,
        amount: checkout.total_amount,
        phoneNumber,
        payerName,
        payerEmail,
        provider,
        description: `Post-booking charge ${charge.id}`,
      }),
    }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .catch((err) => ({ ok: false, body: { error: err instanceof Error ? err.message : "pawapay_init_failed" } }));

    response.mobile_money = mpResp;

    const mpBody = mpResp?.body || {};
    const depositId = mpBody?.depositId || mpBody?.data?.depositId || null;

    if (!mpResp.ok || mpBody?.success === false || !depositId) {
      throw Object.assign(
        new Error(
          safeStr(
            mpBody?.error || mpBody?.message || "Unable to initialize mobile money payment",
            300,
          ) || "Unable to initialize mobile money payment",
        ),
        { status: 502 },
      );
    }
  }

  return response;
}

async function respondDisputeAsGuest({ auth, body }) {
  const disputeId = safeStr(body.dispute_id, 80);
  const decision = safeStr(body.decision || body.action, 32).toLowerCase();
  const message = safeStr(body.message || body.note || body.details, 3000);

  if (!disputeId || !["appeal", "close", "pay"].includes(decision)) {
    throw Object.assign(new Error("dispute_id and decision (appeal|close|pay) are required"), { status: 400 });
  }

  const { data: dispute, error: disputeErr } = await auth.adminClient
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (disputeErr || !dispute) {
    throw Object.assign(new Error("Dispute not found"), { status: 404 });
  }

  if (dispute.user_id !== auth.userId) {
    throw Object.assign(new Error("Forbidden: dispute does not belong to current user"), { status: 403 });
  }

  if (!["open", "in_review"].includes(safeStr(dispute.status, 32).toLowerCase())) {
    throw Object.assign(new Error(`Dispute status is ${dispute.status}; guest actions are only allowed while the dispute is open or in review`), { status: 400 });
  }

  if (decision === "appeal" && !message) {
    throw Object.assign(new Error("A message is required to continue the appeal"), { status: 400 });
  }

  const { booking, hostProfile } = await getDisputeParticipants(auth.adminClient, dispute.booking_id);
  const bookingRef = String(booking?.id || dispute.booking_id || "").slice(0, 12).toUpperCase();
  const guestLabel = safeStr(booking?.guest_name || "Guest", 120) || "Guest";
  const nowIso = new Date().toISOString();

  const notifyHost = async (title, bodyText, extraData = {}) => {
    if (!booking?.host_id || booking.host_id === auth.userId) return;

    await createInAppNotification(auth.adminClient, {
      userId: booking.host_id,
      title,
      body: bodyText,
      type: "dispute_update_host",
      channel: "in_app",
      data: {
        dispute_id: dispute.id,
        booking_id: dispute.booking_id,
        status: dispute.status,
        ...extraData,
      },
    }).catch(() => null);
  };

  if (decision === "appeal") {
    const nextDetails = appendDisputeTimelineEntry(dispute.details, guestLabel, message);

    const { data: updated, error: updateErr } = await auth.adminClient
      .from("disputes")
      .update({
        details: nextDetails,
        status: "open",
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        updated_at: nowIso,
      })
      .eq("id", dispute.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      throw Object.assign(new Error(updateErr?.message || "Failed to continue dispute"), { status: 400 });
    }

    await notifyHost(
      "Guest appealed dispute",
      safeStr(message, 220) || `The guest sent another response for booking ${bookingRef}.`,
      { status: "open", source: "guest" },
    );

    await sendDisputeLifecycleEmails({
      adminClient: auth.adminClient,
      dispute: updated,
      booking,
      hostProfile,
      event: "guest_appeal",
      latestUpdate: message,
    }).catch(() => null);

    return { dispute: updated };
  }

  const resolveNote = decision === "pay"
    ? "Guest accepted the response and chose to pay the charge."
    : "Guest closed the dispute.";

  const nextDetails = appendDisputeTimelineEntry(dispute.details, guestLabel, resolveNote);

  if (decision === "pay") {
    const rawMethod = safeStr(body.method || body.payment_method || "", 64).toLowerCase();
    const method = rawMethod === "mobile" ? "mobile_money" : rawMethod;

    if (!method || !["card", "mobile_money"].includes(method)) {
      throw Object.assign(new Error("A valid payment method is required to pay from a dispute"), { status: 400 });
    }

    const charge = await resolveDisputeChargeForUser(auth.adminClient, dispute, auth.userId);
    if (!charge) {
      throw Object.assign(new Error("This dispute is not linked to a payable charge"), { status: 400 });
    }

    if (!["pending", "disputed"].includes(safeStr(charge.status, 32).toLowerCase())) {
      throw Object.assign(new Error(`Charge status is ${charge.status}; it cannot be paid from this dispute`), { status: 400 });
    }

    let payableCharge = charge;
    const shouldRevertCharge = safeStr(charge.status, 32).toLowerCase() === "disputed";

    if (shouldRevertCharge) {
      const { data: reopenedCharge, error: reopenedChargeErr } = await auth.adminClient
        .from("charges")
        .update({
          status: "pending",
          disputed_at: null,
          updated_at: nowIso,
        })
        .eq("id", charge.id)
        .eq("user_id", auth.userId)
        .select("*")
        .single();

      if (reopenedChargeErr || !reopenedCharge) {
        throw Object.assign(new Error(reopenedChargeErr?.message || "Failed to prepare charge for payment"), { status: 400 });
      }

      payableCharge = reopenedCharge;
    }

    let paymentResult = null;
    try {
      paymentResult = await initializeChargePayment({
        auth,
        charge: payableCharge,
        method,
        body,
      });
    } catch (error) {
      if (shouldRevertCharge) {
        await auth.adminClient
          .from("charges")
          .update({
            status: "disputed",
            disputed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", charge.id)
          .eq("user_id", auth.userId);
      }

      throw error;
    }

    const { data: updated, error: updateErr } = await auth.adminClient
      .from("disputes")
      .update({
        details: nextDetails,
        status: "closed",
        resolution: resolveNote,
        resolved_by: auth.userId,
        resolved_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", dispute.id)
      .select("*")
      .single();

    if (updateErr || !updated) {
      throw Object.assign(new Error(updateErr?.message || "Failed to close dispute after payment decision"), { status: 400 });
    }

    await notifyHost(
      "Guest chose to pay",
      `The guest accepted the dispute outcome and started payment for booking ${bookingRef}.`,
      { status: "closed", source: "guest", decision: "pay" },
    );

    await sendDisputeLifecycleEmails({
      adminClient: auth.adminClient,
      dispute: updated,
      booking,
      hostProfile,
      event: "guest_pay",
      latestUpdate: resolveNote,
    }).catch(() => null);

    return {
      dispute: updated,
      ...paymentResult,
    };
  }

  const charge = await resolveDisputeChargeForUser(auth.adminClient, dispute, auth.userId).catch(() => null);
  if (charge && safeStr(charge.status, 32).toLowerCase() === "disputed") {
    await auth.adminClient
      .from("charges")
      .update({
        status: "pending",
        disputed_at: null,
        updated_at: nowIso,
      })
      .eq("id", charge.id)
      .eq("user_id", auth.userId);
  }

  const { data: updated, error: updateErr } = await auth.adminClient
    .from("disputes")
    .update({
      details: nextDetails,
      status: "closed",
      resolution: resolveNote,
      resolved_by: auth.userId,
      resolved_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", dispute.id)
    .select("*")
    .single();

  if (updateErr || !updated) {
    throw Object.assign(new Error(updateErr?.message || "Failed to close dispute"), { status: 400 });
  }

  await notifyHost(
    "Guest closed dispute",
    `The guest closed the dispute for booking ${bookingRef}.`,
    { status: "closed", source: "guest", decision: "close" },
  );

  await sendDisputeLifecycleEmails({
    adminClient: auth.adminClient,
    dispute: updated,
    booking,
    hostProfile,
    event: "guest_close",
    latestUpdate: resolveNote,
  }).catch(() => null);

  return { dispute: updated };
}

async function updateChargeStatus({ auth, body }) {
  requireAdminOrStaff(auth);

  const chargeId = safeStr(body.charge_id, 80);
  const status = safeStr(body.status, 64).toLowerCase();
  const note = safeStr(body.note, 1500);

  if (!chargeId || !status) {
    throw Object.assign(new Error("charge_id and status are required"), { status: 400 });
  }

  if (!["pending", "paid", "failed", "disputed", "cancelled"].includes(status)) {
    throw Object.assign(new Error("Invalid charge status"), { status: 400 });
  }

  const nowIso = new Date().toISOString();

  const updatePayload = {
    status,
    paid_at: status === "paid" ? nowIso : null,
    failed_at: status === "failed" ? nowIso : null,
    disputed_at: status === "disputed" ? nowIso : null,
    metadata: {
      admin_note: note || null,
      updated_by: auth.userId,
      updated_at: nowIso,
    },
    updated_at: nowIso,
  };

  const { data: charge, error } = await auth.adminClient
    .from("charges")
    .update(updatePayload)
    .eq("id", chargeId)
    .select("*")
    .single();

  if (error || !charge) {
    throw Object.assign(new Error(error?.message || "Failed to update charge status"), { status: 400 });
  }

  await createInAppNotification(auth.adminClient, {
    userId: charge.user_id,
    title: "Charge status updated",
    body: `Your charge status is now ${status}.`,
    type: "charge_status",
    channel: "in_app",
    data: { charge_id: charge.id, status },
  });

  return { charge };
}

async function adjustCharge({ auth, body }) {
  requireAdminOrStaff(auth);

  const chargeId = safeStr(body.charge_id, 80);
  const amount = body.amount === undefined ? null : safeAmount(body.amount);
  const description = body.description === undefined ? null : safeStr(body.description, 2000);
  const proofUrls = body.proof_urls === undefined ? null : normalizeList(body.proof_urls);

  if (!chargeId) {
    throw Object.assign(new Error("charge_id is required"), { status: 400 });
  }

  if (amount !== null && amount <= 0) {
    throw Object.assign(new Error("amount must be greater than 0"), { status: 400 });
  }

  const nextFields = {
    ...(amount !== null ? { amount } : {}),
    ...(description !== null ? { description } : {}),
    ...(proofUrls !== null ? { proof_urls: proofUrls } : {}),
    updated_at: new Date().toISOString(),
  };

  if (Object.keys(nextFields).length <= 1) {
    throw Object.assign(new Error("No editable fields provided"), { status: 400 });
  }

  const { data: charge, error } = await auth.adminClient
    .from("charges")
    .update(nextFields)
    .eq("id", chargeId)
    .select("*")
    .single();

  if (error || !charge) {
    throw Object.assign(new Error(error?.message || "Failed to adjust charge"), { status: 400 });
  }

  await createInAppNotification(auth.adminClient, {
    userId: charge.user_id,
    title: "Charge adjusted",
    body: `A post-booking charge was adjusted to ${readableMoney(charge.amount, charge.currency)}.`,
    type: "charge_adjusted",
    channel: "in_app",
    data: { charge_id: charge.id },
  });

  return { charge };
}

async function applyAcceptedModificationIfPayable({ adminClient, chargeId }) {
  const { data: linkedMods } = await adminClient
    .from("booking_modifications")
    .select("*")
    .eq("charge_id", chargeId)
    .eq("status", "accepted")
    .limit(1);

  const mod = (linkedMods || [])[0];
  if (!mod) return null;

  const updatePayload = {
    check_in: mod.new_check_in || mod.old_check_in,
    check_out: mod.new_check_out || mod.old_check_out,
    total_price: mod.new_price,
    ...(mod.new_property_id ? { property_id: mod.new_property_id } : {}),
  };

  await adminClient
    .from("bookings")
    .update(updatePayload)
    .eq("id", mod.booking_id);

  await adminClient
    .from("booking_modifications")
    .update({
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", mod.id);

  return mod;
}

async function payCharge({ auth, body }) {
  const chargeId = safeStr(body.charge_id, 80);
  const rawMethod = safeStr(body.method || body.payment_method || "", 64).toLowerCase();
  const method = rawMethod === "mobile" ? "mobile_money" : rawMethod;

  if (!chargeId || !method) {
    throw Object.assign(new Error("charge_id and payment method are required"), { status: 400 });
  }

  if (!["card", "mobile_money"].includes(method)) {
    throw Object.assign(new Error("Unsupported payment method"), { status: 400 });
  }

  const charge = await ensureUserOwnsCharge(auth.adminClient, chargeId, auth.userId);
  if (charge.status !== "pending") {
    throw Object.assign(new Error(`Charge status is ${charge.status}; only pending charges can be paid`), { status: 400 });
  }

  return initializeChargePayment({ auth, charge, method, body });
}

async function respondModification({ auth, body }) {
  const modificationId = safeStr(body.booking_modification_id, 80);
  const decision = safeStr(body.decision, 32).toLowerCase();
  const note = safeStr(body.note, 2000);

  if (!modificationId || !["accept", "reject"].includes(decision)) {
    throw Object.assign(new Error("booking_modification_id and decision (accept|reject) are required"), { status: 400 });
  }

  const { data: mod, error: modErr } = await auth.adminClient
    .from("booking_modifications")
    .select("*")
    .eq("id", modificationId)
    .single();

  if (modErr || !mod) {
    throw Object.assign(new Error("Booking modification not found"), { status: 404 });
  }

  if (mod.user_id !== auth.userId) {
    throw Object.assign(new Error("Forbidden: modification does not belong to current user"), { status: 403 });
  }

  if (mod.status !== "pending") {
    throw Object.assign(new Error(`Modification status is ${mod.status}; only pending changes can be responded to`), { status: 400 });
  }

  const nowIso = new Date().toISOString();

  if (decision === "reject") {
    const { data: updated, error: updErr } = await auth.adminClient
      .from("booking_modifications")
      .update({
        status: "rejected",
        response_note: note || null,
        responded_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", mod.id)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw Object.assign(new Error(updErr?.message || "Failed to reject booking modification"), { status: 400 });
    }

    return { booking_modification: updated };
  }

  // Accept flow
  let paymentStatus = mod.payment_status;

  if (safeAmount(mod.difference) > 0) {
    paymentStatus = "pending";

    if (mod.charge_id) {
      const { data: charge } = await auth.adminClient
        .from("charges")
        .select("id, status")
        .eq("id", mod.charge_id)
        .maybeSingle();

      if (charge?.status === "paid") {
        paymentStatus = "paid";
      }
    }
  } else if (safeAmount(mod.difference) < 0) {
    // Wallet system removed: mark as refunded without wallet credit transaction.
    paymentStatus = "refunded";
  } else {
    paymentStatus = "not_required";
  }

  const { data: accepted, error: acceptErr } = await auth.adminClient
    .from("booking_modifications")
    .update({
      status: "accepted",
      payment_status: paymentStatus,
      response_note: note || null,
      responded_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", mod.id)
    .select("*")
    .single();

  if (acceptErr || !accepted) {
    throw Object.assign(new Error(acceptErr?.message || "Failed to accept modification"), { status: 400 });
  }

  // If no additional payment is needed (or it's already paid), apply immediately.
  if (paymentStatus === "not_required" || paymentStatus === "refunded" || paymentStatus === "paid") {
    await auth.adminClient
      .from("bookings")
      .update({
        check_in: accepted.new_check_in || accepted.old_check_in,
        check_out: accepted.new_check_out || accepted.old_check_out,
        total_price: accepted.new_price,
        ...(accepted.new_property_id ? { property_id: accepted.new_property_id } : {}),
      })
      .eq("id", accepted.booking_id);
  }

  await createInAppNotification(auth.adminClient, {
    userId: auth.userId,
    title: "Modification response recorded",
    body: paymentStatus === "pending"
      ? "Please complete payment to finalize your accepted booking change."
      : "Your booking change has been accepted and processed.",
    type: "booking_modification_response",
    channel: "in_app",
    data: { booking_modification_id: accepted.id, payment_status: paymentStatus },
  });

  return { booking_modification: accepted };
}

async function setAutoChargeConsent({ auth, body }) {
  throw Object.assign(new Error("Wallet system has been removed"), { status: 410 });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  try {
    const auth = await authenticate(req);

    if (req.method === "GET") {
      const action = safeStr(req.query?.action || "user-overview", 80).toLowerCase();

      if (action === "user-overview") {
        const overview = await listUserOverview({ adminClient: auth.adminClient, userId: auth.userId });
        return json(res, 200, { ok: true, ...overview });
      }

      if (action === "admin-overview") {
        requireAdminOrStaff(auth);
        const overview = await listAdminOverview({ adminClient: auth.adminClient });
        return json(res, 200, { ok: true, ...overview });
      }

      if (action === "host-overview") {
        requireHost(auth);
        const overview = await listHostOverview({ adminClient: auth.adminClient, hostId: auth.userId });
        return json(res, 200, { ok: true, ...overview });
      }

      if (action === "host-bookings") {
        requireHost(auth);
        const result = await listHostBookings({ adminClient: auth.adminClient, hostId: auth.userId });
        return json(res, 200, { ok: true, ...result });
      }

      return json(res, 400, { ok: false, error: "Unsupported action" });
    }

    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const body = req.body || {};
    const action = safeStr(body.action, 80).toLowerCase();

    if (!action) {
      return json(res, 400, { ok: false, error: "Missing action" });
    }

    let result = null;

    if (action === "create-charge") {
      result = await createCharge({ auth, body });
      } else if (action === "adjust-charge") {
        result = await adjustCharge({ auth, body });
      } else if (action === "update-charge-status") {
        result = await updateChargeStatus({ auth, body });
    } else if (action === "create-modification" || action === "propose-alternative") {
      const normalizedBody = action === "propose-alternative"
        ? { ...body, modification_type: "alternative_offer" }
        : body;
      result = await createModification({ auth, body: normalizedBody });
    } else if (action === "open-dispute") {
      result = await openDispute({ auth, body });
    } else if (action === "host-respond-dispute") {
      result = await respondDisputeAsHost({ auth, body });
    } else if (action === "guest-respond-dispute") {
      result = await respondDisputeAsGuest({ auth, body });
    } else if (action === "resolve-dispute") {
      result = await resolveDispute({ auth, body });
    } else if (action === "pay-charge") {
      result = await payCharge({ auth, body });
    } else if (action === "respond-modification") {
      result = await respondModification({ auth, body });
    } else {
      return json(res, 400, { ok: false, error: `Unsupported action: ${action}` });
    }

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    const status = Number(error?.status || 500);
    return json(res, status, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
