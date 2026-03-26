import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getProductKnowledge } from "../lib/ai-product-knowledge.js";
import { answerTripAdvisorQuestion } from "../lib/trip-advisor-brain.js";
import { searchTripAdvisorKnowledge } from "../lib/trip-advisor-knowledge-search.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-nano";
const OPENAI_MAX_OUTPUT_TOKENS = Math.max(120, Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 320));
const AI_RATE_WINDOW_MS = Math.max(60_000, Number(process.env.AI_RATE_WINDOW_MS || 5 * 60_000));
const AI_RATE_MAX_REQUESTS = Math.max(3, Number(process.env.AI_RATE_MAX_REQUESTS || 10));
const AI_CACHE_TTL_MS = Math.max(60_000, Number(process.env.AI_CACHE_TTL_MS || 10 * 60_000));
const AI_CACHE_VERSION = "v7";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;
const rateBuckets = new Map();
const responseCache = new Map();

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "in", "is", "it",
  "me", "my", "of", "on", "or", "our", "that", "the", "this", "to", "we", "what", "when", "where",
  "which", "who", "why", "with", "you", "your", "can", "could", "would", "should", "please", "do",
  "does", "did", "want", "need", "looking", "like", "just", "also", "really", "very", "some", "any",
]);

const GENERIC_SEARCH_TERMS = new Set([
  "apartment", "apartments", "airport", "pickup", "book", "booking", "stay", "stays", "hotel", "hotels",
  "room", "rooms", "house", "houses", "villa", "villas", "transport", "transfer", "trip", "travel",
  "luxury", "premium", "romantic", "holiday", "vacation", "night", "nights", "guest", "guests",
]);

const ACTION_INTENT_TERMS = {
  cart: /(trip cart|my cart|what(?:'s| is) in (?:my )?cart|show (?:my )?cart)/i,
  bookings: /(my bookings|show (?:my )?bookings|booking status|check (?:my )?booking|order status)/i,
  refund: /(refund|cancel.*refund|request refund)/i,
  checkout: /(checkout|proceed to payment|book now|pay now)/i,
};

const FAQ_RULES = [
  {
    keywords: ["hello"],
    reply: "Hi. I am your Merry360X Trip Advisor. I can help you find stays, tours, transport, booking guidance, or explain how Merry360X works.",
  },
  {
    keywords: ["hi"],
    reply: "Hi. I can help with stays, tours, transport, booking guidance, or questions about Merry360X.",
  },
  {
    keywords: ["hey"],
    reply: "Hey. Tell me your destination, dates, or budget and I will help you plan with Merry360X listings and travel tips.",
  },
  {
    keywords: ["what", "merry360x"],
    reply: "Merry360X is a travel marketplace where you can book accommodations, tours, transport, and travel experiences in one place. You can also browse stories, manage trips, and contact support at support@merry360x.com.",
  },
  {
    keywords: ["about", "merry360x"],
    reply: "Merry360X helps travelers book stays, tours, and transport in one place. The platform is designed to make planning simpler, with local options, transparent browsing, and host tools for managing services.",
  },
  {
    keywords: ["what can i book"],
    reply: "On Merry360X you can book accommodations, tours, transport, and other travel experiences. If you already know your destination, tell me where you are going and I can narrow it down.",
  },
  {
    keywords: ["how", "book"],
    reply: "To book on Merry360X, open a stay, tour, or transport listing, choose your dates or trip details, add it to your trip cart or continue to checkout, then complete payment using the available checkout options.",
  },
  {
    keywords: ["payment"],
    reply: "Merry360X accepts approved digital and local payment methods shown at checkout. Available payment options can vary by service and location, so the final choices are displayed during checkout.",
  },
  {
    keywords: ["support"],
    reply: "For booking or account help, contact Merry360X support at support@merry360x.com. You can also use the Help Center on the site for common questions.",
  },
  {
    keywords: ["host"],
    reply: "If you want to list your service on Merry360X, you can apply as a host and then manage properties, tours, or transport from the Host Dashboard after approval.",
  },
  {
    keywords: ["story"],
    reply: "Merry360X also includes Stories, where travelers can discover content shared by the community while planning their trips.",
  },
  {
    keywords: ["create", "account"],
    reply: "To create an account, click Sign Up on Merry360x.com and register with your email or another supported login method. Keep your details accurate so bookings, confirmations, and support work smoothly.",
  },
  {
    keywords: ["sign up"],
    reply: "To sign up, open Merry360x.com, choose Sign Up, and register with your email or another supported login method. An account is required to manage bookings, receive confirmations, and access support.",
  },
  {
    keywords: ["signup"],
    reply: "To sign up, open Merry360x.com, choose Sign Up, and register with your email or another supported login method. An account is required to manage bookings, receive confirmations, and access support.",
  },
  {
    keywords: ["login"],
    reply: "To log in, use the Auth page on Merry360X with the email or login method linked to your account. If you cannot access your account, use the reset password flow or contact support@merry360x.com.",
  },
  {
    keywords: ["password"],
    reply: "If you forgot your password, use the reset password option on the login page. After updating your password, you can sign back in and continue managing your bookings and account.",
  },
  {
    keywords: ["cancel", "booking"],
    reply: "You can cancel a booking from My Bookings or from your confirmation email, depending on the listing rules. Refund eligibility depends on the host's cancellation policy, so always review the policy shown on the listing before booking.",
  },
  {
    keywords: ["refund"],
    reply: "Refund policies vary by listing and host. In general, go to My Bookings, open the booking, review the refund amount based on the cancellation policy, confirm cancellation, and refunds are usually processed to the original payment method within 5 to 10 business days.",
  },
  {
    keywords: ["refund", "processing"],
    reply: "Refunds are typically processed within 5 to 10 business days back to the original payment method. If there is a dispute or delay, contact support@merry360x.com or call +250 796 214 719.",
  },
  {
    keywords: ["safe"],
    reply: "For safety, use verified listings and official transport options, stay aware of your surroundings, and contact Merry360X support immediately if anything feels unsafe. If you need urgent help in Rwanda, Police is 112, Ambulance is 912, Fire Brigade is 111.",
  },
  {
    keywords: ["emergency"],
    reply: "Emergency contacts in Rwanda are Police 112, Ambulance 912, and Fire Brigade 111. Merry360X support is also available at +250 796 214 719 or support@merry360x.com.",
  },
  {
    keywords: ["unsafe"],
    reply: "If you face unsafe behavior or suspect fraud, use the report option on the platform or contact support immediately at support@merry360x.com. For urgent situations in Rwanda, Police is 112, Ambulance is 912, and Fire Brigade is 111.",
  },
  {
    keywords: ["fraud"],
    reply: "If you suspect fraud, report it through the platform or contact Merry360X support immediately at support@merry360x.com. Do not send payments or accept booking changes outside the platform.",
  },
  {
    keywords: ["verify", "service providers"],
    reply: "Merry360X conducts basic verification checks and monitors reviews, but users should still review listings carefully before booking. For hosts, approval is required before you can manage and publish services from the Host Dashboard.",
  },
  {
    keywords: ["host", "verification"],
    reply: "Host approval happens after you submit your details through the Become a Host flow. Once approved, you can manage and publish properties, tours, or transport from the Host Dashboard.",
  },
  {
    keywords: ["list", "service"],
    reply: "To list a service on Merry360X, go to the Become a Host page and submit your details for review. After approval, you can manage and publish properties, tours, or transport from the Host Dashboard.",
  },
  {
    keywords: ["become host"],
    reply: "To become a host, use the Become a Host page and submit your details for review. After approval, you can manage and publish your property, tours, or transport services from the Host Dashboard.",
  },
  {
    keywords: ["listing", "rules"],
    reply: "Hosts must submit their details for review before publishing services. Listings should be accurate, pricing should match what is shown on the platform, and cancellation terms should be clearly set so guests can review them before booking.",
  },
  {
    keywords: ["best time", "visit", "rwanda"],
    reply: "Best time for Rwanda is June to September for dry weather and easier road trips. March to May is greener and cheaper, but wetter. If you want gorilla trekking first, start with Volcanoes National Park.",
  },
  {
    keywords: ["gorilla", "trek"],
    reply: "For gorilla trekking, base yourself near Volcanoes National Park and book permits early. Plan 2 to 3 nights, add Kigali for arrival, and keep the schedule light the day before the trek.",
  },
  {
    keywords: ["kigali", "stay"],
    reply: "For Kigali, choose a central stay near Kimihurura, Kiyovu, or Nyarutarama if you want easier dining and transfers. If your trip is short, 2 nights in Kigali is usually enough before moving to safari or lake destinations.",
  },
  {
    keywords: ["airport", "transfer"],
    reply: "Airport transfer is best booked in advance, especially for late arrivals. If you land at Kigali International Airport, choose a stay within Kigali for the first night unless your driver is already confirmed for a longer transfer.",
  },
  {
    keywords: ["budget", "trip"],
    reply: "For a lower-budget trip, keep the route simple: Kigali plus one main destination, travel in the dry season shoulder months, and avoid changing hotels too often. That usually saves the most money.",
  },
  {
    keywords: ["visa"],
    reply: "Visa rules depend on passport and destination, so check the official government guidance before booking. If you tell me your nationality and destination, I can suggest the most practical trip plan around that.",
  },
];

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(body));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQueryTerms(value) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .filter((x) => x && x.length > 2 && !STOP_WORDS.has(x))
    )
  );
}

