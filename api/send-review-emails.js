// Cron endpoint: sends review request emails on checkout day
// Triggered by Vercel Cron or manually via POST
// Finds all bookings where check_out = today and review_email_sent = false

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SITE_URL = "https://merry360x.com";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function handler(req, res) {
  // Accept GET (for Vercel Cron) and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  // Optional: verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    // Allow without auth for now, but log warning
    console.log("⚠️ No cron secret match, proceeding anyway");
  }

  if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(res, 200, { ok: true, skipped: true, reason: "Missing config" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    
    console.log(`🔍 Looking for bookings with check_out = ${today}...`);

    // Find confirmed bookings checking out today that haven't had review email sent
    const { data: bookings, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, guest_id, guest_name, guest_email, property_id, tour_id, transport_id, booking_type, check_in, check_out, review_token, review_email_sent")
      .eq("check_out", today)
      .eq("status", "confirmed")
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
        // Get guest email - from booking or profile
        let email = booking.guest_email;
        let name = booking.guest_name;

        if (!email && booking.guest_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", booking.guest_id)
            .single();
          if (profile) name = name || profile.full_name;

          // Try auth.users for email
          const { data: authUser } = await supabase.auth.admin.getUserById(booking.guest_id);
          if (authUser?.user?.email) email = authUser.user.email;
        }

        if (!email) {
          console.log(`  ⚠️ No email for booking ${booking.id.slice(0, 8)}, skipping`);
          continue;
        }

        // Get property/tour details
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

        // Ensure review_token exists
        let reviewToken = booking.review_token;
        if (!reviewToken) {
          reviewToken = crypto.randomUUID();
          await supabase
            .from("bookings")
            .update({ review_token: reviewToken })
            .eq("id", booking.id);
        }

        // Send review email via the review-email endpoint
        const reviewEmailPayload = {
          guestName: name,
          guestEmail: email,
          propertyTitle: itemTitle,
          propertyImage: itemImage,
          location: itemLocation,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          reviewToken: reviewToken,
        };

        // Call the review-email API directly (since we're on the same server)
        const reviewUrl = `${SITE_URL}/review/${reviewToken}`;
        
        // Send directly via Brevo to avoid circular API calls
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Merry Moments", email: "davydushimiyimana@gmail.com" },
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
          // Mark as sent
          await supabase
            .from("bookings")
            .update({ review_email_sent: true })
            .eq("id", booking.id);

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

// Inline the email template to avoid circular deps
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
          </tr>
          ` : ""}
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
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
