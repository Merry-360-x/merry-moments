// Unified review API — combines submit, send-email, and cron functionality
// Routes based on query param: ?action=submit-review | send-email | send-emails
// Default: submit-review (GET fetches booking info, POST submits review)

import { createClient } from "@supabase/supabase-js";
import { escapeHtml, keyValueRows, renderMinimalEmail } from "../lib/email-template-kit.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SITE_URL = "https://merry360x.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Main handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  const action = req.query.action || "submit-review";

  switch (action) {
    case "send-emails":
      return handleSendEmails(req, res);
    case "send-email":
      return handleSendEmail(req, res);
    default:
      return handleSubmitReview(req, res);
  }
}

// ─── 1. Submit Review (GET = fetch booking, POST = submit) ───────────────────
async function handleSubmitReview(req, res) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // GET: Fetch booking info by token
  if (req.method === "GET") {
    const token = req.query.token;
    if (!token) return json(res, 400, { error: "Missing token" });

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, property_id, tour_id, transport_id, booking_type, check_in, check_out, guest_name, guest_email, total_price, currency, status, review_token")
      .eq("review_token", token)
      .single();

    if (error || !booking) {
      return json(res, 404, { error: "Booking not found or invalid token" });
    }

    // Check if already reviewed
    const { data: existingReview } = await supabase
      .from("property_reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .limit(1);

    if (existingReview && existingReview.length > 0) {
      return json(res, 200, { alreadyReviewed: true, booking: { id: booking.id } });
    }

    // Fetch property/tour details
    let itemTitle = "Your Stay";
    let itemImage = null;
    let itemLocation = null;

    if (booking.property_id) {
      const { data: prop } = await supabase
        .from("properties")
        .select("title, location, main_image, images")
        .eq("id", booking.property_id)
        .single();
      if (prop) {
        itemTitle = prop.title;
        itemLocation = prop.location;
        itemImage = prop.main_image || (prop.images && prop.images[0]) || null;
      }
    } else if (booking.tour_id) {
      const { data: tour } = await supabase
        .from("tour_packages")
        .select("title, location, images")
        .eq("id", booking.tour_id)
        .single();
      if (tour) {
        itemTitle = tour.title;
        itemLocation = tour.location;
        itemImage = tour.images && tour.images[0];
      }
    }

    return json(res, 200, {
      booking: {
        id: booking.id,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        guestName: booking.guest_name,
        bookingType: booking.booking_type || "property",
      },
      item: { title: itemTitle, location: itemLocation, image: itemImage },
      alreadyReviewed: false,
    });
  }

  // POST: Submit a review
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const { token, accommodationRating, accommodationComment, serviceRating, serviceComment } = req.body;

    if (!token) return json(res, 400, { error: "Missing token" });
    if (!accommodationRating || accommodationRating < 1 || accommodationRating > 5) {
      return json(res, 400, { error: "Accommodation rating must be 1-5" });
    }
    if (serviceRating && (serviceRating < 1 || serviceRating > 5)) {
      return json(res, 400, { error: "Service rating must be 1-5" });
    }

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, guest_id, property_id, tour_id, transport_id, status, check_out, review_token")
      .eq("review_token", token)
      .single();

    if (bookingErr || !booking) {
      return json(res, 404, { error: "Invalid or expired review link" });
    }

    if (booking.status !== "confirmed" && booking.status !== "completed") {
      return json(res, 400, { error: "Booking is not eligible for review" });
    }

    const { data: existing } = await supabase
      .from("property_reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return json(res, 409, { error: "You have already reviewed this booking" });
    }

    const reviewData = {
      booking_id: booking.id,
      property_id: booking.property_id || booking.tour_id || booking.transport_id,
      reviewer_id: booking.guest_id,
      rating: accommodationRating,
      comment: accommodationComment?.trim() || null,
      service_rating: serviceRating || null,
      service_comment: serviceComment?.trim() || null,
    };

    const { error: insertErr } = await supabase.from("property_reviews").insert(reviewData);

    if (insertErr) {
      console.error("❌ Review insert error:", insertErr);
      return json(res, 500, { error: "Failed to save review" });
    }

    // Regenerate token (one-time use)
    await supabase
      .from("bookings")
      .update({ review_token: crypto.randomUUID() })
      .eq("id", booking.id);

    console.log(`✅ Review submitted for booking ${booking.id.slice(0, 8)} via email token`);
    return json(res, 200, { ok: true, message: "Review submitted successfully" });
  } catch (error) {
    console.error("❌ Review submission error:", error.message);
    return json(res, 500, { error: error.message });
  }
}

// ─── 2. Send single review email ────────────────────────────────────────────
async function handleSendEmail(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  if (!BREVO_API_KEY) {
    return json(res, 200, { ok: true, skipped: true, reason: "No Brevo API key" });
  }

  try {
    const { guestName, guestEmail, propertyTitle, propertyImage, location, checkIn, checkOut, reviewToken } = req.body;

    if (!guestEmail || !reviewToken) {
      return json(res, 400, { error: "Missing required fields (guestEmail, reviewToken)" });
    }

    const reviewUrl = `${SITE_URL}/review/${reviewToken}`;

    const html = generateReviewEmailHtml({
      guestName,
      propertyTitle,
      propertyImage,
      location,
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
      reviewUrl,
    });

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Merry Moments", email: "support@merry360x.com" },
        to: [{ email: guestEmail, name: guestName || "Guest" }],
        subject: `⭐ How was your stay at ${propertyTitle || "your accommodation"}?`,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`📧 Review email sent to ${guestEmail} (token: ${reviewToken.slice(0, 8)}...)`);
      return json(res, 200, { ok: true, messageId: result.messageId });
    } else {
      console.error("❌ Brevo API error:", result);
      return json(res, 500, { error: "Failed to send email", details: result });
    }
  } catch (error) {
    console.error("❌ Review email error:", error.message);
    return json(res, 500, { error: error.message });
  }
}