function getLatestUserText(messages) {
  const lastUserMessage = Array.isArray(messages)
    ? [...messages].reverse().find((m) => m && m.role === "user")
    : null;
  return String(lastUserMessage?.content || "");
}

function compactText(value, max = 180) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanAssistantReply(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  return String(authHeader).startsWith("Bearer ") ? String(authHeader).slice(7).trim() : "";
}

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return {
    id: data.user.id,
    email: data.user.email || "",
    token,
  };
}

function makeUiAction(action) {
  return {
    type: String(action?.type || ""),
    label: String(action?.label || "Action"),
    referenceId: action?.referenceId ? String(action.referenceId) : undefined,
    itemType: action?.itemType ? String(action.itemType) : undefined,
    bookingId: action?.bookingId ? String(action.bookingId) : undefined,
    orderId: action?.orderId ? String(action.orderId) : undefined,
    url: action?.url ? String(action.url) : undefined,
    variant: action?.variant ? String(action.variant) : undefined,
  };
}

function isActionRequest(userText, explicitAction = "") {
  const text = String(userText || "");
  return Boolean(
    explicitAction && explicitAction !== "rate_conversation"
      || ACTION_INTENT_TERMS.cart.test(text)
      || ACTION_INTENT_TERMS.bookings.test(text)
      || ACTION_INTENT_TERMS.refund.test(text)
      || ACTION_INTENT_TERMS.checkout.test(text)
  );
}

