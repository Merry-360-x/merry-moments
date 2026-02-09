// API endpoint to submit a review via token (no login required)
// Used by the standalone review page linked from checkout-day emails

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // GET: Fetch booking info by token (for the review page to display)
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

    // Fetch property/tour/transport details
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

    // Look up booking by token
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, guest_id, property_id, tour_id, transport_id, status, check_out, review_token")
      .eq("review_token", token)
      .single();

    if (bookingErr || !booking) {
      return json(res, 404, { error: "Invalid or expired review link" });
    }

    // Validate booking is eligible (confirmed + past checkout)
    if (booking.status !== "confirmed") {
      return json(res, 400, { error: "Booking is not eligible for review" });
    }

    const checkOutDate = new Date(booking.check_out);
    if (checkOutDate > new Date()) {
      return json(res, 400, { error: "You can only review after check-out" });
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from("property_reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return json(res, 409, { error: "You have already reviewed this booking" });
    }

    // Insert review
    const reviewData = {
      booking_id: booking.id,
      property_id: booking.property_id || booking.tour_id || booking.transport_id,
      reviewer_id: booking.guest_id,
      rating: accommodationRating,
      comment: accommodationComment?.trim() || null,
      service_rating: serviceRating || null,
      service_comment: serviceComment?.trim() || null,
    };

    const { error: insertErr } = await supabase
      .from("property_reviews")
      .insert(reviewData);

    if (insertErr) {
      console.error("❌ Review insert error:", insertErr);
      return json(res, 500, { error: "Failed to save review" });
    }

    // Invalidate the token by regenerating it (one-time use)
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
