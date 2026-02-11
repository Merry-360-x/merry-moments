// Unified review API — combines submit, send-email, and cron functionality
// Routes based on query param: ?action=submit-review | send-email | send-emails
// Default: submit-review (GET fetches booking info, POST submits review)

import { createClient } from "@supabase/supabase-js";

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
        .from("tours")
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

    const checkOutDate = new Date(booking.check_out);
    if (checkOutDate > new Date()) {
      return json(res, 400, { error: "You can only review after check-out" });
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
        subject: `⭐ How was your stay at ${propertyTitle || "your accommodation"}?
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
      .eq("review_email_sent", false);

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
            .from("tours")
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
  const logoUrl = "https://merry360x.com/brand/logo.png";
  const primaryColor = "#E64980";
  const lightPink = "#FDF2F8";
  const starColor = "#f59e0b";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your stay?</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px 40px 16px; text-align: center;">
              <img src="${logoUrl}" alt="Merry Moments" width="56" height="56" style="display: inline-block; max-width: 56px; height: auto; border-radius: 12px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h1 style="margin: 0 0 8px; color: #1f2937; font-size: 24px; font-weight: 600;">How was your stay?</h1>
              <p style="margin: 0; color: #6b7280; font-size: 15px;">Hi ${guestName || "there"}, we hope you had a wonderful experience!</p>
            </td>
          </tr>
          ${propertyImage ? `
          <tr>
            <td style="padding: 0 40px 20px;">
              <img src="${propertyImage}" alt="${propertyTitle}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px;" />
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 6px; color: #1f2937; font-size: 18px; font-weight: 600;">${propertyTitle || "Your Stay"}</h2>
              ${location ? `<p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">📍 ${location}</p>` : ""}
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">${checkIn} → ${checkOut}</p>
            </td>
          </tr>
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #e5e7eb;"></div></td></tr>
          <tr>
            <td style="padding: 28px 40px 8px; text-align: center;">
              <p style="margin: 0 0 4px; color: #4b5563; font-size: 15px; font-weight: 600;">Rate your accommodation</p>
              <p style="margin: 0 0 16px; color: #9ca3af; font-size: 13px;">Tap a star to start your review</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  ${[1,2,3,4,5].map(s => `<td style="padding: 0 4px;"><a href="${reviewUrl}?rating=${s}" style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; border-radius: 12px; border: 2px solid ${s <= 3 ? '#e5e7eb' : starColor}; text-decoration: none; font-size: 24px; background-color: #fffbeb;">⭐</a></td>`).join('')}
                </tr>
                <tr>
                  ${[1,2,3,4,5].map(s => `<td style="padding: 4px 4px 0; text-align: center;"><span style="font-size: 11px; color: #9ca3af;">${s}</span></td>`).join('')}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 8px; text-align: center;">
              <div style="background-color: ${lightPink}; border-radius: 12px; padding: 16px 20px;">
                <p style="margin: 0 0 4px; color: ${primaryColor}; font-size: 14px; font-weight: 600;">✨ Quick & easy review</p>
                <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">Rate both the accommodation and our service on a simple page — no login required. Takes less than a minute!</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px; text-align: center;">
              <a href="${reviewUrl}" style="display: inline-block; padding: 14px 40px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Leave Your Review</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Your feedback helps other travelers and our hosts improve.</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">Merry Moments · Book local. Travel better.</p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px;"><a href="${SITE_URL}" style="color: #9ca3af; text-decoration: none;">merry360x.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