// ─── 3. Cron: Send review emails for today's checkouts ──────────────────────
async function handleSendEmails(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(res, 200, { ok: true, skipped: true, reason: "Missing config" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const today = new Date().toISOString().split("T")[0];
    console.log(`🔍 Looking for bookings with check_out = ${today}...`);

    const { data: bookings, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, guest_id, guest_name, guest_email, property_id, tour_id, transport_id, booking_type, check_in, check_out, review_token, review_email_sent")
      .eq("check_out", today)
      .in("status", ["confirmed", "completed"])
      .or("review_email_sent.is.null,review_email_sent.eq.false");

    if (fetchErr) {
      console.error("❌ Error fetching bookings:", fetchErr);
      return json(res, 500, { error: fetchErr.message });
    }

    if (!bookings || bookings.length === 0) {
      console.log("📭 No bookings checking out today that need review emails");
      return json(res, 200, { ok: true, sent: 0, message: "No eligible bookings" });
    }

    console.log(`📋 Found ${bookings.length} booking(s) to send review emails for`);

    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      try {
        let email = booking.guest_email;
        let name = booking.guest_name;

        if (!email && booking.guest_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", booking.guest_id)
            .single();
          if (profile) name = name || profile.full_name;
          const { data: authUser } = await supabase.auth.admin.getUserById(booking.guest_id);
          if (authUser?.user?.email) email = authUser.user.email;
        }

        if (!email) {
          console.log(`  ⚠️ No email for booking ${booking.id.slice(0, 8)}, skipping`);
          continue;
        }

        let itemTitle = "Your Stay";
        let itemImage = null;
        let itemLocation = null;

        if (booking.property_id) {
          const { data: prop } = await supabase
            .from("properties")
            .select("title, location, main_image, images")
            .eq("id", booking.property_id)
            .single();
          if (prop) {
            itemTitle = prop.title;
            itemLocation = prop.location;
            itemImage = prop.main_image || (prop.images && prop.images[0]);
          }
        } else if (booking.tour_id) {
          const { data: tour } = await supabase
            .from("tour_packages")
            .select("title, location, images")
            .eq("id", booking.tour_id)
            .single();
          if (tour) {
            itemTitle = tour.title;
            itemLocation = tour.location;
            itemImage = tour.images && tour.images[0];
          }
        }

        let reviewToken = booking.review_token;
        if (!reviewToken) {
          reviewToken = crypto.randomUUID();
          await supabase.from("bookings").update({ review_token: reviewToken }).eq("id", booking.id);
        }

        const reviewUrl = `${SITE_URL}/review/${reviewToken}`;

        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Merry Moments", email: "support@merry360x.com" },
            to: [{ email, name: name || "Guest" }],
            subject: `⭐ How was your stay at ${itemTitle}?`,
            htmlContent: generateReviewEmailHtml({
              guestName: name,
              propertyTitle: itemTitle,
              propertyImage: itemImage,
              location: itemLocation,
              checkIn: formatDate(booking.check_in),
              checkOut: formatDate(booking.check_out),
              reviewUrl,
            }),
          }),
        });

        if (response.ok) {
          await supabase.from("bookings").update({ review_email_sent: true }).eq("id", booking.id);
          sent++;
          console.log(`  ✅ Review email sent to ${email} for booking ${booking.id.slice(0, 8)}`);
        } else {
          const err = await response.text();
          console.error(`  ❌ Failed to send to ${email}: ${err}`);
          failed++;
        }
      } catch (e) {
        console.error(`  ❌ Error processing booking ${booking.id.slice(0, 8)}:`, e.message);
        failed++;
      }
    }

    console.log(`📊 Review emails: ${sent} sent, ${failed} failed`);
    return json(res, 200, { ok: true, sent, failed, total: bookings.length });
  } catch (error) {
    console.error("❌ Cron error:", error.message);
    return json(res, 500, { error: error.message });
  }
}

// ─── Email template ─────────────────────────────────────────────────────────
function generateReviewEmailHtml({ guestName, propertyTitle, propertyImage, location, checkIn, checkOut, reviewUrl }) {
  const details = keyValueRows([
    { label: "Stay", value: escapeHtml(propertyTitle || "Your booking") },
    { label: "Location", value: escapeHtml(location || "—") },
    { label: "Dates", value: `${escapeHtml(checkIn || "—")} → ${escapeHtml(checkOut || "—")}` },
  ]);

  const stars = [1, 2, 3, 4, 5]
    .map(
      (value) => `<a href="${reviewUrl}?rating=${value}" style="display:inline-block;text-decoration:none;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-right:6px;color:#111827;font-size:13px;">${"★".repeat(value)}</a>`
    )
    .join("");

  const image = propertyImage
    ? `<img src="${propertyImage}" alt="${escapeHtml(propertyTitle || "Stay")}" style="display:block;width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin:0 0 14px;" />`
    : "";

  return renderMinimalEmail({
    eyebrow: "Guest Feedback",
    title: "How was your stay?",
    subtitle: `Hi ${guestName || "there"}, your feedback helps travelers and hosts alike.`,
    bodyHtml: `${image}${details}<div style="margin-top:14px;">${stars}</div>`,
    ctaText: "Leave a Review",
    ctaUrl: reviewUrl,
    footerLink: SITE_URL,
  });
}