function extractReferenceId(userText, body = {}) {
  const direct = compactText(body.bookingId || body.orderId || body.referenceId, 120);
  if (direct) return direct;

  const labeledMatch = String(userText || "").match(/(?:booking|order)\s*id\s*[:#-]?\s*([a-z0-9-]{6,})/i);
  if (labeledMatch?.[1]) return String(labeledMatch[1]);

  const uuidMatch = String(userText || "").match(/[a-f0-9]{8}-[a-f0-9-]{27,}/i);
  return uuidMatch?.[0] ? String(uuidMatch[0]) : "";
}

function shouldBypassFaq(userText) {
  return /\b(app|mobile|website|web app|android|ios)\b/i.test(String(userText || ""));
}

async function fetchCartItemsForUser(userId) {
  if (!supabaseAdmin || !userId) return [];

  const { data: cartRows, error: cartError } = await supabaseAdmin
    .from("trip_cart_items")
    .select("id, item_type, reference_id, quantity, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (cartError || !Array.isArray(cartRows) || cartRows.length === 0) return [];

  const propertyIds = cartRows.filter((item) => item.item_type === "property").map((item) => String(item.reference_id));
  const tourIds = cartRows.filter((item) => item.item_type === "tour").map((item) => String(item.reference_id));
  const packageIds = cartRows.filter((item) => item.item_type === "tour_package").map((item) => String(item.reference_id));
  const transportIds = cartRows.filter((item) => item.item_type === "transport_vehicle").map((item) => String(item.reference_id));

  const [properties, tours, packages, vehicles] = await Promise.all([
    propertyIds.length
      ? supabaseAdmin.from("properties").select("id, title, location, currency, price_per_night").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
    tourIds.length
      ? supabaseAdmin.from("tours").select("id, title, currency, price_per_person").in("id", tourIds)
      : Promise.resolve({ data: [] }),
    packageIds.length
      ? supabaseAdmin.from("tour_packages").select("id, title, currency, price_per_adult").in("id", packageIds)
      : Promise.resolve({ data: [] }),
    transportIds.length
      ? supabaseAdmin.from("transport_vehicles").select("id, title, currency, price_per_day, location").in("id", transportIds)
      : Promise.resolve({ data: [] }),
  ]);

  const propertyMap = new Map((properties.data || []).map((item) => [String(item.id), item]));
  const tourMap = new Map((tours.data || []).map((item) => [String(item.id), item]));
  const packageMap = new Map((packages.data || []).map((item) => [String(item.id), item]));
  const vehicleMap = new Map((vehicles.data || []).map((item) => [String(item.id), item]));

  return cartRows.map((item) => {
    const referenceId = String(item.reference_id);
    const details = item.item_type === "property"
      ? propertyMap.get(referenceId)
      : item.item_type === "tour"
        ? tourMap.get(referenceId)
        : item.item_type === "tour_package"
          ? packageMap.get(referenceId)
          : vehicleMap.get(referenceId);

    const unitPrice = item.item_type === "property"
      ? Number(details?.price_per_night || 0)
      : item.item_type === "tour"
        ? Number(details?.price_per_person || 0)
        : item.item_type === "tour_package"
          ? Number(details?.price_per_adult || 0)
          : Number(details?.price_per_day || 0);

    return {
      id: String(item.id),
      item_type: String(item.item_type),
      reference_id: referenceId,
      quantity: Number(item.quantity || 1),
      title: String(details?.title || "Listing"),
      location: details?.location ? String(details.location) : undefined,
      currency: String(details?.currency || "RWF"),
      price: unitPrice,
    };
  });
}

async function fetchBookingsForUser(userId) {
  if (!supabaseAdmin || !userId) return [];

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("id, order_id, booking_type, property_id, tour_id, transport_id, check_in, check_out, guests, total_price, currency, status, payment_status, guest_name, guest_email, special_requests, created_at")
    .eq("guest_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error || !Array.isArray(bookings) || bookings.length === 0) return [];

  const propertyIds = bookings.map((item) => String(item.property_id || "")).filter(Boolean);
  const tourIds = bookings.map((item) => String(item.tour_id || "")).filter(Boolean);
  const transportIds = bookings.map((item) => String(item.transport_id || "")).filter(Boolean);

  const [properties, tours, vehicles] = await Promise.all([
    propertyIds.length
      ? supabaseAdmin.from("properties").select("id, title, location").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
    tourIds.length
      ? supabaseAdmin.from("tour_packages").select("id, title").in("id", tourIds)
      : Promise.resolve({ data: [] }),
    transportIds.length
      ? supabaseAdmin.from("transport_vehicles").select("id, title, location").in("id", transportIds)
      : Promise.resolve({ data: [] }),
  ]);

  const propertyMap = new Map((properties.data || []).map((item) => [String(item.id), item]));
  const tourMap = new Map((tours.data || []).map((item) => [String(item.id), item]));
  const vehicleMap = new Map((vehicles.data || []).map((item) => [String(item.id), item]));

  return bookings.map((item) => {
    const details = item.booking_type === "property"
      ? propertyMap.get(String(item.property_id || ""))
      : item.booking_type === "tour"
        ? tourMap.get(String(item.tour_id || ""))
        : vehicleMap.get(String(item.transport_id || ""));

    return {
      id: String(item.id),
      order_id: item.order_id ? String(item.order_id) : "",
      booking_type: String(item.booking_type || "booking"),
      title: String(details?.title || "Booking"),
      location: details?.location ? String(details.location) : undefined,
      check_in: item.check_in ? String(item.check_in) : undefined,
      check_out: item.check_out ? String(item.check_out) : undefined,
      guests: Number(item.guests || 1),
      total_price: Number(item.total_price || 0),
      currency: String(item.currency || "RWF"),
      status: String(item.status || "pending"),
      payment_status: String(item.payment_status || "pending"),
    };
  });
}

async function addItemToTripCart({ userId, itemType, referenceId, quantity = 1 }) {
  if (!supabaseAdmin || !userId || !referenceId || !itemType) {
    throw new Error("Missing cart action details");
  }

  const { data: existing } = await supabaseAdmin
    .from("trip_cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("reference_id", referenceId)
    .maybeSingle();

  if (existing?.id) {
    const nextQuantity = Number(existing.quantity || 0) + Math.max(1, Number(quantity || 1));
    await supabaseAdmin.from("trip_cart_items").update({ quantity: nextQuantity }).eq("id", existing.id);
    return { added: false, updated: true, quantity: nextQuantity };
  }

  await supabaseAdmin.from("trip_cart_items").insert({
    user_id: userId,
    item_type: itemType,
    reference_id: referenceId,
    quantity: Math.max(1, Number(quantity || 1)),
  });

  return { added: true, updated: false, quantity: Math.max(1, Number(quantity || 1)) };
}

async function createRefundSupportTicket({ authUser, referenceId, bookings }) {
  if (!supabaseAdmin || !authUser?.id || !referenceId || !Array.isArray(bookings) || bookings.length === 0) {
    throw new Error("Refund request is missing booking details");
  }

  const eligibleBookings = bookings.filter((booking) => {
    const bookingRef = String(booking.id || "").toLowerCase();
    const orderRef = String(booking.order_id || "").toLowerCase();
    return bookingRef === referenceId.toLowerCase() || (orderRef && orderRef === referenceId.toLowerCase());
  });

  if (eligibleBookings.length === 0) {
    throw new Error("No matching booking was found for that refund request");
  }

  const refundable = eligibleBookings.filter((booking) => booking.status === "cancelled" && booking.payment_status === "paid");
  if (refundable.length === 0) {
    throw new Error("Refunds can only be requested for cancelled paid bookings right now");
  }

  const subject = `Refund request for booking ${referenceId}`;
  const message = [
    "Guest requested a refund through AI assistant.",
    `Reference: ${referenceId}`,
    `User ID: ${authUser.id}`,
    `User Email: ${authUser.email || "unknown"}`,
    "",
    ...refundable.map((booking) => {
      const total = `${booking.currency || "RWF"} ${Math.round(Number(booking.total_price || 0)).toLocaleString()}`;
      return `- Booking ${booking.id}: ${booking.title} | ${booking.status} | ${booking.payment_status} | ${total}`;
    }),
  ].join("\n");

  const { error } = await supabaseAdmin.from("support_tickets").insert({
    user_id: authUser.id,
    category: "booking",
    subject,
    message,
    status: "open",
  });

  if (error) throw error;

  return { subject, count: refundable.length };
}

function formatCartReply(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Your trip cart is empty right now. I can help you find stays, tours, or transport and then add them to your cart.";
  }

  return [
    `You currently have ${items.length} item${items.length === 1 ? "" : "s"} in your trip cart:`,
    ...items.slice(0, 5).map((item, index) => {
      const price = item.price > 0 ? `${Math.round(item.price)} ${item.currency}` : "price on request";
      return `${index + 1}) ${item.title} | ${price}${item.location ? ` | ${item.location}` : ""}`;
    }),
    items.length > 5 ? `+${items.length - 5} more item(s)` : "",
  ].filter(Boolean).join("\n");
}

function formatBookingsReply(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) {
    return "You do not have any bookings yet. I can help you find stays, tours, transport, or guide you to checkout.";
  }

  return [
    `Here are your latest booking records:`,
    ...bookings.slice(0, 5).map((booking, index) => {
      const amount = `${Math.round(booking.total_price || 0)} ${booking.currency || "RWF"}`;
      return `${index + 1}) ${booking.title} | ${booking.status} | payment ${booking.payment_status} | ${amount}${booking.check_in ? ` | ${booking.check_in} to ${booking.check_out}` : ""}`;
    }),
    bookings.length > 5 ? `+${bookings.length - 5} more booking(s)` : "",
  ].filter(Boolean).join("\n");
}

async function resolveDirectAction({ body, userText, authUser }) {
  const explicitAction = compactText(body?.action, 40).toLowerCase();
  const text = String(userText || "");
  const bookingReference = extractReferenceId(userText, body);
  const refundActionIntent = explicitAction === "request_refund"
    || (ACTION_INTENT_TERMS.refund.test(text) && (/(my booking|my order|refund request|request refund|booking id|order id)/i.test(text) || Boolean(bookingReference)));
  const checkoutActionIntent = explicitAction === "go_to_checkout"
    || /(go to checkout|proceed to payment|pay now|open checkout)/i.test(text);

  if (explicitAction === "add_to_trip_cart") {
    if (!authUser?.id) {
      return {
        reply: "Please sign in first so I can add this item to your trip cart across your account.",
        recommendations: [],
        actions: [],
        source: "action",
        shouldCache: false,
      };
    }

    const result = await addItemToTripCart({
      userId: authUser.id,
      itemType: compactText(body?.itemType, 40) || "property",
      referenceId: compactText(body?.referenceId, 120),
      quantity: Number(body?.quantity || 1),
    });

    return {
      reply: result.added
        ? "Added to your trip cart. You can keep shopping or continue to checkout when you are ready."
        : "Your trip cart was updated with that item.",
      recommendations: [],
      actions: [
        makeUiAction({ type: "open_url", label: "Open Trip Cart", url: "/trip-cart", variant: "secondary" }),
        makeUiAction({ type: "open_url", label: "Go to Checkout", url: "/checkout?mode=cart", variant: "primary" }),
      ],
      source: "action",
      shouldCache: false,
    };
  }

  if (explicitAction === "get_trip_cart" || ACTION_INTENT_TERMS.cart.test(text)) {
    if (!authUser?.id) {
      return {
        reply: "Please sign in first and I can show your live trip cart, sync it across devices, and help you move items to checkout.",
        recommendations: [],
        actions: [],
        source: "action",
        shouldCache: false,
      };
    }

    const items = await fetchCartItemsForUser(authUser.id);
    return {
      reply: formatCartReply(items),
      recommendations: [],
      actions: items.length > 0
        ? [
            makeUiAction({ type: "open_url", label: "Open Trip Cart", url: "/trip-cart", variant: "secondary" }),
            makeUiAction({ type: "open_url", label: "Go to Checkout", url: "/checkout?mode=cart", variant: "primary" }),
          ]
        : [],
      source: "action",
      shouldCache: false,
    };
  }

  if (explicitAction === "get_bookings" || ACTION_INTENT_TERMS.bookings.test(text)) {
    if (!authUser?.id) {
      return {
        reply: "Please sign in first and I can show your bookings, payment status, and refund-related options.",
        recommendations: [],
        actions: [],
        source: "action",
        shouldCache: false,
      };
    }

    const bookings = await fetchBookingsForUser(authUser.id);
    const refundActions = bookings
      .filter((booking) => booking.status === "cancelled" && booking.payment_status === "paid")
      .slice(0, 2)
      .map((booking) => makeUiAction({
        type: "request_refund",
        label: `Request refund for ${booking.title}`,
        bookingId: booking.id,
        orderId: booking.order_id,
        variant: "secondary",
      }));

    return {
      reply: formatBookingsReply(bookings),
      recommendations: [],
      actions: refundActions,
      source: "action",
      shouldCache: false,
    };
  }

  if (refundActionIntent) {
    if (!authUser?.id) {
      return {
        reply: "Please sign in first so I can verify your booking and submit a refund request safely.",
        recommendations: [],
        actions: [],
        source: "action",
        shouldCache: false,
      };
    }

    const bookings = await fetchBookingsForUser(authUser.id);
    const referenceId = bookingReference;
    if (!referenceId) {
      return {
        reply: "Send me the booking ID or order ID for the cancelled paid booking, and I can file the refund request for you.",
        recommendations: [],
        actions: [],
        source: "action",
        shouldCache: false,
      };
    }

    const result = await createRefundSupportTicket({ authUser, referenceId, bookings });
    return {
      reply: `Refund request submitted. I opened a support ticket for reference ${referenceId}, and the team can now review ${result.count} eligible booking item${result.count === 1 ? "" : "s"}.`,
      recommendations: [],
      actions: [],
      source: "action",
      shouldCache: false,
    };
  }

  if (checkoutActionIntent) {
    if (!authUser?.id) return null;
    const items = await fetchCartItemsForUser(authUser.id);
    if (items.length === 0) return null;
    return {
      reply: "Your cart already has items, so the fastest next step is checkout.",
      recommendations: [],
      actions: [makeUiAction({ type: "open_url", label: "Go to Checkout", url: "/checkout?mode=cart", variant: "primary" })],
      source: "action",
      shouldCache: false,
    };
  }

  return null;
}

function getCacheKey(userText) {
  const normalized = normalizeText(userText);
  if (!normalized) return "";
  return `${AI_CACHE_VERSION}:${normalized}`.slice(0, 220);
}

function cleanupMap(map, isExpired) {
  for (const [key, value] of map.entries()) {
    if (isExpired(value)) {
      map.delete(key);
    }
  }
}

function getCachedReplyInMemory(userText) {
  const key = getCacheKey(userText);
  if (!key) return null;
  cleanupMap(responseCache, (entry) => !entry || entry.expiresAt <= Date.now());
  const cached = responseCache.get(key);
  return cached && cached.expiresAt > Date.now() ? cached.reply : null;
}

function setCachedReplyInMemory(userText, reply) {
  const key = getCacheKey(userText);
  if (!key || !reply) return;
  responseCache.set(key, {
    reply,
    expiresAt: Date.now() + AI_CACHE_TTL_MS,
  });
}

function findFaqReply(userText) {
  const normalized = normalizeText(userText);
  if (!normalized) return null;

  for (const rule of FAQ_RULES) {
    if (rule.keywords.every((keyword) => normalized.includes(normalizeText(keyword)))) {
      return rule.reply;
    }
  }

  return null;
}

function getClientIdentity(req, body) {
  const userId = compactText(body?.userId, 80);
  const sessionId = compactText(body?.sessionId, 80);
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  const ip = forwarded || req.socket?.remoteAddress || "anonymous";
  return userId || sessionId || ip;
}

function checkRateLimitInMemory(identity) {
  cleanupMap(rateBuckets, (entry) => !entry || entry.resetAt <= Date.now());

  const now = Date.now();
  const bucket = rateBuckets.get(identity);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(identity, { count: 1, resetAt: now + AI_RATE_WINDOW_MS });
    return { allowed: true, remaining: AI_RATE_MAX_REQUESTS - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= AI_RATE_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;
  rateBuckets.set(identity, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, AI_RATE_MAX_REQUESTS - bucket.count),
    retryAfterMs: 0,
  };
}

async function checkRateLimit(identity) {
  if (supabaseAdmin && identity) {
    const { data, error } = await supabaseAdmin.rpc("ai_consume_rate_limit", {
      p_identity_key: identity,
      p_max_requests: AI_RATE_MAX_REQUESTS,
      p_window_seconds: Math.max(60, Math.ceil(AI_RATE_WINDOW_MS / 1000)),
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row) {
      return {
        allowed: row.allowed === true,
        remaining: Number(row.remaining || 0),
        retryAfterMs: Math.max(0, Number(row.retry_after_seconds || 0) * 1000),
      };
    }
  }

  return checkRateLimitInMemory(identity);
}

async function getCachedReply(userText) {
  const key = getCacheKey(userText);
  if (!key) return null;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.rpc("ai_cache_get", {
      p_cache_key: key,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row?.reply) {
      setCachedReplyInMemory(userText, row.reply);
      return row.reply;
    }
  }

  return getCachedReplyInMemory(userText);
}

async function persistCachedReply(userText, reply) {
  const key = getCacheKey(userText);
  if (!key || !reply) return;

  if (supabaseAdmin) {
    await supabaseAdmin.rpc("ai_cache_set", {
      p_cache_key: key,
      p_reply: reply,
      p_source_model: OPENAI_MODEL,
      p_ttl_seconds: Math.max(60, Math.ceil(AI_CACHE_TTL_MS / 1000)),
    });
  }

  setCachedReplyInMemory(userText, reply);
}

function resolveChannel(body) {
  const value = compactText(body?.channel, 20).toLowerCase();
  return value === "mobile" ? "mobile" : value === "server" ? "server" : "web";
}

function resolveSessionId(body, identity) {
  return compactText(body?.sessionId, 120) || compactText(identity, 120) || `anon_${Date.now()}`;
}

function estimateOpenAiCostUsd(inputTokens = 0, outputTokens = 0) {
  const inputCost = (Number(inputTokens || 0) / 1_000_000) * 0.20;
  const outputCost = (Number(outputTokens || 0) / 1_000_000) * 1.25;
  return Number((inputCost + outputCost).toFixed(6));
}

async function touchConversation({ sessionId, userId, channel, source, model }) {
  if (!supabaseAdmin || !sessionId) return null;

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabaseAdmin
    .from("ai_conversations")
    .select("id, total_requests, total_openai_requests, total_cache_hits, total_faq_hits, total_rate_limited, total_errors")
    .eq("session_id", sessionId)
    .eq("channel", channel)
    .maybeSingle();

  const patch = {
    user_id: userId || null,
    last_source: source,
    last_model: model || null,
    last_interaction_at: nowIso,
    updated_at: nowIso,
  };

  if (existing?.id) {
    await supabaseAdmin.from("ai_conversations").update({
      ...patch,
      total_requests: Number(existing.total_requests || 0) + 1,
      total_openai_requests: Number(existing.total_openai_requests || 0) + (source === "openai" ? 1 : 0),
      total_cache_hits: Number(existing.total_cache_hits || 0) + (source === "cache" ? 1 : 0),
      total_faq_hits: Number(existing.total_faq_hits || 0) + (source === "faq" ? 1 : 0),
      total_rate_limited: Number(existing.total_rate_limited || 0) + (source === "rate_limit" ? 1 : 0),
      total_errors: Number(existing.total_errors || 0) + (source === "error" ? 1 : 0),
    }).eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted } = await supabaseAdmin
    .from("ai_conversations")
    .insert({
      session_id: sessionId,
      channel,
      created_at: nowIso,
      total_requests: 1,
      total_openai_requests: source === "openai" ? 1 : 0,
      total_cache_hits: source === "cache" ? 1 : 0,
      total_faq_hits: source === "faq" ? 1 : 0,
      total_rate_limited: source === "rate_limit" ? 1 : 0,
      total_errors: source === "error" ? 1 : 0,
      ...patch,
    })
    .select("id")
    .single();

  return inserted?.id || null;
}

async function recordAiUsage({
  sessionId,
  userId,
  channel,
  source,
  status = "ok",
  model = null,
  inputTokens = 0,
  outputTokens = 0,
  latencyMs = null,
  userMessage = "",
  normalizedKey = null,
  recommendationsCount = 0,
}) {
  if (!supabaseAdmin || !sessionId) return;

  const conversationId = await touchConversation({ sessionId, userId, channel, source, model });
  const safeInputTokens = Number(inputTokens || 0);
  const safeOutputTokens = Number(outputTokens || 0);

  await supabaseAdmin.from("ai_usage_events").insert({
    conversation_id: conversationId,
    session_id: sessionId,
    user_id: userId || null,
    channel,
    source,
    status,
    model,
    input_tokens: safeInputTokens,
    output_tokens: safeOutputTokens,
    total_tokens: safeInputTokens + safeOutputTokens,
    estimated_cost_usd: estimateOpenAiCostUsd(safeInputTokens, safeOutputTokens),
    latency_ms: latencyMs,
    user_message: compactText(userMessage, 500),
    normalized_key: normalizedKey,
    recommendations_count: Number(recommendationsCount || 0),
  });
}

function normalizeFeedbackType(feedbackType, rating) {
  const rawType = compactText(feedbackType, 10).toLowerCase();
  if (rawType === "up" || rawType === "down") return rawType;

  const safeRating = Number(rating || 0);
  if (Number.isFinite(safeRating) && safeRating > 0) {
    return safeRating >= 4 ? "up" : "down";
  }

  return "";
}

async function submitConversationRating({ sessionId, userId, channel, rating, feedbackType, comment }) {
  if (!supabaseAdmin || !sessionId) {
    throw new Error("Missing AI session");
  }

  const safeFeedbackType = normalizeFeedbackType(feedbackType, rating);
  if (!safeFeedbackType) {
    throw new Error("Feedback must be up or down");
  }

  const nowIso = new Date().toISOString();
  const { data: existing } = await supabaseAdmin
    .from("ai_conversations")
    .select("id")
    .eq("session_id", sessionId)
    .eq("channel", channel)
    .maybeSingle();

  if (existing?.id) {
    await supabaseAdmin.from("ai_conversations").update({
      user_id: userId || null,
      feedback_type: safeFeedbackType,
      rating_comment: compactText(comment, 500) || null,
      rated_at: nowIso,
      last_interaction_at: nowIso,
      updated_at: nowIso,
    }).eq("id", existing.id);
    return;
  }

  await supabaseAdmin.from("ai_conversations").insert({
    session_id: sessionId,
    user_id: userId || null,
    channel,
    feedback_type: safeFeedbackType,
    rating_comment: compactText(comment, 500) || null,
    rated_at: nowIso,
    last_interaction_at: nowIso,
    updated_at: nowIso,
  });
}

function formatRecommendationContext(recommendations) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return "";
  return recommendations
    .slice(0, 3)
    .map((item, index) => {
      const bits = [
        `${index + 1}. ${item.title}`,
        item.location,
        item.price > 0 ? `${item.currency || "RWF"} ${Math.round(item.price)}` : "",
        item.property_type,
      ].filter(Boolean);
      return bits.join(" | ");
    })
    .join("\n");
}

function formatKnowledgeContext(userText) {
  const snippets = getProductKnowledge(userText, 6);
  if (!Array.isArray(snippets) || snippets.length === 0) return "";
  return snippets
    .map((item) => `- ${item.content}`)
    .join("\n");
}

function buildNoOpenAiFallback(recommendations = []) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return "AI trip advisor is temporarily unavailable right now. Try asking about destination, timing, or budget and browse the matching stays, tours, or transport options below.";
  }

  const topMatches = recommendations
    .slice(0, 3)
    .map((item) => item.title)
    .filter(Boolean);

  if (topMatches.length === 0) {
    return "AI trip advisor is temporarily unavailable right now, but I found some matching listings below that may fit your trip.";
  }

  return `AI trip advisor is temporarily unavailable right now, but I found ${topMatches.join(", ")} in the results below.`;
}

function scoreListing(fields, terms) {
  const haystack = normalizeText(fields.join(" "));
  let score = 0;
  for (const t of terms) {
    if (haystack.includes(t)) score += 2;
  }
  if (score === 0) return 0;
  return score;
}

function capRecommendationsByType(items, total = 6, perType = 2) {
  const picked = [];
  const typeCounts = new Map();

  for (const item of items) {
    if (picked.length >= total) break;
    const itemType = String(item.item_type || "property");
    const currentCount = Number(typeCounts.get(itemType) || 0);
    if (currentCount >= perType) continue;
    picked.push(item);
    typeCounts.set(itemType, currentCount + 1);
  }

  if (picked.length >= total) return picked;

  for (const item of items) {
    if (picked.length >= total) break;
    if (picked.some((existing) => existing.item_type === item.item_type && existing.id === item.id)) continue;
    picked.push(item);
  }

  return picked;
}

function formatRecommendationType(itemType) {
  switch (String(itemType || "property")) {
    case "tour":
      return "Tour";
    case "tour_package":
      return "Tour package";
    case "transport_vehicle":
      return "Transport";
    default:
      return "Stay";
  }
}

function formatRecommendationSummary(recommendations = []) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return "";
  return recommendations
    .slice(0, 3)
    .map((item) => {
      const typeLabel = formatRecommendationType(item.item_type);
      const price = Number(item.price || 0) > 0 ? `${item.currency || "RWF"} ${Math.round(Number(item.price || 0))}` : "price on request";
      return `${item.title} (${typeLabel}${item.location ? `, ${item.location}` : ""}, ${price})`;
    })
    .join("; ");
}

