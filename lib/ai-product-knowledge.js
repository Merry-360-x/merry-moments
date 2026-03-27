const PRODUCT_KNOWLEDGE = [
  {
    id: "platform-overview",
    keywords: ["merry360x", "platform", "website", "app", "mobile"],
    content: "Merry360X is a travel marketplace on web and mobile for accommodations, tours, transport, airport transfers, stories, bookings, support, and host management.",
  },
  {
    id: "web-ai-support",
    keywords: ["ai", "trip advisor", "support", "chat", "website"],
    content: "The web app includes an AI Trip Advisor in the Support Center launcher, plus live support chat and WhatsApp support.",
  },
  {
    id: "mobile-ai-support",
    keywords: ["app", "mobile", "ai", "support"],
    content: "The Flutter mobile app includes an AI screen, trip cart, bookings, support tickets, notifications, and profile flows.",
  },
  {
    id: "trip-cart",
    keywords: ["trip cart", "cart", "save", "add", "remove"],
    content: "Users can add stays, tours, and transport items to Trip Cart on web and mobile. Signed-in carts sync through trip_cart_items, while guest carts are stored locally on web until login.",
  },
  {
    id: "checkout-booking",
    keywords: ["checkout", "book", "booking", "payment"],
    content: "Web checkout supports direct bookings and cart checkout. It can create checkout requests, create pending bookings for bank transfer, and start card or mobile money payment flows.",
  },
  {
    id: "booking-status",
    keywords: ["booking", "my bookings", "status", "order"],
    content: "Users can review bookings with status, payment status, dates, guests, totals, and booking type. Orders may group multiple booking rows under one checkout order id.",
  },
  {
    id: "refunds",
    keywords: ["refund", "cancel", "cancellation", "policy"],
    content: "Refund requests are handled against cancelled paid bookings. The web app creates support tickets for refund requests and uses booking, order, and cancellation-policy details to estimate refunds.",
  },
  {
    id: "support-tickets",
    keywords: ["support", "ticket", "help", "customer support"],
    content: "Support requests are stored in support_tickets and support messages. Users and staff can follow up on booking, payment, and refund issues.",
  },
  {
    id: "payments",
    keywords: ["card", "bank", "mobile money", "payment methods", "flutterwave", "pawapay"],
    content: "Checkout supports card payments, bank transfer, and mobile money flows. Payment methods vary by service and provider configuration.",
  },
  {
    id: "host-tools",
    keywords: ["host", "listing", "dashboard", "provider"],
    content: "Hosts can manage properties, tours, transport, pricing, cancellation policies, bookings, and payout methods from host dashboards on web and mobile.",
  },
  {
    id: "safety",
    keywords: ["safety", "emergency", "fraud", "verification"],
    content: "The platform provides safety guidance, host verification messaging, and emergency contact information, and advises users to keep payments and booking changes on-platform.",
  },
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProductKnowledge(userText, limit = 6) {
  const normalized = normalizeText(userText);
  if (!normalized) return PRODUCT_KNOWLEDGE.slice(0, limit);

  const scored = PRODUCT_KNOWLEDGE
    .map((item) => ({
      ...item,
      score: item.keywords.reduce((sum, keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        return sum + (normalized.includes(normalizedKeyword) ? 2 : 0);
      }, 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length >= limit) return scored.slice(0, limit);

  const selectedIds = new Set(scored.map((item) => item.id));
  const fallback = PRODUCT_KNOWLEDGE.filter((item) => !selectedIds.has(item.id)).slice(0, Math.max(0, limit - scored.length));
  return [...scored, ...fallback];
}
