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
  };
}

function requireAdminOrStaff(auth) {
  if (!auth?.isAdminOrStaff) {
    throw Object.assign(new Error("Forbidden: admin or staff role required"), { status: 403 });
  }
}

async function getBookingOrThrow(adminClient, bookingId) {
  const { data: booking, error } = await adminClient
    .from("bookings")
    .select("id, guest_id, guest_email, guest_name, host_id, property_id, check_in, check_out, total_price, currency, booking_type")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }

  return booking;
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
    subtitle: "Review the reason and pay securely from your post-booking center.",
    bodyHtml: keyValueRows([
      { label: "Booking", value: escapeHtml(bookingRef) },
      { label: "Type", value: escapeHtml(String(charge.charge_type || "").replaceAll("_", " ")) },
      { label: "Amount", value: escapeHtml(readableMoney(charge.amount, charge.currency)) },
      { label: "Status", value: escapeHtml(String(charge.status || "pending")) },
      { label: "Description", value: escapeHtml(String(charge.description || "")) },
    ]),
    ctaText: "Open Post-Booking Center",
    ctaUrl: appUrl("/post-booking"),
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
    ctaText: "Review Change",
    ctaUrl: appUrl("/post-booking"),
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

async function listUserOverview({ adminClient, userId }) {
  const [
    chargesRes,
    modificationsRes,
    disputesRes,
    walletRes,
    walletTxRes,
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
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("wallet_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300),
    adminClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    charges: chargesRes.data || [],
    booking_modifications: modificationsRes.data || [],
    disputes: disputesRes.data || [],
    wallet_account: walletRes.data || null,
    wallet_transactions: walletTxRes.data || [],
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
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return {
    charges: chargesRes.data || [],
    booking_modifications: modificationsRes.data || [],
    disputes: disputesRes.data || [],
  };
}

async function createCharge({ auth, body }) {
  requireAdminOrStaff(auth);

  const bookingId = safeStr(body.booking_id, 80);
  const chargeType = safeStr(body.charge_type, 64).toLowerCase();
  const amount = safeAmount(body.amount);
  const description = safeStr(body.description, 2000);
  const currency = safeStr(body.currency || "USD", 12).toUpperCase();
  const proofUrls = normalizeList(body.proof_urls || body.proof || []);
  const dueAt = body.due_at ? new Date(body.due_at).toISOString() : null;
  const autoChargeAllowed = Boolean(body.auto_charge_allowed);

  if (!bookingId || !chargeType || amount <= 0 || !description) {
    throw Object.assign(new Error("booking_id, charge_type, amount, and description are required"), { status: 400 });
  }

  const booking = await getBookingOrThrow(auth.adminClient, bookingId);

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
      auto_charge_allowed: autoChargeAllowed,
      due_at: dueAt,
      metadata: {
        source: "post_booking_admin",
        requested_by: auth.userId,
      },
    })
    .select("*")
    .single();

  if (error || !charge) {
    throw Object.assign(new Error(error?.message || "Failed to create charge"), { status: 400 });
  }

  const autoCharge = await tryAutoChargeFromWallet({ adminClient: auth.adminClient, charge });
  const finalCharge = autoCharge.charge || charge;

  await notifyChargeCreated({
    adminClient: auth.adminClient,
    booking,
    charge: finalCharge,
    userEmail: booking.guest_email,
  });

  return {
    charge: finalCharge,
    auto_charge_applied: Boolean(autoCharge.autoCharged),
    auto_charge_error: autoCharge.autoChargeError || null,
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

  const { data: dispute, error: disputeErr } = await auth.adminClient
    .from("disputes")
    .insert({
      booking_id: bookingId,
      charge_id: chargeId || null,
      booking_modification_id: modificationId || null,
      user_id: auth.userId,
      opened_by: auth.userId,
      reason,
      details: details || null,
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

  await createInAppNotification(auth.adminClient, {
    userId: auth.userId,
    title: "Dispute opened",
    body: "Your dispute has been received and is under review.",
    type: "dispute_opened",
    channel: "in_app",
    data: { dispute_id: dispute.id, booking_id: bookingId, charge_id: chargeId || null },
  });

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

  await createInAppNotification(auth.adminClient, {
    userId: dispute.user_id,
    title: "Dispute update",
    body: `Your dispute status is now ${nextStatus.replaceAll("_", " ")}.`,
    type: "dispute_update",
    channel: "in_app",
    data: { dispute_id: dispute.id, status: nextStatus },
  });

  return { dispute };
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

  if (!["wallet", "card", "mobile_money"].includes(method)) {
    throw Object.assign(new Error("Unsupported payment method"), { status: 400 });
  }

  const charge = await ensureUserOwnsCharge(auth.adminClient, chargeId, auth.userId);
  if (charge.status !== "pending") {
    throw Object.assign(new Error(`Charge status is ${charge.status}; only pending charges can be paid`), { status: 400 });
  }

  const nowIso = new Date().toISOString();

  if (method === "wallet") {
    const { error: txErr } = await auth.adminClient.rpc("wallet_apply_transaction", {
      p_user_id: auth.userId,
      p_tx_type: "charge_payment",
      p_direction: "out",
      p_amount: safeAmount(charge.amount),
      p_reference_type: "charge",
      p_reference_id: charge.id,
      p_notes: "Post-booking charge payment",
      p_metadata: {
        charge_id: charge.id,
        booking_id: charge.booking_id,
      },
    });

    if (txErr) {
      throw Object.assign(new Error(txErr.message || "Wallet payment failed"), { status: 400 });
    }

    const { data: paidCharge, error: updErr } = await auth.adminClient
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
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (updErr || !paidCharge) {
      throw Object.assign(new Error(updErr?.message || "Failed to update charge status"), { status: 400 });
    }

    await applyAcceptedModificationIfPayable({ adminClient: auth.adminClient, chargeId: charge.id });

    await createInAppNotification(auth.adminClient, {
      userId: auth.userId,
      title: "Payment successful",
      body: `Charge payment of ${readableMoney(paidCharge.amount, paidCharge.currency)} was successful.`,
      type: "payment_success",
      channel: "in_app",
      data: { charge_id: paidCharge.id, booking_id: paidCharge.booking_id },
    });

    return {
      payment_status: "paid",
      charge: paidCharge,
      provider: "wallet",
    };
  }

  // Card/mobile money flow initialization through existing checkout + payment endpoints.
  // Server computes/locks amount so the client cannot tamper with charge value.
  const amount = safeAmount(charge.amount);

  const { data: profile } = await auth.adminClient
    .from("profiles")
    .select("full_name, email, phone")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const checkoutPayload = {
    user_id: auth.userId,
    name: safeStr(profile?.full_name || "Guest", 120),
    email: safeStr(profile?.email || auth.userEmail || "", 160) || null,
    phone: safeStr(profile?.phone || "", 40) || null,
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

  // Optional convenience: initialize provider in one call if enough details are supplied.
  if (method === "card" && body.initialize === true) {
    const flwResp = await fetch(appUrl("/api/flutterwave"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-payment",
        checkoutId: checkout.id,
        amount: checkout.total_amount,
        currency: checkout.currency,
        payerName: safeStr(profile?.full_name || "Guest", 120),
        payerEmail: safeStr(profile?.email || auth.userEmail || "", 160),
        phoneNumber: safeStr(profile?.phone || "", 40),
        description: `Post-booking charge ${charge.id}`,
        redirectUrl: appUrl(`/payment-pending?checkoutId=${encodeURIComponent(checkout.id)}&provider=flutterwave`),
      }),
    }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .catch((err) => ({ ok: false, body: { error: err instanceof Error ? err.message : "flutterwave_init_failed" } }));

    response.flutterwave = flwResp;
  }

  if (method === "mobile_money" && body.initialize === true) {
    const provider = safeStr(body.provider, 80);
    const phoneNumber = safeStr(body.phone_number || body.phone, 32);

    if (provider && phoneNumber) {
      const mpResp = await fetch(appUrl("/api/pawapay-create-payment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId: checkout.id,
          amount: checkout.total_amount,
          phoneNumber,
          payerName: safeStr(profile?.full_name || "Guest", 120),
          payerEmail: safeStr(profile?.email || auth.userEmail || "", 160),
          provider,
          description: `Post-booking charge ${charge.id}`,
        }),
      }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
        .catch((err) => ({ ok: false, body: { error: err instanceof Error ? err.message : "pawapay_init_failed" } }));

      response.mobile_money = mpResp;
    }
  }

  return response;
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
    // Refund as wallet credit
    await auth.adminClient.rpc("wallet_apply_transaction", {
      p_user_id: auth.userId,
      p_tx_type: "refund",
      p_direction: "in",
      p_amount: Math.abs(safeAmount(mod.difference)),
      p_reference_type: "booking_modification",
      p_reference_id: mod.id,
      p_notes: "Booking modification refund credit",
      p_metadata: {
        booking_modification_id: mod.id,
        booking_id: mod.booking_id,
      },
    });
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
  const consent = Boolean(body.auto_charge_consent);
  const currency = safeStr(body.currency || "USD", 12).toUpperCase();

  await auth.adminClient.rpc("ensure_wallet_account", {
    p_user_id: auth.userId,
    p_currency: currency,
  });

  const { data, error } = await auth.adminClient
    .from("wallet_accounts")
    .update({
      auto_charge_consent: consent,
      currency,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !data) {
    throw Object.assign(new Error(error?.message || "Failed to update wallet preferences"), { status: 400 });
  }

  return { wallet_account: data };
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
    } else if (action === "resolve-dispute") {
      result = await resolveDispute({ auth, body });
    } else if (action === "pay-charge") {
      result = await payCharge({ auth, body });
    } else if (action === "respond-modification") {
      result = await respondModification({ auth, body });
    } else if (action === "set-auto-charge-consent") {
      result = await setAutoChargeConsent({ auth, body });
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