function formatBrainContext(planner, docs = []) {
  const lines = [];
  if (planner?.intent) lines.push(`Predicted travel intent: ${planner.intent}`);

  const entities = planner?.extractedEntities || {};
  const entityParts = [
    Array.isArray(entities.countries) && entities.countries.length > 0 ? `countries=${entities.countries.join(", ")}` : "",
    Array.isArray(entities.destinations) && entities.destinations.length > 0 ? `destinations=${entities.destinations.join(", ")}` : "",
    Array.isArray(entities.activities) && entities.activities.length > 0 ? `activities=${entities.activities.join(", ")}` : "",
    entities.month ? `month=${entities.month}` : "",
    entities.duration ? `duration=${entities.duration}${entities.durationUnit === "weeks" ? " weeks" : " days"}` : "",
    entities.groupSize ? `groupSize=${entities.groupSize}` : "",
    entities.budget ? `budget=${entities.budget}` : "",
  ].filter(Boolean);

  if (entityParts.length > 0) {
    lines.push(`Extracted trip details: ${entityParts.join(" | ")}`);
  }

  if (planner?.reply) {
    lines.push(`Rule-based itinerary guidance:\n${cleanAssistantReply(planner.reply)}`);
  }

  if (Array.isArray(docs) && docs.length > 0) {
    lines.push(
      `Relevant documentation:\n${docs
        .map((doc) => `- ${doc.title}: ${compactText(doc.snippet, 260)}`)
        .join("\n")}`
    );
  }

  return lines.join("\n\n");
}

async function getPlannerInsights(messages) {
  const planner = answerTripAdvisorQuestion(Array.isArray(messages) ? messages : []);
  const docs = await searchTripAdvisorKnowledge(getLatestUserText(messages), { limit: 3, minScore: 0.18 });
  return { planner, docs };
}

function buildPlannerFallback({ planner, recommendations = [] }) {
  const plannerReply = cleanAssistantReply(planner?.reply || "");
  const recommendationSummary = formatRecommendationSummary(recommendations);
  const reply = [
    plannerReply || buildNoOpenAiFallback(recommendations),
    recommendationSummary ? `Booking-ready options I found now: ${recommendationSummary}.` : "",
  ].filter(Boolean).join("\n\n");

  return {
    reply,
    source: "brain",
    status: "ok",
    shouldCache: true,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

async function fetchRecommendations(userText) {
  if (!supabaseAdmin) return [];
  const terms = extractQueryTerms(userText);
  if (terms.length === 0) return [];
  const specificTerms = terms.filter((term) => !GENERIC_SEARCH_TERMS.has(term));
  const queryTerms = specificTerms.length > 0 ? specificTerms : terms;

  const [propertiesResult, toursResult, packagesResult, vehiclesResult] = await Promise.all([
    supabaseAdmin
      .from("properties")
      .select("id, title, location, currency, price_per_night, rating, review_count, property_type, images, is_published")
      .eq("is_published", true)
      .limit(80),
    supabaseAdmin
      .from("tours")
      .select("id, title, location, category, currency, price_per_person, rating, review_count, images, main_image, is_published")
      .eq("is_published", true)
      .limit(60),
    supabaseAdmin
      .from("tour_packages")
      .select("id, title, city, country, currency, price_per_adult, price_per_person, cover_image, gallery_images, status")
      .eq("status", "approved")
      .limit(60),
    supabaseAdmin
      .from("transport_vehicles")
      .select("id, title, location, provider_name, vehicle_type, currency, price_per_day, image_url, media, is_published")
      .eq("is_published", true)
      .limit(60),
  ]);

  const properties = Array.isArray(propertiesResult.data) ? propertiesResult.data : [];
  const tours = Array.isArray(toursResult.data) ? toursResult.data : [];
  const packages = Array.isArray(packagesResult.data) ? packagesResult.data : [];
  const vehicles = Array.isArray(vehiclesResult.data) ? vehiclesResult.data : [];

  const scored = [
    ...properties.map((item) => ({
      id: String(item.id),
      item_type: "property",
      title: String(item.title || "Untitled stay"),
      location: item.location ? String(item.location) : undefined,
      currency: item.currency ? String(item.currency) : "RWF",
      price: Number(item.price_per_night || 0),
      rating: Number(item.rating || 0),
      review_count: Number(item.review_count || 0),
      property_type: item.property_type ? String(item.property_type) : formatRecommendationType("property"),
      image_url: Array.isArray(item.images) && item.images[0] ? String(item.images[0]) : undefined,
      view_url: `/properties/${encodeURIComponent(String(item.id))}`,
      _score: scoreListing([item.title, item.location, item.property_type], queryTerms) + Number(item.rating || 0) * 0.2 + Math.min(Number(item.review_count || 0), 40) * 0.02,
    })),
    ...tours.map((item) => ({
      id: String(item.id),
      item_type: "tour",
      title: String(item.title || "Untitled tour"),
      location: item.location ? String(item.location) : undefined,
      currency: item.currency ? String(item.currency) : "RWF",
      price: Number(item.price_per_person || 0),
      rating: Number(item.rating || 0),
      review_count: Number(item.review_count || 0),
      property_type: formatRecommendationType("tour"),
      image_url: item.main_image ? String(item.main_image) : Array.isArray(item.images) && item.images[0] ? String(item.images[0]) : undefined,
      view_url: `/tours/${encodeURIComponent(String(item.id))}`,
      _score: scoreListing([item.title, item.location, item.category], queryTerms) + Number(item.rating || 0) * 0.2 + Math.min(Number(item.review_count || 0), 40) * 0.02,
    })),
    ...packages.map((item) => ({
      id: String(item.id),
      item_type: "tour_package",
      title: String(item.title || "Untitled package"),
      location: [item.city, item.country].filter(Boolean).join(", ") || undefined,
      currency: item.currency ? String(item.currency) : "RWF",
      price: Number(item.price_per_person || item.price_per_adult || 0),
      rating: 0,
      review_count: 0,
      property_type: formatRecommendationType("tour_package"),
      image_url: item.cover_image ? String(item.cover_image) : Array.isArray(item.gallery_images) && item.gallery_images[0] ? String(item.gallery_images[0]) : undefined,
      view_url: `/tours/${encodeURIComponent(String(item.id))}`,
      _score: scoreListing([item.title, item.city, item.country], queryTerms),
    })),
    ...vehicles.map((item) => ({
      id: String(item.id),
      item_type: "transport_vehicle",
      title: String(item.title || "Transport option"),
      location: item.location ? String(item.location) : undefined,
      currency: item.currency ? String(item.currency) : "RWF",
      price: Number(item.price_per_day || 0),
      rating: 0,
      review_count: 0,
      property_type: formatRecommendationType("transport_vehicle"),
      image_url: item.image_url ? String(item.image_url) : Array.isArray(item.media) && item.media[0] ? String(item.media[0]) : undefined,
      view_url: "/transport",
      _score: scoreListing([item.title, item.location, item.provider_name, item.vehicle_type], queryTerms),
    })),
  ]
    .filter((item) => item._score > 0)
    .sort((a, b) => b._score - a._score);

  return capRecommendationsByType(scored, 6, 2).map(({ _score, ...item }) => item);
}

async function generateReply(messages, recommendations = [], extraContext = "") {
  const plannerInsights = await getPlannerInsights(messages);

  if (!openai) {
    return buildPlannerFallback({ planner: plannerInsights.planner, recommendations });
  }

  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && typeof m === "object")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 260),
        }))
        .slice(-6)
    : [];

  const conversation = safeMessages
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n");
  const recommendationContext = formatRecommendationContext(recommendations);
  const knowledgeContext = formatKnowledgeContext(getLatestUserText(messages));
  const brainContext = formatBrainContext(plannerInsights.planner, plannerInsights.docs);
  const combinedContext = [
    knowledgeContext ? `Product knowledge:\n${knowledgeContext}` : "",
    brainContext ? `Travel-planning guidance:\n${brainContext}` : "",
    extraContext ? `Live product context:\n${extraContext}` : "",
    recommendationContext ? `Relevant listings:\n${recommendationContext}` : "",
  ].filter(Boolean).join("\n\n");

  const out = await openai.responses.create({
    model: OPENAI_MODEL,
    store: false,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are Merry, the Merry360X AI concierge and product operator for the Merry360X platform on web and mobile. Reply in plain text only. Do not use markdown, headings, tables, emojis, or decorative formatting. Use the provided product knowledge as source of truth for website and app capabilities. If live product context is provided, rely on it. Never claim an action completed unless the live product context explicitly says it succeeded. Treat prior conversation turns as active memory. Do not ask again for dates, airport, destination, group size, budget, or trip intent if the user already supplied them anywhere in the conversation. If some details are still missing, ask only the smallest next question set needed to move forward, usually 1 or 2 short questions, never more than 3. If the user already gave enough detail, stop interviewing and recommend the next booking-ready option immediately. If recommendations are available, use them. If the user asks about their cart, bookings, refunds, or support and live context is provided, answer directly from that context. If the user is ready to act, guide them to the next real product step such as trip cart or checkout. Keep the answer concise, commercially useful, and action-driven.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${conversation || "User: Help me find a trip in East Africa."}${combinedContext ? `\n\n${combinedContext}` : ""}`,
          },
        ],
      },
    ],
  });

  const text = cleanAssistantReply(typeof out.output_text === "string" ? out.output_text : "");
  if (!text) {
    return buildPlannerFallback({ planner: plannerInsights.planner, recommendations });
  }

  return {
    reply: text || "I can help with East Africa travel plans. What destination are you considering?",
    source: "openai",
    status: "ok",
    shouldCache: true,
    usage: {
      inputTokens: Number(out?.usage?.input_tokens || 0),
      outputTokens: Number(out?.usage?.output_tokens || 0),
      totalTokens: Number(out?.usage?.total_tokens || 0),
    },
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const authUser = await getAuthenticatedUser(req);
    const identity = getClientIdentity(req, body);
    const sessionId = resolveSessionId(body, identity);
    const userId = authUser?.id || compactText(body?.userId, 120) || null;
    const channel = resolveChannel(body);
    const action = compactText(body?.action, 40).toLowerCase();

    if (action === "rate_conversation") {
      await submitConversationRating({
        sessionId,
        userId,
        channel,
        rating: body?.rating,
        feedbackType: body?.feedbackType,
        comment: body?.comment,
      });
      return sendJson(res, 200, { ok: true, sessionId, channel });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = getLatestUserText(messages);
    const normalizedKey = getCacheKey(userText) || null;
    const limit = await checkRateLimit(identity);

    if (!limit.allowed) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: "rate_limit",
        status: "limited",
        userMessage: userText,
        normalizedKey,
      });
      return sendJson(res, 429, {
        error: "Rate limit exceeded",
        reply: "Too many AI requests right now. Please wait a minute and try again.",
        recommendations: [],
        retryAfterMs: limit.retryAfterMs,
        source: "rate_limit",
        sessionId,
      });
    }

    const directAction = await resolveDirectAction({ body, userText, authUser });
    if (directAction) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: directAction.source || "action",
        status: "ok",
        userMessage: userText,
        normalizedKey,
        recommendationsCount: Array.isArray(directAction.recommendations) ? directAction.recommendations.length : 0,
      });
      return sendJson(res, 200, {
        reply: directAction.reply,
        recommendations: directAction.recommendations || [],
        actions: directAction.actions || [],
        source: directAction.source || "action",
        sessionId,
      });
    }

    const recommendations = await fetchRecommendations(userText);
    const faqReply = shouldBypassFaq(userText) ? null : findFaqReply(userText);
    if (faqReply) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: "faq",
        userMessage: userText,
        normalizedKey,
        recommendationsCount: recommendations.length,
      });
      return sendJson(res, 200, { reply: faqReply, recommendations, cached: true, actions: [], source: "faq", sessionId });
    }

    const allowCache = !authUser?.id && !isActionRequest(userText, action) && messages.length <= 2;
    const cachedReply = allowCache ? await getCachedReply(userText) : null;
    if (cachedReply) {
      await recordAiUsage({
        sessionId,
        userId,
        channel,
        source: "cache",
        userMessage: userText,
        normalizedKey,
        recommendationsCount: recommendations.length,
      });
      return sendJson(res, 200, { reply: cachedReply, recommendations, cached: true, actions: [], source: "cache", sessionId });
    }

    const productContextLines = [];
    if (authUser?.id) {
      const [cartItems, bookings] = await Promise.all([
        fetchCartItemsForUser(authUser.id),
        fetchBookingsForUser(authUser.id),
      ]);

      if (cartItems.length > 0) {
        productContextLines.push(`Authenticated user cart summary:\n${formatCartReply(cartItems)}`);
      }
      if (bookings.length > 0) {
        productContextLines.push(`Authenticated user booking summary:\n${formatBookingsReply(bookings)}`);
      }
    }

    const startedAt = Date.now();
    const openAiResult = await generateReply(messages, recommendations, productContextLines.join("\n\n"));
    const latencyMs = Date.now() - startedAt;
    if (openAiResult.shouldCache && allowCache) {
      await persistCachedReply(userText, openAiResult.reply);
    }

    const uiActions = authUser?.id && recommendations.length > 0
      ? [makeUiAction({ type: "open_url", label: "Open Trip Cart", url: "/trip-cart", variant: "secondary" })]
      : [];

    await recordAiUsage({
      sessionId,
      userId,
      channel,
      source: openAiResult.source || "error",
      status: openAiResult.status || "failed",
      model: openAiResult.source === "openai" ? OPENAI_MODEL : null,
      inputTokens: openAiResult.usage.inputTokens,
      outputTokens: openAiResult.usage.outputTokens,
      latencyMs,
      userMessage: userText,
      normalizedKey,
      recommendationsCount: recommendations.length,
    });

    return sendJson(res, 200, {
      reply: openAiResult.reply,
      recommendations,
      actions: authUser?.id ? uiActions : [],
      source: openAiResult.source || "error",
      sessionId,
    });
  } catch (error) {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const identity = getClientIdentity(req, body);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = getLatestUserText(messages);
    await recordAiUsage({
      sessionId: resolveSessionId(body, identity),
      userId: compactText(body?.userId, 120) || null,
      channel: resolveChannel(body),
      source: "error",
      status: "failed",
      userMessage: userText,
      normalizedKey: getCacheKey(userText) || null,
    });
    return sendJson(res, 500, {
      error: "AI request failed",
      reply: "I am having trouble right now. Please try again in a moment.",
      recommendations: [],
      source: "error",
      details: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
    });
  }
}
